import { describe, it, expect } from 'vitest'
import { diffLetters, alignSequences } from './diff'

const kinds = (e: string, t: string, foldCase = false) => diffLetters(e, t, { foldCase }).map(o => o.kind)

describe('diffLetters', () => {
  it('all matches for identical words', () => {
    expect(kinds('said', 'said')).toEqual(['match', 'match', 'match', 'match'])
  })
  it('swapped letters show as two substitutions', () => {
    expect(kinds('because', 'becuase')).toEqual(['match', 'match', 'match', 'sub', 'sub', 'match', 'match'])
  })
  it('finds a missing letter', () => {
    expect(diffLetters('friend', 'frend')).toEqual([
      { kind: 'match', expected: 'f', typed: 'f' },
      { kind: 'match', expected: 'r', typed: 'r' },
      { kind: 'missing', expected: 'i' },
      { kind: 'match', expected: 'e', typed: 'e' },
      { kind: 'match', expected: 'n', typed: 'n' },
      { kind: 'match', expected: 'd', typed: 'd' },
    ])
  })
  it('finds an extra letter', () => {
    expect(kinds('went', 'whent')).toEqual(['match', 'extra', 'match', 'match', 'match'])
  })
  it('handles empty typing', () => {
    expect(kinds('was', '')).toEqual(['missing', 'missing', 'missing'])
  })
  it('folds case when asked', () => {
    expect(kinds('said', 'SAID', true)).toEqual(['match', 'match', 'match', 'match'])
    expect(kinds('said', 'SAID', false)).toEqual(['sub', 'sub', 'sub', 'sub'])
  })
})

describe('alignSequences', () => {
  it('aligns token arrays with a gap', () => {
    const steps = alignSequences(['I', 'like', 'my', 'dog'], ['I', 'like', 'dog'], (x, y) => x === y)
    expect(steps).toEqual([{ a: 0, b: 0 }, { a: 1, b: 1 }, { a: 2, b: null }, { a: 3, b: 2 }])
  })
})
