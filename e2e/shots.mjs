import { chromium } from '@playwright/test'

const out = process.env.SHOT_DIR
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/login')
await page.screenshot({ path: `${out}/1-login.png` })
await page.getByLabel('Username').fill('supervisor')
await page.getByLabel('Password').fill(process.env.E2E_PASSWORD)
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: 'Dashboard' }).waitFor()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/2-dashboard.png`, fullPage: true })
await page.goto('http://localhost:5173/deliveries')
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/3-deliveries.png` })
await browser.close()
