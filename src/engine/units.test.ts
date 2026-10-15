import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { startUnit, afterUnitCheck, recordUnitTaught, finishUnitDay, isUnitDone } from './units'
import { prog, T } from './testing'

const unit = bank.unitById.get('y3-ation')!

describe('unit lifecycle', () => {
  it('starts in checking', () => {
    expect(startUnit(unit.id, T)).toEqual({ unitId: unit.id, status: 'checking', startedOn: T, completedOn: null, taughtWordIds: [] })
  })
  it('a perfect check marks the unit known and schedules its new words for review', () => {
    const existing = new Map([[unit.wordIds[0], prog(unit.wordIds[0], { box: 4, due: '2026-11-01' })]])
    const { unit: u, updates } = afterUnitCheck(startUnit(unit.id, T), unit, true, existing, T)
    expect(u).toMatchObject({ status: 'known', completedOn: T })
    expect(updates).toHaveLength(unit.wordIds.length - 1)
    updates.forEach(p => { expect(p.box).toBe(3); expect(p.due! > T).toBe(true) })
    expect(isUnitDone(u)).toBe(true)
  })
  it('an imperfect check starts teaching', () => {
    const { unit: u, updates } = afterUnitCheck(startUnit(unit.id, T), unit, false, new Map(), T)
    expect(u.status).toBe('learning')
    expect(updates).toEqual([])
    expect(isUnitDone(u)).toBe(false)
  })
  it('records taught words without duplicates and completes on day 2', () => {
    let u = afterUnitCheck(startUnit(unit.id, T), unit, false, new Map(), T).unit
    u = recordUnitTaught(u, ['w-a', 'w-b'])
    u = recordUnitTaught(u, ['w-b', 'w-c'])
    expect(u.taughtWordIds).toEqual(['w-a', 'w-b', 'w-c'])
    expect(finishUnitDay(u, 1, T).status).toBe('learning')
    expect(finishUnitDay(u, 2, '2026-10-16')).toMatchObject({ status: 'complete', completedOn: '2026-10-16' })
    expect(isUnitDone(undefined)).toBe(false)
  })
})
