import { expect, test } from '@playwright/test'

test('record simulation launch', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.text().includes('[TRACE]')) {
      console.log(msg.text())
    }
  })

  await page.goto('/')

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  await page.waitForTimeout(2000)

  const launchButton = page.getByRole('button', { name: 'READY TO LAUNCH' })
  await launchButton.click()

  await page.waitForTimeout(8000)

  await page.screenshot({ path: 'e2e/recordings/launch-final-frame.png' })
})
