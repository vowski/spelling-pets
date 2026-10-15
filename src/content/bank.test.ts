import { describe, it, expect } from 'vitest'
import { buildBank, getWord, BUILTIN_BANK } from './index'
import { PATTERN_WORDS } from './words/pattern-words'
import { STORY_SENTENCES } from './sentences'
import { Y1CEW } from './words/y1cew'
import { DAYS } from './words/days'
import { Y2CEW } from './words/y2cew'
import { HFW_EXTRA } from './words/hfw'
import { Y34_FAMILIES } from './words/y34'
import { ALL_UNIT_DEFS } from './units'
import { parseWordSpec, wordId } from './parse'

const bank = BUILTIN_BANK
const AMERICAN = /\b(color|colors|favorite|favorites|center|neighbor|gray|mom|mommy|vacation|traveling|theater|jewelry|math|candy|sidewalk)\b/i
const containsWord = (sentence: string, text: string, caseSensitive: boolean) => {
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z'])${esc}($|[^A-Za-z])`, caseSensitive ? '' : 'i').test(sentence.replace(/’/g, "'"))
}

describe('word bank', () => {
  it('has the expected set sizes', () => {
    expect(bank.setIds.y1cew).toHaveLength(45)
    expect(bank.setIds.days).toHaveLength(7)
    expect(bank.setIds.y2cew).toHaveLength(64)
    expect(bank.setIds.hfw).toHaveLength(100)
    expect(bank.setIds.y34).toHaveLength(109)
    expect(bank.y34Families).toHaveLength(20)
    expect(bank.units).toHaveLength(67)
  })
  it('shares one record for words in several sets', () => {
    const the = getWord(bank, 'w-the')
    expect(the.sets).toEqual(expect.arrayContaining(['y1cew', 'hfw']))
    expect(getWord(bank, 'w-monday').patternUnitIds).toContain('y2-o-u')
  })
  it('marks capitalised words case-sensitive and links follow-ons', () => {
    expect(getWord(bank, 'w-february').caseSensitive).toBe(true)
    expect(getWord(bank, 'w-because').caseSensitive).toBe(false)
    expect(getWord(bank, 'w-accidentally').followOnOf).toBe('w-accident')
  })
  it('assigns homophone groups', () => {
    expect(getWord(bank, 'w-hear').homophoneGroup).toBe('hear/here')
  })
  it('every word has a valid sentence containing it', () => {
    for (const w of bank.words.values()) {
      expect(w.sentence, w.id).toMatch(/^[A-Z"']/)
      expect(w.sentence, w.id).toMatch(/[.?!]$/)
      expect(w.sentence.split(/\s+/).length, `${w.id}: "${w.sentence}"`).toBeLessThanOrEqual(10)
      expect(containsWord(w.sentence, w.text, w.caseSensitive), `${w.id}: "${w.sentence}"`).toBe(true)
      expect(w.sentence, w.id).not.toMatch(AMERICAN)
      expect(w.syllables.join('')).toBe(w.text)
      expect(w.tricky.length).toBeLessThanOrEqual(2)
    }
  })
  it('PATTERN_WORDS has exactly the unit words not defined elsewhere', () => {
    const earlier = new Set([...Y1CEW, ...DAYS, ...Y2CEW, ...HFW_EXTRA, ...Y34_FAMILIES.flatMap(f => f.entries)].map(e => wordId(parseWordSpec(e[0]).text)))
    const needed = new Set(ALL_UNIT_DEFS.flatMap(u => u.words).map(wordId).filter(id => !earlier.has(id)))
    const have = PATTERN_WORDS.map(e => wordId(parseWordSpec(e[0]).text))
    expect(new Set(have).size).toBe(have.length)
    expect([...have].sort()).toEqual([...needed].sort())
  })
  it('Story Time sentences are well-formed and cover all three levels', () => {
    expect(STORY_SENTENCES.length).toBeGreaterThanOrEqual(80)
    for (const level of [1, 2, 3] as const) expect(STORY_SENTENCES.filter(s => s.level === level).length).toBeGreaterThanOrEqual(25)
    for (const s of bank.sentences) {
      expect(s.text, s.text).toMatch(/^[A-Z]/)
      expect(s.text, s.text).toMatch(/[.?!]$/)
      expect(s.text.split(' ').length, s.text).toBeLessThanOrEqual(9)
      expect(s.wordIds.length, `no bank words in "${s.text}"`).toBeGreaterThan(0)
      expect(s.text).not.toMatch(AMERICAN)
    }
    expect(new Set(bank.sentences.map(s => s.id)).size).toBe(bank.sentences.length)
  })
  it('level-3 sentences each contain at least one Y3/4 word', () => {
    for (const s of bank.sentences.filter(x => x.level === 3)) {
      expect(s.wordIds.some(id => getWord(bank, id).sets.includes('y34')), s.text).toBe(true)
    }
  })
  it('adds custom school words, reusing bank words when the spelling matches', () => {
    const b = buildBank([{ wordId: 'w-because', text: 'because' }, { wordId: 'w-crocodile', text: 'crocodile', sentence: 'The crocodile swam away.' }])
    expect(getWord(b, 'w-because').sets).toContain('school')
    expect(getWord(b, 'w-crocodile')).toMatchObject({ custom: true, sets: ['school'], syllables: ['crocodile'], tricky: [] })
    expect(b.setIds.school).toEqual(['w-because', 'w-crocodile'])
  })
  it('getWord throws for unknown ids', () => {
    expect(() => getWord(bank, 'w-nope')).toThrow()
  })
})
