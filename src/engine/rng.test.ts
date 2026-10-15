import { describe, it, expect } from 'vitest'
import { makeRng, hashString, shuffle, sample, pick } from './rng'

describe('rng', () => {
  it('is deterministic for a seed and stays in [0,1)', () => {
    const a = makeRng(42), b = makeRng(42)
    const xs = Array.from({ length: 5 }, () => a())
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()))
    xs.forEach(x => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) })
  })
  it('different seeds give different sequences', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)())
  })
  it('hashString is stable', () => {
    expect(hashString('because')).toBe(hashString('because'))
    expect(hashString('because')).not.toBe(hashString('becuase'))
  })
  it('shuffle returns a permutation without mutating', () => {
    const src = [1, 2, 3, 4, 5, 6]
    const out = shuffle(src, makeRng(7))
    expect([...out].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6])
  })
  it('sample returns n distinct items (or all if fewer)', () => {
    expect(new Set(sample([1, 2, 3, 4, 5], 3, makeRng(3))).size).toBe(3)
    expect(sample([1, 2], 5, makeRng(3))).toHaveLength(2)
    expect(sample([1, 2], -1, makeRng(3))).toHaveLength(0)
  })
  it('pick handles empty arrays', () => {
    expect(pick([], makeRng(1))).toBeUndefined()
    expect([1, 2, 3]).toContain(pick([1, 2, 3], makeRng(1)))
  })
})
