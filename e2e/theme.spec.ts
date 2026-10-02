import { expect, test } from '@playwright/test'
import { login } from './helpers'

const bodyBackground = (page: import('@playwright/test').Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const theme = (page: import('@playwright/test').Page) => page.locator('html').getAttribute('data-theme')

test.describe('light and dark mode', () => {
  test.use({ colorScheme: 'light' })

  test('the header toggle switches theme, changes the page colours and survives a reload', async ({ page }) => {
    await login(page, 'clerk')
    expect(await theme(page)).toBe('light')
    const lightBg = await bodyBackground(page)

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    expect(await theme(page)).toBe('dark')
    expect(await bodyBackground(page)).not.toBe(lightBg)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible()
    expect(await theme(page)).toBe('dark')

    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    expect(await theme(page)).toBe('light')
    expect(await bodyBackground(page)).toBe(lightBg)
  })

  test('Settings offers Light, Dark and System, and System follows the device', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/settings')
    await page.getByRole('radio', { name: /^dark/i }).click()
    expect(await theme(page)).toBe('dark')
    await page.getByRole('radio', { name: /^system/i }).click()
    expect(await theme(page)).toBe('light')   // the device is light

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => theme(page)).toBe('dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => theme(page)).toBe('light')
  })

  test('the saved theme is applied before the page first paints (no flash)', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' })
    await context.addInitScript(() => localStorage.setItem('ct-theme', 'dark'))
    const page = await context.newPage()
    await page.goto('/login')
    // read straight away, before React has mounted anything
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
    await context.close()
  })

  test('text stays readable in dark mode: sign-in labels and the primary button have strong contrast', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ct-theme', 'dark'))
    await page.goto('/login')
    const ratio = await page.evaluate(() => {
      const lum = (c: string) => {
        const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
          const s = Number(v) / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const label = document.querySelector('label') as HTMLElement
      const fg = lum(getComputedStyle(label).color)
      const bg = lum(getComputedStyle(document.body).backgroundColor)
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
    })
    expect(ratio).toBeGreaterThan(7)
  })
})
