import { describe, it, expect } from 'vitest'
import { parseWordSpec, wordId } from './parse'

describe('wordId', () => {
  it('makes stable slugs', () => {
    expect(wordId('because')).toBe('w-because')
    expect(wordId('February')).toBe('w-february')
    expect(wordId("it's")).toBe('w-it-s')
    expect(wordId('its')).toBe('w-its')
    expect(wordId('it’s')).toBe('w-it-s')
    expect(wordId("I'm")).toBe('w-i-m')
    expect(wordId('anti-clockwise')).toBe('w-anti-clockwise')
    expect(wordId("girls'")).toBe('w-girls')
  })
})

describe('parseWordSpec', () => {
  it('parses syllables and a tricky range', () => {
    expect(parseWordSpec('Feb|[ru]|ar|y')).toEqual({ text: 'February', syllables: ['Feb', 'ru', 'ar', 'y'], tricky: [[3, 5]] })
  })
  it('supports single-syllable words and several tricky ranges', () => {
    expect(parseWordSpec('s[ai]d')).toEqual({ text: 'said', syllables: ['said'], tricky: [[1, 3]] })
    expect(parseWordSpec('[k]now|le[dge]')).toEqual({ text: 'knowledge', syllables: ['know', 'ledge'], tricky: [[0, 1], [6, 9]] })
  })
  it('allows a tricky range to span a syllable break', () => {
    expect(parseWordSpec('b[u|s]y')).toEqual({ text: 'busy', syllables: ['bu', 'sy'], tricky: [[1, 3]] })
  })
  it('keeps hyphens and apostrophes as letters', () => {
    expect(parseWordSpec("can['t]")).toEqual({ text: "can't", syllables: ["can't"], tricky: [[3, 5]] })
    expect(parseWordSpec('an|ti-|clock|wise')).toEqual({ text: 'anti-clockwise', syllables: ['an', 'ti-', 'clock', 'wise'], tricky: [] })
  })
  it('rejects malformed specs', () => {
    expect(() => parseWordSpec('Feb||ry')).toThrow()
    expect(() => parseWordSpec('Feb[ru')).toThrow()
    expect(() => parseWordSpec('Feb]ru')).toThrow()
    expect(() => parseWordSpec('a[]b')).toThrow()
    expect(() => parseWordSpec('[a[b]]')).toThrow()
  })
})
