import { expect, test } from '@playwright/test'

test.describe('Catapult Simulator Phase 3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should render the 3D scene and have no console errors', async ({
    page,
  }) => {
    const errors: Array<Error> = []
    page.on('pageerror', (exception) => errors.push(exception))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(new Error(msg.text()))
      }
    })

    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    await expect(page.getByText(/catapult command/i)).toBeVisible()

    const launchButton = page.getByRole('button', { name: /launch/i })
    await launchButton.click()

    await page.waitForTimeout(1000)

    expect(errors).toHaveLength(0)
  })

  test('should allow changing parameters in different tabs', async ({
    page,
  }) => {
    await expect(page.getByText(/catapult command/i)).toBeVisible()

    const projectileSliders = page.getByRole('slider')
    await expect(projectileSliders).toHaveCount(4)

    await page.getByRole('tab', { name: /machine/i }).click()
    const machineSliders = page.getByRole('slider')
    await expect(machineSliders).toHaveCount(4)

    const firstMachineSlider = machineSliders.first()
    const initialValue = await firstMachineSlider.getAttribute('aria-valuenow')

    await firstMachineSlider.focus()
    await page.keyboard.press('ArrowRight')

    const newValue = await firstMachineSlider.getAttribute('aria-valuenow')
    expect(newValue).not.toBe(initialValue)
  })
})
