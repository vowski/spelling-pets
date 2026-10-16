import { test, expect } from '@playwright/test'
import { boot, firstRun, openParent, nextDictated } from './helpers'

test('a school list with a test tomorrow becomes a practice test', async ({ page }) => {
  await boot(page)
  await firstRun(page)
  // Skip the Treasure Hunt: mark every placement level as done.
  await page.evaluate(async () => {
    const repo = window.__SPELLING_REPO__!
    await repo.savePlacement(['y1cew', 'days', 'hfw', 'y2cew', 'y34'].map(level => ({ level: level as 'y1cew', sampledIds: [], answers: {}, status: 'done' as const, placed: true })))
  })
  await openParent(page)
  await page.getByRole('link', { name: 'School Words' }).click()
  await page.getByLabel("Paste or type this week's words").fill('1. because\n2. friend')
  await page.getByLabel('Test date').fill('2026-10-16')
  await page.getByRole('button', { name: 'Check words' }).click()
  await page.getByRole('button', { name: 'Save list' }).click()
  await expect(page.getByText('because · New')).toBeVisible()
  await page.getByRole('button', { name: 'Back to child mode' }).click()

  await page.getByRole('button', { name: 'Start today’s adventure!' }).click()
  await page.getByRole('button', { name: "Let's go!" }).click()
  await expect(page.getByRole('heading', { name: /Practice test for tomorrow!/ })).toBeVisible()
  const { word } = await nextDictated(page, 0)
  expect(['because', 'friend']).toContain(word)
})
