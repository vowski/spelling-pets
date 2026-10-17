import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { boot, coins, firstRun, openParent, playFirstSession } from './helpers'

test('export → reset → import restores everything, including progress', async ({ page }) => {
  await boot(page)
  await firstRun(page, 'Amy')
  await playFirstSession(page)
  await expect(page.getByLabel('1 of 5 practice days this week')).toBeVisible()
  const earned = await coins(page)
  expect(earned).toBeGreaterThan(0)

  await openParent(page)
  await page.getByRole('link', { name: 'Data', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  const path = await download.path()
  expect(JSON.parse(readFileSync(path!, 'utf8')).app).toBe('spelling-pets')

  await page.getByLabel('Type RESET to confirm').fill('RESET')
  await page.getByRole('button', { name: 'Reset everything' }).click()
  await expect(page.getByText(/Welcome to Spelling Pets/)).toBeVisible()

  await firstRun(page, 'Temp')
  await expect(page.getByLabel('0 of 5 practice days this week')).toBeVisible()
  await openParent(page)
  await page.getByRole('link', { name: 'Data', exact: true }).click()
  await page.getByLabel('Backup file').setInputFiles(path!)
  await expect(page.getByText(/for Amy: \d+ Secure words, 1 sessions/)).toBeVisible()
  await page.getByRole('button', { name: 'Replace with this backup' }).click()
  await expect(page.getByText("Amy's Spelling Pets")).toBeVisible()
  await expect(page.getByLabel('1 of 5 practice days this week')).toBeVisible()
  await expect(page.getByText('You finished today')).toBeVisible()
  expect(await coins(page)).toBe(earned)
})
