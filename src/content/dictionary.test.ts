import { describe, it, expect } from 'vitest'
import { isDictionaryWord, isBlockedWord, isRejectedDistractor } from './dictionary'

describe('dictionary', () => {
  it('knows common words in any case', () => {
    expect(isDictionaryWord('house')).toBe(true)
    expect(isDictionaryWord('House')).toBe(true)
    expect(isDictionaryWord('becuase')).toBe(false)
  })
  it('knows blocked words', () => {
    expect(isBlockedWord('stupid')).toBe(true)
    expect(isBlockedWord('puppy')).toBe(false)
  })
  it('rejects real, blocked and bank words as distractors', () => {
    expect(isRejectedDistractor('house')).toBe(true)
    expect(isRejectedDistractor('stupid')).toBe(true)
    expect(isRejectedDistractor('neighbour')).toBe(true)
    expect(isRejectedDistractor('nieghbour')).toBe(false)
  })
})
