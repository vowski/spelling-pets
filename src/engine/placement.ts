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
      } else if (p.box >= 1) {
        // Placement is neutral: nothing is demoted on a re-run, a miss just brings the word up for review.
        updates.set(id, { ...p, due: p.due !== null && p.due < today ? p.due : today })
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

export interface HuntProgress {
  /** Treasure Hunt words she has answered, out of the whole hunt. */
  done: number
  total: number
  /** Treasure Hunts left before the egg hatches, counting one she has started as one. */
  huntsLeft: number
  /** She is part-way through a Treasure Hunt (today's unfinished adventure). */
  midHunt: boolean
}

/**
 * How far the Treasure Hunt has got, for the egg on the home screen. `openHunt` is the words of a hunt she has started
 * but not finished; before the first adventure there is no plan yet, so the planned size is used.
 */
export function huntProgress(levels: readonly PlacementLevelState[], openHunt: readonly string[] = [], size = PLACEMENT_CHUNK): HuntProgress {
  const all = levels.length ? levels.flatMap(l => l.sampledIds) : null
  const total = all ? all.length : PLACEMENT_LEVELS.reduce((n, l) => n + l.sample, 0)
  const answered = new Set(levels.flatMap(l => Object.keys(l.answers)))
  const done = all ? all.filter(id => answered.has(id)).length : 0
  const leftToday = all ? openHunt.filter(id => all.includes(id) && !answered.has(id)).length : 0
  return { done, total, huntsLeft: (leftToday ? 1 : 0) + Math.ceil((total - done - leftToday) / size), midHunt: leftToday > 0 }
}

export function isPlacementDone(levels: readonly PlacementLevelState[]): boolean {
  return levels.length > 0 && levels.every(l => l.status === 'done')
}
