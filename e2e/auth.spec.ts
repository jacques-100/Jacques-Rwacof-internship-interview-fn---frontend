import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe('authentication', () => {
  test('unauthenticated visitors are sent to sign in, then back to where they were going', async ({ page }) => {
    await page.goto('/deliveries')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await page.getByLabel('Username').fill('supervisor')
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/deliveries$/)
    await expect(page.getByRole('heading', { name: 'Deliveries', exact: true })).toBeVisible()
  })

  test('wrong credentials show an error and keep you on the page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill('clerk')
    await page.getByLabel('Password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Invalid username or password.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('the session survives a page reload and ends on logout', async ({ page }) => {
    await login(page, 'supervisor')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.goto('/deliveries')
    await expect(page).toHaveURL(/\/login/)
  })

  test('a clerk sees a restricted sidebar and is refused admin pages', async ({ page }) => {
    await login(page, 'clerk')
    const nav = page.getByRole('navigation', { name: 'Main navigation' })
    for (const name of ['Dashboard', 'Deliveries', 'Farmers', 'Grading', 'Daily Intake', 'Prices & Grades', 'Settings']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
    }
    for (const name of ['Users & Staff', 'Stations', 'Reports', 'Audit Logs', 'Payments']) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0)
    }
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: /don't have access/i })).toBeVisible()
  })

  test('an administrator sees every area', async ({ page }) => {
    await login(page, 'admin')
    const nav = page.getByRole('navigation', { name: 'Main navigation' })
    for (const name of ['Payments', 'Reports', 'Audit Logs', 'Users & Staff', 'Stations']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
    }
  })
})

test.describe('dashboard', () => {
  test('shows live capacity, KPIs and recent deliveries from the backend', async ({ page }) => {
    await login(page, 'supervisor')
    await expect(page.getByRole('progressbar', { name: /daily intake capacity used/i })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Key figures' }).getByText("Today's deliveries", { exact: true })).toBeVisible()
    for (const label of ['Received', 'Graded', 'Paid', 'Rejected', 'Total amount paid']) {
      await expect(page.getByRole('region', { name: 'Key figures' }).getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: 'Recent deliveries' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Recent deliveries' }).getByRole('row')).not.toHaveCount(1)
  })
})

