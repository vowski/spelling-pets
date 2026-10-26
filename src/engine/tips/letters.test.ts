import { describe, it, expect } from 'vitest'
import { letterChunks } from './letters'

describe('letterChunks', () => {
  it('finds each run of letters she got wrong: what the word has there, and what she wrote', () => {
    expect(letterChunks('friend', 'freind')).toEqual([{ has: 'ie', wrote: 'ei' }])
    expect(letterChunks('what', 'wot')).toEqual([{ has: 'ha', wrote: 'o' }])
    expect(letterChunks('because', 'bicos')).toEqual([{ has: 'e', wrote: 'i' }, { has: 'au', wrote: 'o' }, { has: 'e', wrote: '' }])
  })

  it('reports missing letters with nothing written, and added letters with nothing in the word', () => {
    const [missed] = letterChunks('probably', 'probly')
    expect(missed.wrote).toBe('')
    expect(missed.has).toHaveLength(2)
    expect(letterChunks('busy', 'bussy')).toEqual([{ has: '', wrote: 's' }])
  })

  it('ignores capitals and finds nothing when only the case differs', () => {
    expect(letterChunks('Monday', 'monday')).toEqual([])
    expect(letterChunks('Wednesday', 'wensday')).toEqual([{ has: 'd', wrote: '' }, { has: 'e', wrote: '' }])
  })
})
