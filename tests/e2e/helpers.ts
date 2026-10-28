import { expect, type Page } from '@playwright/test'

export async function boot(page: Page) {
  await page.addInitScript(() => {
    window.__SPELLING_TEST__ = { now: '2026-10-15T16:00:00', speechLog: [], fast: true }
  })
  await page.goto('/')
}

export const spoken = (page: Page) => page.evaluate(() => window.__SPELLING_TEST__!.speechLog!.slice())

/** Waits for a new word to be spoken (word, sentence, word) and returns it. */
export async function nextDictated(page: Page, seen: number): Promise<{ word: string; count: number }> {
  await expect.poll(async () => (await spoken(page)).length, { timeout: 10_000 }).toBeGreaterThan(seen)
  await page.waitForTimeout(100)
  const log = await spoken(page)
  return { word: log[log.length - 1], count: log.length }
}

export async function firstRun(page: Page, name = 'Amy', pin = '1234') {
  await page.getByLabel("Child's first name (optional)").fill(name)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New PIN').fill(pin)
  await page.getByLabel('Type the PIN again').fill(pin)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Puppy egg' }).click()
  await page.getByLabel("Your pet's name").fill('Biscuit')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await expect(page.getByText(`${name}'s Spelling Pets`)).toBeVisible()
}

/** From Home after first run: the Treasure Hunt chunk, then the fun game, to the celebration and back Home. */
export async function playFirstSession(page: Page) {
  await page.getByRole('button', { name: 'Start today’s adventure!' }).click()
  await page.getByRole('button', { name: "Let's go!" }).click()

  let seen = 0
  for (let i = 0; i < 12; i++) {
    const { word, count } = await nextDictated(page, seen)
    seen = count
    await page.getByLabel('Your spelling').fill(word)
    await page.getByLabel('Your spelling').press('Enter')
  }

  // Her answers next to the right spellings, then on with the adventure.
  await expect(page.getByRole('heading', { name: 'Your Treasure Hunt answers' })).toBeVisible()
  await expect(page.getByText('Here are the words you wrote, next to the right spellings.')).toBeVisible()
  await page.getByRole('button', { name: 'Carry on' }).click()
  await page.getByRole('button', { name: "Let's go!" }).click()
  // Fun game on 2026-10-15 is Bubble Pop (odd day); with reduced motion the bubbles are static.
  for (let i = 0; i < 5; i++) {
    const { word, count } = await nextDictated(page, seen)
    seen = count
    for (const ch of word) await page.getByRole('button', { name: `bubble ${ch}` }).first().click()
  }

  await expect(page.getByText('Adventure complete! 🎉')).toBeVisible()
  await page.getByRole('button', { name: 'Back home' }).click()
}

/** The paw-coin balance shown on Home or in the shop. */
export async function coins(page: Page): Promise<number> {
  const label = await page.getByLabel(/^\d+ paw coins$/).getAttribute('aria-label')
  return Number(label!.split(' ')[0])
}

export async function openParent(page: Page, pin = '1234') {
  await page.getByRole('link', { name: 'Grown-ups' }).click()
  await page.getByLabel('Grown-up PIN').fill(pin)
  await page.getByRole('button', { name: 'Open dashboard' }).click()
  await expect(page.getByText("Grown-ups' dashboard")).toBeVisible()
}
