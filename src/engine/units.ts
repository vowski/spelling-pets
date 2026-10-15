import type { PatternUnit } from '../content/types'
import type { DateStr } from './dates'
import { spreadDue } from './placement'
import { newProgress, type UnitState, type WordProgress } from './types'

export function startUnit(unitId: string, today: DateStr): UnitState {
  return { unitId, status: 'checking', startedOn: today, completedOn: null, taughtWordIds: [] }
}

export function afterUnitCheck(
  u: UnitState,
  unit: PatternUnit,
  allCorrect: boolean,
  progress: ReadonlyMap<string, WordProgress>,
  today: DateStr,
): { unit: UnitState; updates: WordProgress[] } {
  if (!allCorrect) return { unit: { ...u, status: 'learning' }, updates: [] }
  const updates: WordProgress[] = []
  unit.wordIds.forEach(id => {
    const p = progress.get(id) ?? newProgress(id)
    if (p.box === 0) updates.push({ ...p, box: 3, due: spreadDue(today, updates.length), introducedOn: today })
  })
  return { unit: { ...u, status: 'known', completedOn: today }, updates }
}

export function recordUnitTaught(u: UnitState, wordIds: readonly string[]): UnitState {
  return { ...u, taughtWordIds: [...new Set([...u.taughtWordIds, ...wordIds])] }
}

export function finishUnitDay(u: UnitState, day: 1 | 2, today: DateStr): UnitState {
  return day === 2 ? { ...u, status: 'complete', completedOn: today } : u
}

export function isUnitDone(u: UnitState | undefined): boolean {
  return u?.status === 'known' || u?.status === 'complete'
}
