import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { boot, firstRun, openParent } from './helpers'

test('export → reset → import restores everything', async ({ page }) => {
  await boot(page)
  await firstRun(page, 'Amy')
  await openParent(page)
  await page.getByRole('link', { name: 'Data', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  const path = await download.path()
  expect(JSON.parse(readFileSync(path!, 'utf8')).app).toBe('spelling-pets')

  await page.getByLabel('Type RESET to confirm').fill('RESET')
  await page.getByRole('button', { name: 'Reset everything' }).click()
  await expect(page.getByText(/Welcome to Spelling Pets/)).toBeVisible()

  await firstRun(page, 'Temp')
  await openParent(page)
  await page.getByRole('link', { name: 'Data', exact: true }).click()
  await page.getByLabel('Backup file').setInputFiles(path!)
  await expect(page.getByText(/for Amy/)).toBeVisible()
  await page.getByRole('button', { name: 'Replace with this backup' }).click()
  await expect(page.getByText("Amy's Spelling Pets")).toBeVisible()
})
