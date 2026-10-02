import { expect, test } from '@playwright/test'
import { login } from './helpers'

// Runs in a phone-sized viewport (see the "mobile" project).
test.describe('responsive layout', () => {
  test('the sidebar becomes a drawer that opens from the header', async ({ page }) => {
    await login(page, 'supervisor')
    const nav = page.getByRole('navigation', { name: 'Main navigation' })
    await expect(nav).toBeHidden()

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(nav).toBeVisible()
    await nav.getByRole('link', { name: 'Farmers', exact: true }).click()
    await expect(page).toHaveURL(/\/farmers/)
    await expect(nav).toBeHidden()
  })

  test('the drawer closes with Escape', async ({ page }) => {
    await login(page, 'supervisor')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden()
  })

  test('tables turn into cards and nothing scrolls sideways', async ({ page }) => {
    await login(page, 'supervisor')
    await page.goto('/deliveries')
    await expect(page.getByRole('list', { name: 'Deliveries' })).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('forms stay usable on a phone', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/deliveries/new')
    await expect(page.getByLabel('Weight (kg)')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
