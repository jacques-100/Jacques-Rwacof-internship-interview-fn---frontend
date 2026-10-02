import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe('delivery form validation and capacity feedback', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/deliveries/new')
  })

  test('refuses invalid weights with clear messages', async ({ page }) => {
    await page.getByLabel('Weight (kg)').fill('0')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByText('Select a farmer', { exact: true })).toBeVisible()
    await expect(page.getByText('Weight must be greater than 0 kg')).toBeVisible()

    await page.getByLabel('Weight (kg)').fill('501')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByText(/cannot exceed 500 kg/i)).toBeVisible()
  })

  test('does not allow future dates', async ({ page }) => {
    const max = await page.getByLabel('Delivery date').getAttribute('max')
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    await page.getByLabel('Delivery date').fill('2999-01-01')
    await expect(page.getByText('Delivery date cannot be in the future')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record delivery' })).toBeDisabled()
  })

  test('previews the effect on the daily capacity while typing', async ({ page }) => {
    await page.getByLabel('Weight (kg)').fill('200')
    const panel = page.getByText('After this delivery').locator('..')
    await expect(panel).toContainText('kg')
    await expect(page.getByText('Current accepted')).toBeVisible()
    await expect(page.getByText('Remaining after')).toBeVisible()
  })
})

test.describe('daily intake page', () => {
  test('shows capacity figures and navigates between days', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/daily-intake')
    await expect(page.getByRole('progressbar', { name: /daily intake capacity used/i })).toBeVisible()
    for (const label of ['Total deliveries', 'Total accepted weight', 'Rejected weight', 'Average delivery weight']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled()
    await page.getByRole('button', { name: 'Previous day' }).click()
    await expect(page.getByRole('button', { name: 'Next day' })).toBeEnabled()
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/)
  })
})
