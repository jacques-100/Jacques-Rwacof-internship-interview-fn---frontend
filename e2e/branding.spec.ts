import { expect, test } from '@playwright/test'
import { login } from './helpers'

// A real 1x1 PNG, enough for the server to accept as an image.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('company logo and profile photo', () => {
  test('an administrator uploads a logo that shows in the sidebar and sign-in page, and survives a reload', async ({ page }) => {
    // The database may already hold the organisation's real logo: remember it and put it back afterwards.
    const existing = await page.request.get('/api/v1/branding/logo')
    const original = existing.ok() ? { buffer: await existing.body(), mimeType: existing.headers()['content-type'] } : null

    await login(page, 'admin')
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /(upload|replace) logo/i })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Company logo updated.').first()).toBeVisible()
    const sidebarLogo = page.getByRole('complementary').locator('img[src*="/api/v1/branding/logo"]')
    await expect(sidebarLogo).toBeVisible()
    await expect.poll(() => sidebarLogo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

    // the browser-tab icon follows the logo
    await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', /\/api\/v1\/branding\/logo\?v=\d+/)

    await page.reload()
    await expect(page.getByRole('complementary').locator('img[src*="/api/v1/branding/logo"]')).toBeVisible()

    // the sign-in page shows it too, before anyone has signed in
    const anonymous = await page.context().browser()!.newPage({ baseURL: 'http://localhost:5173' })
    await anonymous.goto('/login')
    await expect(anonymous.locator('img[src*="/api/v1/branding/logo"]').first()).toBeVisible()
    await anonymous.close()

    // leave things as we found them
    if (original) {
      await page.locator('input[type="file"]').setInputFiles({ name: 'original', mimeType: original.mimeType, buffer: original.buffer })
      await expect(page.getByText('Company logo updated.').first()).toBeVisible()
    } else {
      await page.getByRole('button', { name: /remove logo/i }).click()
      await expect(page.getByText('Company logo removed.')).toBeVisible()
      await expect(page.getByText('No logo yet')).toBeVisible()
      await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', '/favicon.svg')
    }
  })

  test('a clerk cannot change the logo', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /(upload|replace) logo/i })).toBeDisabled()
  })

  test('a user adds a profile photo that shows in the header and survives a reload, then removes it', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/profile')
    await page.locator('input[type="file"]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Your photo was updated.')).toBeVisible()
    const headerPhoto = page.getByRole('banner').locator('img')
    await expect(headerPhoto).toBeVisible()

    await page.reload()
    await expect(page.getByRole('banner').locator('img')).toBeVisible()

    await page.getByRole('button', { name: /remove photo/i }).click()
    await expect(page.getByText('Your photo was removed.')).toBeVisible()
    await expect(page.getByRole('banner').locator('img')).toHaveCount(0)
  })

  test('an unsupported file is refused with a clear message', async ({ page }) => {
    await login(page, 'admin')
    await page.goto('/settings')
    await page.locator('input[type="file"]').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') })
    await expect(page.getByText('Use a PNG, JPEG or WebP image.')).toBeVisible()
  })
})
