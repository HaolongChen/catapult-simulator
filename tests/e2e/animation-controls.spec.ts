import { test, expect } from '@playwright/test'

test.describe('Trebuchet Animation Controls', () => {
  test('should render canvas and animation controls', async ({ page }) => {
    await page.goto('/')

    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    const controlsContainer = page.locator('.fixed').first()
    await expect(controlsContainer).toBeVisible()
  })

  test('should have play and pause functionality', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const playButton = page
      .locator('button')
      .filter({ hasText: /Play|Pause/ })
      .first()
    await expect(playButton).toBeVisible()

    const initialText = await playButton.textContent()

    await playButton.click()
    await page.waitForTimeout(500)

    const clickedText = await playButton.textContent()
    expect(clickedText).not.toBe(initialText)
  })

  test('should have scrubber for frame navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const scrubber = page.locator('input[type="range"]')
    await expect(scrubber).toBeVisible()

    const maxValue = await scrubber.getAttribute('max')
    expect(maxValue).toBeTruthy()
  })

  test('should reset animation when reset button clicked', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const frameDisplay = page.locator('span').filter({ hasText: /Frame \d+/ })
    const resetButton = page
      .locator('button')
      .filter({ hasText: /Reset/ })
      .first()

    await resetButton.click()
    await page.waitForTimeout(500)

    const resetFrame = await frameDisplay.textContent()
    expect(resetFrame).toContain('Frame 0')
  })
})

test.describe('Trebuchet Visualization', () => {
  test('should display debug overlay with telemetry', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const timeDisplay = page
      .locator('span')
      .filter({ hasText: /Time:/ })
      .first()
    const phaseDisplay = page
      .locator('span')
      .filter({ hasText: /(Swinging|Released|Ground Dragging)/ })
      .first()

    await expect(timeDisplay).toBeVisible()
    await expect(phaseDisplay).toBeVisible()
  })

  test('should display physics telemetry', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    const velocityDisplay = page
      .locator('span')
      .filter({ hasText: /Velocity:/ })
      .first()
    const armAngleDisplay = page
      .locator('span')
      .filter({ hasText: /Arm:/ })
      .first()

    await expect(velocityDisplay).toBeVisible()
    await expect(armAngleDisplay).toBeVisible()
  })
})
