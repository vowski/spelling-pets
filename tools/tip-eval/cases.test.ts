import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../../src/content'
import { classifyMistake, type MistakeType } from '../../src/engine/tips/classify'
import { EVAL_CASES } from './cases'

const TYPES: MistakeType[] = ['capital', 'homophone', 'apostrophe', 'doubling', 'dropE', 'yToI', 'ending', 'tricky']

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
})
