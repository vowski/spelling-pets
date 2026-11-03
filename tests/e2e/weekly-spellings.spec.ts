import { test, expect } from '@playwright/test'
import { boot, firstRun, openParent, nextDictated, spoken } from './helpers'

// Weekly spellings (2026-11-03): a term of lists pasted by a grown-up, then a practice that repeats missed words.
test("a pasted term's list can be practised until every word is right", async ({ page }) => {
  await boot(page)
  await firstRun(page)
  await openParent(page)
  await page.getByRole('link', { name: 'School Words' }).click()
  await page.getByLabel('Paste a whole term of lists').fill('Class spellings\n19/10/26: because, friend\n26/10/26: said, was')
  await page.getByRole('button', { name: 'Check lists' }).click()
  await page.getByRole('button', { name: 'Save all 2 lists' }).click()
  await expect(page.getByRole('heading', { name: /Class spellings: test on Monday 19 October/ })).toBeVisible()
  await page.getByRole('button', { name: 'Back to child mode' }).click()

  await page.getByRole('button', { name: "📝 This week's spellings" }).click()
  let seen = (await spoken(page)).length
  await page.getByRole('button', { name: 'Practise Class spellings' }).click()
  // Go 1: miss the first word, get the second right.
  const first = await nextDictated(page, seen)
  await page.getByLabel('Your spelling').fill('zzz')
  await page.getByLabel('Your spelling').press('Enter')
  const second = await nextDictated(page, first.count)
  await page.getByLabel('Your spelling').fill(second.word)
  await page.getByLabel('Your spelling').press('Enter')
  await expect(page.getByRole('heading', { name: 'You spelt 1 out of 2 right!' })).toBeVisible()
  await expect(page.getByText(`The right way: ${first.word}`)).toBeVisible()
  // Go 2: only the missed word.
  seen = (await spoken(page)).length
  await page.getByRole('button', { name: 'Try the 1 you missed' }).click()
  const again = await nextDictated(page, seen)
  expect(again.word).toBe(first.word)
  await page.getByLabel('Your spelling').fill(again.word)
  await page.getByLabel('Your spelling').press('Enter')
  await expect(page.getByText('All 2 spelt right! 🎉 It took you 2 goes.')).toBeVisible()
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByText('Best this week: 2 goes')).toBeVisible()
})
