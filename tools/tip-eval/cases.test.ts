import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../../src/content'
import { CONTRACTIONS } from '../../src/content/tipContent'
import { classifyMistake, type Mistake, type MistakeType } from '../../src/engine/tips/classify'
import { EVAL_CASES, WORDING_FAMILIES, wordingFamilies } from './cases'

const TYPES: MistakeType[] = ['capital', 'homophone', 'apostrophe', 'doubling', 'dropE', 'yToI', 'ending', 'tricky']

/** One realistic mistake of every kind the word bank allows. */
function everyMistake(): Mistake[] {
  const out: (Mistake | null)[] = []
  const byText = new Map([...bank.words.values()].map(w => [w.text, w]))
  for (const u of bank.units) {
    if (u.game.kind !== 'builder') continue
    for (const { parts, word } of u.game.pairs) if (parts.length === 2 && byText.get(word)) out.push(classifyMistake(byText.get(word)!, parts.join(''), bank))
  }
  for (const word of bank.words.values()) {
    for (const other of word.homophoneGroup?.split('/') ?? []) out.push(classifyMistake(word, other, bank))
    if (CONTRACTIONS[word.text.toLowerCase()]) out.push(classifyMistake(word, word.text.replace(/'/g, ''), bank))
    if (word.caseSensitive) out.push(classifyMistake(word, word.text.toLowerCase(), bank))
    for (const [a, b] of word.tricky) out.push(classifyMistake(word, word.text.slice(0, a) + [...word.text.slice(a, b)].reverse().join('') + word.text.slice(b), bank))
    for (const e of ['tion', 'sion', 'cian', 'ture', 'sure', 'ous']) if (word.text.endsWith(e)) out.push(classifyMistake(word, word.text.slice(0, -e.length) + 'shun', bank))
  }
  return out.filter((x): x is Mistake => x !== null)
}

describe('tip evaluation cases', () => {
  it('has at least 60 mistakes, at least 5 of every kind, and every one classifies', () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(60)
    const counts = new Map<MistakeType, number>()
    for (const c of EVAL_CASES) {
      const word = bank.words.get(c.wordId)
      expect(word, c.wordId).toBeDefined()
      const m = classifyMistake(word!, c.typed, bank)
      expect(m, `${c.wordId} ← ${c.typed}`).not.toBeNull()
      counts.set(m!.type, (counts.get(m!.type) ?? 0) + 1)
    }
    for (const t of TYPES) expect(counts.get(t) ?? 0, t).toBeGreaterThanOrEqual(5)
  })

  // Review I6: the grown-up must see every wording a plain tip can take before tips go live.
  it('gives every plain tip the word bank can produce a wording family', () => {
    const all = everyMistake()
    expect(all.length).toBeGreaterThan(150)
    for (const m of all) expect(wordingFamilies(m.template), m.template).not.toEqual([])
  })

  it('includes at least one mistake of every wording family', () => {
    const seen = new Set(EVAL_CASES.flatMap(c => wordingFamilies(classifyMistake(bank.words.get(c.wordId)!, c.typed, bank)!.template)))
    for (const [name] of WORDING_FAMILIES) expect(seen.has(name), name).toBe(true)
  })
})
