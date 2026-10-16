import { describe, it, expect } from 'vitest'
import { splitPhrases } from './phrases'

describe('splitPhrases', () => {
  it('keeps short sentences whole', () => {
    expect(splitPhrases('My friend came here.')).toEqual(['My friend came here.'])
  })
  it('splits longer sentences near the middle', () => {
    expect(splitPhrases('The children played on the grass all day.')).toEqual(['The children played on', 'the grass all day.'])
  })
})
