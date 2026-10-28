import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { computeStats } from './stats'
import { prog, T } from './testing'
import type { UnitState } from './types'

describe('computeStats', () => {
  it('counts secure words per set, with y34 headwords only', () => {
    const progress = new Map([
      ['w-the', prog('w-the', { box: 4 })],
      ['w-said', prog('w-said', { box: 5 })],
      ['w-was', prog('w-was', { box: 3 })],
      ['w-accident', prog('w-accident', { box: 4 })],
      ['w-accidentally', prog('w-accidentally', { box: 4 })],
    ])
    const s = computeStats(bank, progress, new Map(), [])
    expect(s.secureTotal).toBe(4)
    expect(s.masteredTotal).toBe(1)
    expect(s.secureBySet.y1cew).toBe(2)
    expect(s.secureBySet.hfw).toBe(2)
    expect(s.secureBySet.y34).toBe(1)
    expect(s.sizeBySet.y34).toBe(100)
    expect(s.sizeBySet.y1cew).toBe(45)
  })
  it('counts finished units by year', () => {
    const units = new Map<string, UnitState>([
      ['y1-nk', { unitId: 'y1-nk', status: 'known', startedOn: T, completedOn: T, taughtWordIds: [] }],
      ['y3-ation', { unitId: 'y3-ation', status: 'complete', startedOn: T, completedOn: T, taughtWordIds: [] }],
      ['y3-ly', { unitId: 'y3-ly', status: 'learning', startedOn: T, completedOn: null, taughtWordIds: [] }],
    ])
    const s = computeStats(bank, new Map(), units, [])
    expect([...s.unitsDone].sort()).toEqual(['y1-nk', 'y3-ation'])
    expect(s.unitsDoneByYear).toEqual({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0 })
    expect(s.unitsByYear).toEqual({ 1: 25, 2: 21, 3: 10, 4: 11, 5: 0, 6: 0 })
  })
})
