import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { parseSchoolWords, resolveSchoolWords, nextFriday } from './schoolWords'

describe('school words', () => {
  // Review Focus #3: messy pasted lists
  it('cleans a messy pasted list', () => {
    expect(parseSchoolWords('1. because\n2) Monday;  February.\n• because')).toEqual(['because', 'Monday', 'February'])
    expect(parseSchoolWords('“friend”, - people\t* it’s\n\n42\n  ')).toEqual(['friend', 'people', "it's"])
    expect(parseSchoolWords('Brother, brother, BROTHER')).toEqual(['Brother'])
  })
  it('matches bank words and keeps new ones', () => {
    expect(resolveSchoolWords(['monday', 'crocodile', 'because'], bank)).toEqual([
      { text: 'Monday', wordId: 'w-monday', inBank: true },
      { text: 'crocodile', wordId: 'w-crocodile', inBank: false },
      { text: 'because', wordId: 'w-because', inBank: true },
    ])
  })
  it('finds next Friday', () => {
    expect(nextFriday('2026-10-15')).toBe('2026-10-16')
    expect(nextFriday('2026-10-16')).toBe('2026-10-23')
    expect(nextFriday('2026-10-18')).toBe('2026-10-23')
  })
})
