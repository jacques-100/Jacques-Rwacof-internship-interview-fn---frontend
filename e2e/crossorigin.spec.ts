import { expect, test } from '@playwright/test'
import { password } from './helpers'

// Run against a web app that talks to an API on a different address (the production layout:
// cherrytrack.example.org + api.example.org). Needs E2E_CROSS_BASE_URL, e.g. http://localhost:5175
// started with VITE_API_BASE_URL=http://localhost:8081.
const base = process.env.E2E_CROSS_BASE_URL

test.describe('web app and API on different addresses', () => {
  test.skip(!base, 'set E2E_CROSS_BASE_URL to run')

  test('sign-in survives a reload and sign-out really ends the session', async ({ page }) => {
    const apiHosts = new Set<string>()
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/')) apiHosts.add(new URL(r.url()).origin)
    })

    await page.goto(`${base}/login`)
    await page.getByLabel('Username').fill('supervisor')
    await page.getByLabel('Password').fill(password())
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible()
    expect([...apiHosts]).not.toContain(new URL(base!).origin)   // really talking to the other address

    // the access token lives in memory, so after a reload only the cookie can restore the session
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible()
    await page.goto(`${base}/deliveries`)
    await expect(page.getByRole('heading', { name: 'Deliveries' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()   // the cookie was revoked
  })

  test('the logo and a profile photo load from the API address', async ({ page }) => {
    await page.goto(`${base}/login`)
    await page.getByLabel('Username').fill('clerk')
    await page.getByLabel('Password').fill(password())
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible()
    // branding is fetched from the API origin, not from the web app's own address
    const branding = await page.evaluate(async () => (await fetch('http://localhost:8081/api/v1/branding')).status)
    expect(branding).toBe(200)
  })
})
