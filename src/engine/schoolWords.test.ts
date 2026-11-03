import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { parseSchoolWords, parseTermLists, resolveSchoolWords, nextFriday } from './schoolWords'

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

// Weekly spellings (2026-11-03): a grown-up pastes a whole term of lists at once.
describe('parseTermLists', () => {
  it('reads named lists with one test date per line, in British date order', () => {
    const r = parseTermLists('Class list\n12/1/27: cat, dog, fish\n19/01/2027 - hen, pig\n\nMy words\n12/1/27: sun, run')
    expect(r.lists).toEqual([
      { name: 'Class list', testDate: '2027-01-12', words: ['cat', 'dog', 'fish'], skipped: [] },
      { name: 'Class list', testDate: '2027-01-19', words: ['hen', 'pig'], skipped: [] },
      { name: 'My words', testDate: '2027-01-12', words: ['sun', 'run'], skipped: [] },
    ])
    expect(r.problems).toEqual([])
  })

  it('names a list with no heading "Spelling list", and reports impossible dates and empty lines', () => {
    const r = parseTermLists('12/1/27: cat, d0g\n31/2/27: hen\n19/1/27:')
    expect(r.lists).toEqual([{ name: 'Spelling list', testDate: '2027-01-12', words: ['cat'], skipped: ['d0g'] }])
    expect(r.problems).toEqual(['31/2/27 is not a real date.', 'No words after 19/1/27.'])
  })

  // Final review of 2026-11-03: a line it cannot read is reported, never quietly turned into a list name.
  it('reports lines it cannot read, tests already past, and keeps the last of a list given twice', () => {
    const r = parseTermLists('Class list\n19.1.27: hen, pig\nMon 12/1/27: cat\n12/1/25: old\n26/1/27: cat\n26/1/27: dog', '2027-01-01')
    expect(r.problems).toEqual([
      'Could not read "19.1.27: hen, pig". Start each line with the test date, like 12/1/27: then the words.',
      'Could not read "Mon 12/1/27: cat". Start each line with the test date, like 12/1/27: then the words.',
      '12/1/25 is in the past. Check the year.',
    ])
    expect(r.lists).toEqual([{ name: 'Class list', testDate: '2027-01-26', words: ['dog'], skipped: [] }])
  })
})
