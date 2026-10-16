import { describe, it, expect } from 'vitest'
import { WHEEL_PUZZLES, WHEEL_ANCHORS, puzzlesForAnchor } from './wheel'
import { BUILTIN_BANK } from './index'
import { isBlockedWord } from './dictionary'
import { validateLayout } from '../../scripts/crossword'

const canMake = (word: string, letters: string[]) => {
  const pool = [...letters]
  for (const ch of word) { const i = pool.indexOf(ch); if (i < 0) return false; pool.splice(i, 1) }
  return true
}

describe('Word Wheel puzzles', () => {
  it('has plenty of puzzles anchored on bank words', () => {
    expect(WHEEL_PUZZLES.length).toBeGreaterThan(150)
    for (const p of WHEEL_PUZZLES) expect(BUILTIN_BANK.words.has(p.anchorWordId), p.anchorWordId).toBe(true)
    expect(WHEEL_ANCHORS.has(WHEEL_PUZZLES[0].anchorWordId)).toBe(true)
    expect(puzzlesForAnchor(WHEEL_PUZZLES[0].anchorWordId)).toHaveLength(1)
  })
  it('every puzzle is solvable, valid and child-safe', () => {
    for (const p of WHEEL_PUZZLES) {
      const anchor = BUILTIN_BANK.words.get(p.anchorWordId)!.text
      expect(p.grid.map(g => g.word)).toContain(anchor)
      expect(p.grid.length).toBeGreaterThanOrEqual(3)
      expect([...p.letters].sort().join('')).toBe([...anchor].sort().join(''))
      expect(p.letters.join('')).not.toBe(anchor)
      for (const w of [...p.grid.map(g => g.word), ...p.bonus]) {
        expect(canMake(w, p.letters), `${p.id}: ${w}`).toBe(true)
        expect(isBlockedWord(w), `${p.id}: ${w}`).toBe(false)
      }
      expect(validateLayout({ placed: p.grid, rows: p.rows, cols: p.cols }), p.id).toEqual([])
      expect(p.rows).toBeLessThanOrEqual(10)
      expect(p.cols).toBeLessThanOrEqual(10)
    }
  })
  it('never asks for apostrophe-less contractions or US forms, and has no adult or unkind words', () => {
    const never = new Set(['cant', 'hes', 'shes', 'wont', 'dont', 'isnt', 'didnt', 'busses', 'cums', 'beers', 'lager', 'cider', 'morons', 'coke', 'sect'])
    for (const p of WHEEL_PUZZLES) {
      for (const w of [...p.grid.map(g => g.word), ...p.bonus]) expect(never.has(w), `${p.id}: ${w}`).toBe(false)
    }
  })
})
