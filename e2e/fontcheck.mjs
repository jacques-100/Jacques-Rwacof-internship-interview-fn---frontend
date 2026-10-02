import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('requestfailed', (r) => console.log('FAILED', r.url()))
await page.goto('http://localhost:5173/login')
await page.waitForTimeout(1500)
const info = await page.evaluate(async () => {
  const h = document.querySelector('h1')
  await document.fonts.ready
  return {
    family: getComputedStyle(h).fontFamily,
    fontsLoaded: [...document.fonts].map((f) => `${f.family} ${f.status}`),
    check: document.fonts.check('600 28px "Fraunces Variable"'),
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()
