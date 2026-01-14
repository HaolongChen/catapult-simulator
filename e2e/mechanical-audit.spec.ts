import { expect, test } from '@playwright/test'

test('mechanical audit recording', async ({ page }) => {
  await page.goto('/')

  page.on('console', (msg) => {
    if (msg.text().includes('[TRACE]')) {
      console.log(msg.text())
    }
  })

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  await page.screenshot({ path: 'audit-start.png' })

  const launchButton = page.getByRole('button', { name: 'READY TO LAUNCH' })
  await launchButton.click()

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200)
    await page.screenshot({ path: `audit-frame-${i}.png` })
  }

  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'audit-final.png' })
})
