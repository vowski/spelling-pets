import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { parseSchoolWords, resolveSchoolWords, nextFriday } from './schoolWords'

describe('school words', () => {
  // Review Focus #3: messy pasted lists
  it('cleans a messy pasted list', () => {
    expect(parseSchoolWords('1. because\n2) Monday;  February.\n• because').words).toEqual(['because', 'Monday', 'February'])
    expect(parseSchoolWords('“friend”, - people\t* it’s\n\n42\n  ').words).toEqual(['friend', 'people', "it's"])
    expect(parseSchoolWords('Brother, brother, BROTHER').words).toEqual(['Brother'])
  })
  it('reads dash bullets and numbers with no full stop', () => {
    expect(parseSchoolWords('– because\n— friend\n1 people\n12  Monday').words).toEqual(['because', 'friend', 'people', 'Monday'])
  })
  it('splits words typed on one line with spaces', () => {
    expect(parseSchoolWords('because friend  people\n3. Monday February').words).toEqual(['because', 'friend', 'people', 'Monday', 'February'])
  })
  it('reports pieces it could not use instead of dropping them silently', () => {
    expect(parseSchoolWords('because\nnaïve, 42\n2nd\n-\n\n').skipped).toEqual(['naïve', '42', '2nd'])
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

  it('lowercases new words whose capital only comes from how the list was typed', () => {
    expect(resolveSchoolWords(['Crocodile', 'VOLCANO', 'McDonald'], bank)).toEqual([
      { text: 'crocodile', wordId: 'w-crocodile', inBank: false },
      { text: 'volcano', wordId: 'w-volcano', inBank: false },
      { text: 'McDonald', wordId: 'w-mcdonald', inBank: false },
    ])
  })
})
