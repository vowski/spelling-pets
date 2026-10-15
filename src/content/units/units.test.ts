import { describe, it, expect } from 'vitest'
import type { PatternUnitDef } from '../types'
import { Y1_UNITS } from './y1'
import { Y2_UNITS } from './y2'

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
