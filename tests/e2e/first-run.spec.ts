import { test, expect } from '@playwright/test'
import { boot, firstRun, nextDictated } from './helpers'

test('first run → Treasure Hunt chunk → fun game → celebration → Home shows progress', async ({ page }) => {
  await boot(page)
  await firstRun(page)
  await page.getByRole('button', { name: 'Start today’s adventure!' }).click()
  await page.getByRole('button', { name: "Let's go!" }).click()

  let seen = 0
  for (let i = 0; i < 12; i++) {
    const { word, count } = await nextDictated(page, seen)
    seen = count
    await page.getByLabel('Your spelling').fill(word)
    await page.getByLabel('Your spelling').press('Enter')
  }

  await page.getByRole('button', { name: "Let's go!" }).click()
  // Fun game on 2026-10-15 is Bubble Pop (odd day); with reduced motion the bubbles are static.
  for (let i = 0; i < 5; i++) {
    const { word, count } = await nextDictated(page, seen)
    seen = count
    for (const ch of word) await page.getByRole('button', { name: `bubble ${ch}` }).first().click()
  }

  await expect(page.getByText('Adventure complete! 🎉')).toBeVisible()
  await page.getByRole('button', { name: 'Back home' }).click()
  await expect(page.getByLabel('1 of 5 practice days this week')).toBeVisible()
  await expect(page.getByText('You finished today')).toBeVisible()
})
