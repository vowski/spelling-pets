import { describe, it, expect } from 'vitest'
import { isBlockedBy } from './blocking'

const blocked = new Set(['beer', 'moron', 'abuse', 'hate', 'sin'])

describe('isBlockedBy', () => {
  it('blocks listed words and their plurals and inflections', () => {
    for (const w of ['beer', 'beers', 'morons', 'abused', 'abuses', 'hated', 'hater', 'sins']) expect(isBlockedBy(w, blocked), w).toBe(true)
  })
  it('leaves innocent words that merely contain a blocked word alone', () => {
    for (const w of ['sing', 'singer', 'since', 'hat', 'cheer', 'beard']) expect(isBlockedBy(w, blocked), w).toBe(false)
  })
})
