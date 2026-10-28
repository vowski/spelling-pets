import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { STANDARDS, type StandardRow } from '../content/standards'
import { evaluateStandard, gridBand } from './standards-eval'
import type { LearnerStats } from './stats'

const base: LearnerStats = {
  secureTotal: 0, masteredTotal: 0,
  secureBySet: { y1cew: 0, days: 0, hfw: 0, y2cew: 0, y34: 0, y56: 0, pattern: 0, school: 0 },
  sizeBySet: { y1cew: 45, days: 7, hfw: 100, y2cew: 64, y34: 100, y56: 100, pattern: 400, school: 0 },
  unitsDone: new Set(), unitsDoneByYear: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, unitsByYear: { 1: 24, 2: 21, 3: 10, 4: 11, 5: 0, 6: 0 },
  storyResults: [],
}
const row = (evaluator: StandardRow['evaluator']): StandardRow => ({ id: 'x', grid: 3, band: 'at', text: 'x', evaluator })

describe('standards', () => {
  it('every row is valid and references real units', () => {
    expect(STANDARDS.length).toBeGreaterThanOrEqual(20)
    expect(new Set(STANDARDS.map(r => r.id)).size).toBe(STANDARDS.length)
    for (const r of STANDARDS) if (r.evaluator.kind === 'unitsDone') r.evaluator.unitIds.forEach(id => expect(bank.unitById.has(id), id).toBe(true))
    for (const g of [1, 2, 3] as const) for (const b of ['towards', 'at', 'greaterDepth'] as const) expect(STANDARDS.some(r => r.grid === g && r.band === b), `${g}/${b}`).toBe(true)
  })
  it('evaluates set counts with evidence', () => {
    const r = row({ kind: 'setSecureCount', set: 'y34', count: 50 })
    expect(evaluateStandard(r, { ...base, secureBySet: { ...base.secureBySet, y34: 23 } })).toEqual({ met: false, progress: 0.46, evidence: '23 of 100 Secure (aim: 50)' })
    expect(evaluateStandard(r, { ...base, secureBySet: { ...base.secureBySet, y34: 50 } }).met).toBe(true)
  })
  it('evaluates fractions, units and story time', () => {
    expect(evaluateStandard(row({ kind: 'setSecureFraction', set: 'y1cew', fraction: 0.5 }), { ...base, secureBySet: { ...base.secureBySet, y1cew: 23 } }).met).toBe(true)
    expect(evaluateStandard(row({ kind: 'unitsDone', unitIds: ['y3-ation', 'y3-ly'] }), { ...base, unitsDone: new Set(['y3-ation']) })).toMatchObject({ met: false, progress: 0.5, evidence: '1 of 2 spelling patterns finished' })
    expect(evaluateStandard(row({ kind: 'yearUnitsFraction', year: 1, fraction: 0.5 }), { ...base, unitsDoneByYear: { 1: 12, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } }).met).toBe(true)
    const st = row({ kind: 'storyTime', lastN: 4, minWordAccuracy: 0.7, minPunctuation: 0.7 })
    expect(evaluateStandard(st, base)).toMatchObject({ met: false, evidence: '0 of 4 sentences so far' })
    const good = Array.from({ length: 4 }, (_, i) => ({ at: i, wordAccuracy: 0.8, punctuationOk: i !== 0 }))
    expect(evaluateStandard(st, { ...base, storyResults: good })).toMatchObject({ met: true, evidence: '80% of words right; capitals and full stops 75%' })
  })
  it('works out the band for a grid', () => {
    expect(gridBand(STANDARDS, base, 3)).toBe('notYet')
    const all = (n: number) => ({ y1cew: n, days: n, hfw: n, y2cew: n, y34: n, y56: 0, pattern: 0, school: 0 })
    const strong: LearnerStats = { ...base, secureBySet: all(100), unitsDone: new Set(bank.units.map(u => u.id)), unitsDoneByYear: { 1: 24, 2: 21, 3: 10, 4: 11, 5: 0, 6: 0 }, storyResults: Array.from({ length: 10 }, (_, i) => ({ at: i, wordAccuracy: 1, punctuationOk: true })) }
    expect(gridBand(STANDARDS, strong, 3)).toBe('greaterDepth')
  })
})
