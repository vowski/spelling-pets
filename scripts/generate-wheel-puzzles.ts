import { readFileSync, writeFileSync } from 'node:fs'
import wordlist from 'wordlist-english'
import { isBlockedBy } from '../src/content/blocking'
import { BUILTIN_BANK } from '../src/content/index'
import type { WheelPuzzle } from '../src/content/wheel'
import { hashString, makeRng, shuffle } from '../src/engine/rng'
import { layoutCrossword, validateLayout } from './crossword'

const here = (p: string) => new URL(p, import.meta.url)
const blocked = new Set(readFileSync(here('./blocklist.txt'), 'utf8').split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(s => s && !s.startsWith('#')))

const bankTexts = new Set([...BUILTIN_BANK.words.values()].map(w => w.text).filter(t => /^[a-z]{3,}$/.test(t)))
const dict = new Set<string>()
for (const k of ['english/10', 'english/20', 'english/british/10', 'english/british/20']) {
  for (const w of wordlist[k]) { const lw = w.toLowerCase(); if (/^[a-z]{3,}$/.test(lw) && !isBlockedBy(lw, blocked)) dict.add(lw) }
}
for (const t of bankTexts) if (!isBlockedBy(t, blocked)) dict.add(t)
const dictList = [...dict]

const counts = (w: string) => { const m = new Map<string, number>(); for (const ch of w) m.set(ch, (m.get(ch) ?? 0) + 1); return m }
const formable = (w: string, pool: Map<string, number>) => { const need = counts(w); for (const [ch, n] of need) if ((pool.get(ch) ?? 0) < n) return false; return true }

const anchors = [...BUILTIN_BANK.words.values()].filter(w =>
  /^[a-z]{4,8}$/.test(w.text) && w.sets.some(s => s !== 'school'))

const puzzles: WheelPuzzle[] = []
for (const a of anchors) {
  const pool = counts(a.text)
  const subs = dictList.filter(w => w !== a.text && w.length <= a.text.length && formable(w, pool))
  const ranked = subs.sort((x, y) => Number(bankTexts.has(y)) - Number(bankTexts.has(x)) || y.length - x.length || x.localeCompare(y))
  const layout = layoutCrossword(a.text, ranked, { maxSize: 10, maxWords: a.text.length <= 5 ? 4 : 6 })
  if (layout.placed.length < 3 || validateLayout(layout).length) continue
  const inGrid = new Set(layout.placed.map(p => p.word))
  const rng = makeRng(hashString(a.text))
  let letters = shuffle([...a.text], rng)
  if (letters.join('') === a.text) letters = [...letters.slice(1), letters[0]]
  puzzles.push({
    id: `wp-${a.id.slice(2)}`, anchorWordId: a.id, letters, rows: layout.rows, cols: layout.cols,
    grid: layout.placed, bonus: subs.filter(w => !inGrid.has(w)).sort().slice(0, 30),
  })
}

writeFileSync(here('../src/content/wheel-puzzles.json'), JSON.stringify(puzzles))
const review = ['# Word Wheel puzzle review', '', 'Skim for any word that is unsuitable for a 7-year-old. Add it to scripts/blocklist.txt and re-run `npm run content:wheel`.', '',
  '| Anchor | Grid words | Bonus words |', '|---|---|---|',
  ...puzzles.map(p => `| ${BUILTIN_BANK.words.get(p.anchorWordId)!.text} | ${p.grid.map(g => g.word).join(', ')} | ${p.bonus.join(', ')} |`)].join('\n')
writeFileSync(here('../docs/reference/wheel-review.md'), review + '\n')
console.log(`wheel puzzles: ${puzzles.length} (from ${anchors.length} anchors)`)
