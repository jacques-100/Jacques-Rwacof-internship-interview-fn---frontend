import { expect, test, type Page } from '@playwright/test'
import { daysAgo, login, uniqueCoop, uniquePhone } from './helpers'

const DAY = daysAgo(45) // an untouched historic day: plenty of capacity, no clash with seeded data

async function registerFarmer(page: Page, name: string, coop: string) {
  await page.goto('/farmers')
  await page.getByRole('button', { name: 'Register farmer' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill(name)
  await dialog.getByLabel('Phone number').fill(uniquePhone())
  await dialog.getByLabel('Cooperative membership number').fill(coop.toLowerCase())
  await dialog.getByRole('button', { name: 'Register farmer' }).click()
  await expect(page.getByText(`${name} registered (${coop})`)).toBeVisible()
}

async function recordDelivery(page: Page, farmerName: string, weight: string): Promise<string> {
  await page.goto('/deliveries/new')
  await page.getByRole('combobox', { name: /farmer/i }).fill(farmerName)
  await page.getByRole('option', { name: new RegExp(farmerName) }).getByRole('button').click()
  await page.getByLabel('Delivery date').fill(DAY)
  await page.getByLabel('Weight (kg)').fill(weight)
  await page.getByRole('button', { name: 'Record delivery' }).click()
  await expect(page.getByRole('heading', { name: /^Delivery DLV-/ })).toBeVisible()
  const heading = await page.getByRole('heading', { name: /^Delivery DLV-/ }).textContent()
  return heading!.replace('Delivery ', '').trim()
}

test.describe('farmer to payment workflow (supervisor)', () => {
  test('register a farmer, receive, correct, grade and pay a delivery with a full audit trail', async ({ page }) => {
    const name = `E2E Farmer ${Date.now().toString(36)}`
    const coop = uniqueCoop()
    await login(page, 'supervisor')
    await registerFarmer(page, name, coop)

    // the new farmer shows up in the list and has a detail page
    await page.getByLabel('Search').fill(coop)
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Delivery totals' })).toContainText('Total deliveries0')

    // receive a delivery: no grade/amount fields are offered
    await page.goto('/deliveries/new')
    await expect(page.getByLabel(/^grade/i)).toHaveCount(0)
    await expect(page.getByLabel(/amount/i)).toHaveCount(0)
    const reference = await recordDelivery(page, name, '120.5')
    await expect(page.getByText('Received', { exact: true }).first()).toBeVisible()

    // correct the weight (with reason + confirmation)
    await page.getByRole('button', { name: /correct weight/i }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('New weight (kg)').fill('150')
    await dialog.getByLabel('Reason').fill('Scale correction after verification')
    await dialog.getByRole('button', { name: 'Review change' }).click()
    await expect(dialog.getByText('Confirm weight correction')).toBeVisible()
    await dialog.getByRole('button', { name: 'Confirm correction' }).click()
    await expect(page.getByText('150 kg').first()).toBeVisible()

    // grade A: 150 kg x 1,200 = 180,000, calculated by the server
    await page.getByRole('button', { name: /^grade dlv/i }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByText('Grade A', { exact: true }).click()
    await expect(dialog.getByText('RWF 180,000')).toBeVisible()
    await dialog.getByRole('button', { name: 'Grade A' }).click()
    await expect(page.getByText('Graded', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('RWF 180,000').first()).toBeVisible()

    // weight can no longer be corrected once graded
    await expect(page.getByRole('button', { name: /correct weight/i })).toHaveCount(0)

    // pay (explicit confirmation required)
    await page.getByRole('button', { name: /as paid/i }).click()
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Mark as paid' }).click()
    await expect(page.getByText('This delivery has been paid and can no longer be changed.')).toBeVisible()
    await expect(page.getByRole('button', { name: /grade dlv|reject dlv|as paid|correct weight/i })).toHaveCount(0)

    // the audit history shows every step, in order
    const history = page.getByRole('list').filter({ hasText: 'Delivery created' })
    await expect(history.getByRole('listitem')).toHaveCount(4)
    await expect(history).toContainText('Delivery created - 120.5 kg')
    await expect(history).toContainText('Weight corrected 120.5 → 150 kg')
    await expect(history).toContainText('Delivery graded - Grade A')
    await expect(history).toContainText('Marked as paid - 180000 RWF')

    // the audit log page lists the actions and links to the delivery
    await page.goto(`/audit-logs?entityType=DELIVERY`)
    await expect(page.getByRole('table', { name: 'Audit log' })).toContainText('DELIVERY_PAID')
    expect(reference).toMatch(/^DLV-[A-Z0-9]{2,10}-\d{8}-\d{5}$/)
  })

  test('reject a delivery: reason and irreversible confirmation are required, then it is final', async ({ page }) => {
    const name = `E2E Reject ${Date.now().toString(36)}`
    await login(page, 'supervisor')
    await registerFarmer(page, name, uniqueCoop('REJ'))
    await recordDelivery(page, name, '80')

    await page.getByRole('button', { name: /reject dlv/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText(/give a reason/i)).toBeVisible()
    await dialog.getByLabel('Rejection reason').fill('Unripe cherries')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('This action cannot be reversed.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Reject delivery' }).click()

    await expect(page.getByText('This delivery was rejected and can no longer be changed.')).toBeVisible()
    await expect(page.getByRole('button', { name: /grade dlv|reject dlv|as paid|correct weight/i })).toHaveCount(0)
  })
})

test.describe('clerk permissions', () => {
  test('a clerk can grade but is never offered payment', async ({ page }) => {
    const supervisorName = `E2E Clerk ${Date.now().toString(36)}`
    await login(page, 'clerk')
    await registerFarmer(page, supervisorName, uniqueCoop('CLK'))
    await recordDelivery(page, supervisorName, '60')
    await page.getByRole('button', { name: /^grade dlv/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Grade B').click()
    await dialog.getByRole('button', { name: 'Grade B' }).click()
    await expect(page.getByText('Graded', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /as paid/i })).toHaveCount(0)
  })
})

