import { describe, it, expect } from 'vitest'
import type { PatternUnitDef } from '../types'
import { Y1_UNITS } from './y1'
import { Y2_UNITS } from './y2'
import { Y3_UNITS } from './y3'
import { Y4_UNITS } from './y4'
import { Y5_UNITS } from './y5'
import { Y6_UNITS } from './y6'
import { ALL_UNIT_DEFS } from './index'

export function checkUnits(units: PatternUnitDef[]) {
  const ids = new Set<string>()
  for (const u of units) {
    expect(ids.has(u.id), `duplicate id ${u.id}`).toBe(false)
    ids.add(u.id)
    expect(u.words.length, `${u.id} has < 6 words`).toBeGreaterThanOrEqual(6)
    expect(new Set(u.words).size, `${u.id} repeats a word`).toBe(u.words.length)
    expect(u.rule.length).toBeGreaterThan(10)
    const inUnit = (w: string) => expect(u.words, `${u.id}: '${w}' not in words`).toContain(w)
    if (u.game.kind === 'sort') {
      expect(u.game.buckets.length).toBeGreaterThanOrEqual(2)
      expect(u.game.buckets.length).toBeLessThanOrEqual(4)
      u.game.buckets.forEach(b => { expect(b.words.length).toBeGreaterThanOrEqual(2); b.words.forEach(inUnit) })
    }
    if (u.game.kind === 'builder') {
      expect(u.game.pairs.length).toBeGreaterThanOrEqual(4)
      u.game.pairs.forEach(p => { expect(p.parts.length).toBeGreaterThanOrEqual(2); inUnit(p.word) })
    }
    if (u.game.kind === 'homophone') {
      expect(u.game.items.length).toBeGreaterThanOrEqual(6)
      u.game.items.forEach(i => {
        expect(i.sentence.split('___')).toHaveLength(2)
        expect(i.options).toContain(i.answer)
        i.options.forEach(inUnit)
      })
    }
  }
}

describe('Year 1 and 2 pattern units', () => {
  it('Y1 units are well-formed', () => { expect(Y1_UNITS).toHaveLength(25); checkUnits(Y1_UNITS) })
  it('Y2 units are well-formed', () => { expect(Y2_UNITS).toHaveLength(21); checkUnits(Y2_UNITS) })
  it('every unit is tagged with its year', () => {
    Y1_UNITS.forEach(u => expect(u.year).toBe(1))
    Y2_UNITS.forEach(u => expect(u.year).toBe(2))
  })
})


describe('Year 3 and 4 pattern units', () => {
  it('Y3 units are well-formed with school priorities 1–10 in order', () => {
    expect(Y3_UNITS).toHaveLength(10)
    checkUnits(Y3_UNITS)
    expect(Y3_UNITS.map(u => u.schoolPriority)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    Y3_UNITS.forEach(u => expect(u.year).toBe(3))
  })
  it('Y4 units are well-formed', () => {
    expect(Y4_UNITS).toHaveLength(11)
    checkUnits(Y4_UNITS)
    Y4_UNITS.forEach(u => expect(u.year).toBe(4))
  })
  it('ALL_UNIT_DEFS has unique ids across years', () => {
    expect(ALL_UNIT_DEFS).toHaveLength(67 + 8 + 6)
    expect(new Set(ALL_UNIT_DEFS.map(u => u.id)).size).toBe(ALL_UNIT_DEFS.length)
  })
})

// Years 5 and 6 from DfE English Appendix 1; the builder's split between the two years (design of 2026-10-28).
describe('Year 5 and 6 pattern units', () => {
  it('Y5 units are well-formed and tagged Year 5', () => {
    expect(Y5_UNITS.map(u => u.id)).toEqual(['y5-cious-tious', 'y5-cial-tial', 'y5-ant-ent', 'y5-ance-ence', 'y5-able-ible', 'y5-ably-ibly', 'y5-silent-letters', 'y5-ce-se'])
    checkUnits(Y5_UNITS)
    Y5_UNITS.forEach(u => expect(u.year).toBe(5))
  })
  it('Y6 units are well-formed and tagged Year 6', () => {
    expect(Y6_UNITS.map(u => u.id)).toEqual(['y6-fer', 'y6-hyphens', 'y6-ei-after-c', 'y6-ough', 'y6-homophones-1', 'y6-homophones-2'])
    checkUnits(Y6_UNITS)
    Y6_UNITS.forEach(u => expect(u.year).toBe(6))
  })
  it('never uses the word builder for -fer words, so no "short sound" doubling tip is given for them', () => {
    expect(Y6_UNITS.find(u => u.id === 'y6-fer')!.game.kind).toBe('sort')
  })
})
