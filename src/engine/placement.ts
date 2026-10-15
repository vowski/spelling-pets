import type { Bank } from '../content'
import { addDays, type DateStr } from './dates'
import { makeRng, sample } from './rng'
import { newProgress, type Box, type PlacementLevel, type PlacementLevelState, type WordProgress } from './types'

export const PLACEMENT_LEVELS: readonly { level: PlacementLevel; sample: number }[] = [
  { level: 'y1cew', sample: 10 },
  { level: 'days', sample: 7 },
  { level: 'hfw', sample: 10 },
  { level: 'y2cew', sample: 10 },
  { level: 'y34', sample: 15 },
]
export const PLACED_THRESHOLD = 0.9
export const PLACEMENT_CHUNK = 12
export const SPREAD_DAYS = 14

export function spreadDue(today: DateStr, index: number): DateStr {
  return addDays(today, 1 + (index % SPREAD_DAYS))
}

export function buildPlacementPlan(bank: Bank, seed: number): PlacementLevelState[] {
  const rng = makeRng(seed)
  const used = new Set<string>()
  return PLACEMENT_LEVELS.map(({ level, sample: n }) => {
    const pool = bank.setIds[level].filter(id => !used.has(id) && !bank.words.get(id)?.followOnOf)
    const sampledIds = sample(pool, n, rng)
    sampledIds.forEach(id => used.add(id))
    return { level, sampledIds, answers: {}, status: 'pending', placed: false }
  })
}

export function nextPlacementChunk(levels: readonly PlacementLevelState[], size = PLACEMENT_CHUNK): string[] {
  return levels.flatMap(l => l.sampledIds.filter(id => !(id in l.answers))).slice(0, size)
}

export function recordPlacementAnswer(levels: readonly PlacementLevelState[], wordId: string, correct: boolean): PlacementLevelState[] {
  let done = false
  return levels.map(l => {
    if (done || !l.sampledIds.includes(wordId)) return l
    done = true
    return { ...l, answers: { ...l.answers, [wordId]: correct } }
  })
}

export function finaliseLevels(
  levels: readonly PlacementLevelState[],
  bank: Bank,
  progress: ReadonlyMap<string, WordProgress>,
  today: DateStr,
): { levels: PlacementLevelState[]; updates: WordProgress[] } {
  const updates = new Map<string, WordProgress>()
  const current = (id: string) => updates.get(id) ?? progress.get(id) ?? newProgress(id)
  let k = 0
  const out = levels.map(l => {
    if (l.status === 'done' || l.sampledIds.some(id => !(id in l.answers))) return l
    const correctCount = l.sampledIds.filter(id => l.answers[id]).length
    const placed = l.sampledIds.length === 0 || correctCount / l.sampledIds.length >= PLACED_THRESHOLD
    for (const id of l.sampledIds) {
      const p = current(id)
      if (l.answers[id]) {
        updates.set(id, { ...p, box: Math.max(p.box, 3) as Box, due: p.box > 3 ? p.due : spreadDue(today, k++), introducedOn: p.introducedOn ?? today })
      } else {
        updates.set(id, { ...p, box: 1, due: addDays(today, 1), introducedOn: p.introducedOn ?? today })
      }
    }
    if (placed) {
      for (const id of bank.setIds[l.level]) {
        if (l.sampledIds.includes(id) || current(id).box > 0) continue
        updates.set(id, { ...current(id), box: 3, due: spreadDue(today, k++), introducedOn: today })
      }
    }
    return { ...l, status: 'done' as const, placed }
  })
  return { levels: out, updates: [...updates.values()] }
}

export function isPlacementDone(levels: readonly PlacementLevelState[]): boolean {
  return levels.length > 0 && levels.every(l => l.status === 'done')
}
