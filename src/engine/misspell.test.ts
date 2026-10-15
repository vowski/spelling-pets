import { describe, it, expect } from 'vitest'
import { makeDistractors, misspellingCandidates } from './misspell'
import { makeRng } from './rng'

const REAL = new Set(['becomes', 'cause', 'house', 'mouse', 'said', 'sad', 'sid'])
const reject = (w: string) => REAL.has(w.toLowerCase())

describe('misspellingCandidates', () => {
  it('produces plausible errors for because', () => {
    const { rules, swaps } = misspellingCandidates('because')
    expect(rules).toEqual(expect.arrayContaining(['becaus', 'becawse', 'bekause']))
    expect(swaps).toContain('becuase')
  })
  it('drops silent letters and swaps digraphs', () => {
    expect(misspellingCandidates('knee').rules).toContain('nee')
    expect(misspellingCandidates('write').rules).toContain('rite')
    expect(misspellingCandidates('rain').rules).toContain('rayn')
    expect(misspellingCandidates('hopping').rules).toContain('hoping')
  })
})

describe('makeDistractors', () => {
  it('returns the requested number, never the answer, never a rejected word', () => {
    const out = makeDistractors('because', { reject, rng: makeRng(1), count: 3 })
    expect(out).toHaveLength(3)
    expect(out.map(x => x.toLowerCase())).not.toContain('because')
    out.forEach(x => expect(reject(x)).toBe(false))
    expect(new Set(out).size).toBe(3)
  })
  it('is deterministic for a seed', () => {
    expect(makeDistractors('friend', { reject, rng: makeRng(5), count: 3 })).toEqual(makeDistractors('friend', { reject, rng: makeRng(5), count: 3 }))
  })
  it('prefers her own past misspellings that are close to the word', () => {
    const out = makeDistractors('because', { history: ['becuz', 'xxxxxxxxxx', 'because'], reject, rng: makeRng(2), count: 3 })
    expect(out[0]).toBe('becuz')
    expect(out).not.toContain('xxxxxxxxxx')
  })
  it('keeps the capital letter of proper nouns', () => {
    makeDistractors('Monday', { reject, rng: makeRng(3), count: 2 }).forEach(d => expect(d[0]).toBe('M'))
  })
  it('falls back to letter swaps and returns fewer if it must', () => {
    const out = makeDistractors('a', { reject, rng: makeRng(1), count: 3 })
    expect(out.length).toBeLessThanOrEqual(3)
    out.forEach(x => expect(x.toLowerCase()).not.toBe('a'))
  })
})
