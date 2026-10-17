import { test, expect } from '@playwright/test'
import { boot, coins, firstRun, playFirstSession } from './helpers'

test('first run → Treasure Hunt chunk → fun game → celebration → Home shows progress → coins buy food', async ({ page }) => {
  await boot(page)
  await firstRun(page)
  await playFirstSession(page)

  await expect(page.getByLabel('1 of 5 practice days this week')).toBeVisible()
  await expect(page.getByText('You finished today')).toBeVisible()

  const earned = await coins(page)
  expect(earned).toBeGreaterThanOrEqual(5)
  await page.getByRole('link', { name: /Pet Shop/ }).click()
  await expect(page.getByRole('heading', { name: /Pet Shop/ })).toBeVisible()
  await page.getByRole('button', { name: 'Buy Apple for 5' }).click()
  await expect(page.getByLabel(`${earned - 5} paw coins`)).toBeVisible()
})
