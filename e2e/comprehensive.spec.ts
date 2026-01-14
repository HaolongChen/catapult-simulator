import { expect, test } from '@playwright/test'

test.describe('Comprehensive E2E Evaluation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should perform a full simulation cycle', async ({ page }) => {
    // 1. Initial State
    const launchButton = page.getByRole('button', { name: /ready to launch/i })
    await expect(launchButton).toBeVisible()

    // 2. Start Simulation
    await launchButton.click({ force: true })
    await page.waitForTimeout(500)

    // 3. Verify it is running
    await expect(
      page.getByRole('button', { name: /ready to launch/i }),
    ).not.toBeVisible()

    // 4. Run for some time
    await page.waitForTimeout(1000)

    // 5. Reset using the icon button
    const resetButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-rotate-ccw') })
      .first()
    await resetButton.click()

    // 6. Verify back to initial
    await expect(
      page.getByRole('button', { name: /ready to launch/i }),
    ).toBeVisible()
  })

  test('should update parameters and reflect in state', async ({ page }) => {
    await page.getByRole('tab', { name: /machine/i }).click()

    const longArmSlider = page.getByRole('slider').nth(1) // Long Arm
    const initialValue = await longArmSlider.getAttribute('aria-valuenow')

    await longArmSlider.focus()
    await page.keyboard.press('ArrowRight')

    const newValue = await longArmSlider.getAttribute('aria-valuenow')
    expect(Number(newValue)).toBeGreaterThan(Number(initialValue))
  })

  test('should handle rapid tab switching without crashing', async ({
    page,
  }) => {
    for (let i = 0; i < 10; i++) {
      await page.getByRole('tab', { name: /projectile/i }).click()
      await page.getByRole('tab', { name: /machine/i }).click()
      await page.getByRole('tab', { name: /world/i }).click()
    }
    await expect(page.getByText(/catapult command/i)).toBeVisible()
  })
})
