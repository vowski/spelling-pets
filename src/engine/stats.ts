import type { Bank } from '../content'
import type { SetId } from '../content/types'
import { isMastered, isSecure } from './scheduler'
import { isUnitDone } from './units'
import type { UnitState, WordProgress } from './types'

export interface StoryResult { at: number; wordAccuracy: number; punctuationOk: boolean }

export interface LearnerStats {
  secureTotal: number
  masteredTotal: number
  secureBySet: Record<SetId, number>
  sizeBySet: Record<SetId, number>
  unitsDone: ReadonlySet<string>
  unitsDoneByYear: Record<1 | 2 | 3 | 4, number>
  unitsByYear: Record<1 | 2 | 3 | 4, number>
  storyResults: readonly StoryResult[]
}

const SETS: SetId[] = ['y1cew', 'days', 'hfw', 'y2cew', 'y34', 'pattern', 'school']

export function computeStats(
  bank: Bank,
  progress: ReadonlyMap<string, WordProgress>,
  units: ReadonlyMap<string, UnitState>,
  storyResults: readonly StoryResult[],
): LearnerStats {
  const secureBySet = Object.fromEntries(SETS.map(s => [s, 0])) as Record<SetId, number>
  const sizeBySet = Object.fromEntries(SETS.map(s => [s, 0])) as Record<SetId, number>
  for (const set of SETS) {
    const ids = bank.setIds[set].filter(id => set !== 'y34' || !bank.words.get(id)?.followOnOf)
    sizeBySet[set] = ids.length
    secureBySet[set] = ids.filter(id => { const p = progress.get(id); return p !== undefined && isSecure(p) }).length
  }
  const all = [...progress.values()].filter(p => bank.words.has(p.wordId))
  const unitsDone = new Set([...units.values()].filter(isUnitDone).map(u => u.unitId))
  const unitsDoneByYear = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const unitsByYear = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const u of bank.units) {
    unitsByYear[u.year]++
    if (unitsDone.has(u.id)) unitsDoneByYear[u.year]++
  }
  return {
    secureTotal: all.filter(isSecure).length,
    masteredTotal: all.filter(isMastered).length,
    secureBySet, sizeBySet, unitsDone, unitsDoneByYear, unitsByYear, storyResults,
  }
}
