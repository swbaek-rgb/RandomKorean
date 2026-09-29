import { chromium } from 'playwright'
const base = 'http://localhost:4173/'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
async function run(name, viewport, reduced = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'ko-KR' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `shots/${name}-1-start.png` })
  await page.getByRole('button', { name: '생년 정하기' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `shots/${name}-2-rolling.png` })
  await page.waitForTimeout(3200)
  await page.screenshot({ path: `shots/${name}-2-settled.png` })
  await page.getByRole('button', { name: /다음/ }).click()
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `shots/${name}-3-life.png`, fullPage: true })
  // 출처 모달
  await page.locator('.row .pill').first().click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shots/${name}-4-modal.png` })
  await page.keyboard.press('Escape')
  // 키보드 포커스 확인
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 20))
  console.log(name, 'focused after Tab:', focused)
  await ctx.close()
}
await run('desktop', { width: 1280, height: 860 })
await run('mobile', { width: 390, height: 844 })
await run('reduced', { width: 1280, height: 860 }, true)
await browser.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors')
