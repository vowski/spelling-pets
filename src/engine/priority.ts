import type { Bank } from '../content'
import { addDays, dayNumber, diffDays } from './dates'
import { isDue, isSecure } from './scheduler'
import { getProgress, type LearnerState, type SchoolList } from './types'

export function activeSchoolList(state: LearnerState): SchoolList | null {
  const lists = state.schoolLists.filter(l => l.testDate >= state.today).sort((a, b) => a.testDate.localeCompare(b.testDate))
  return lists[0] ?? null
}

export function practiceTestList(state: LearnerState): SchoolList | null {
  const tomorrow = addDays(state.today, 1)
  return state.schoolLists.find(l => l.testDate === tomorrow) ?? null
}

/** Most Secure-word retests in one warm-up. */
export const MAX_RETESTS = 2

export function reviewCandidates(bank: Bank, state: LearnerState, max: number): string[] {
  const out: string[] = []
  const add = (id: string) => {
    if (out.length < max && !out.includes(id) && bank.words.has(id)) out.push(id)
  }
  const list = activeSchoolList(state)
  if (list) for (const item of list.items) if (getProgress(state, item.wordId).box >= 1) add(item.wordId)
  const all = [...state.progress.values()]
  all.filter(p => p.focus && p.box >= 1).forEach(p => add(p.wordId))
  // Retests of Secure words take at most MAX_RETESTS places, so words still being learnt get most of the warm-up.
  let retests = 0
  all
    .filter(p => isDue(p, state.today))
    .sort((a, b) => a.due!.localeCompare(b.due!) || a.wordId.localeCompare(b.wordId))
    .forEach(p => {
      if (isSecure(p)) {
        if (retests >= MAX_RETESTS) return
        retests++
      }
      add(p.wordId)
    })
  all
    .filter(p => p.lastFailedOn !== null && diffDays(p.lastFailedOn, state.today) <= 3)
    .sort((a, b) => b.lastFailedOn!.localeCompare(a.lastFailedOn!) || a.wordId.localeCompare(b.wordId))
    .forEach(p => add(p.wordId))
  return out
}

export function learningWords(state: LearnerState, max: number): string[] {
  return [...state.progress.values()]
    .filter(p => p.box === 1 || p.box === 2)
    .sort((a, b) => (b.introducedOn ?? '').localeCompare(a.introducedOn ?? '') || a.wordId.localeCompare(b.wordId))
    .slice(0, max)
    .map(p => p.wordId)
}

export function winWord(state: LearnerState, exclude: ReadonlySet<string>): string | null {
  const known = [...state.progress.values()]
    .filter(p => p.box >= 3 && !exclude.has(p.wordId))
    .map(p => p.wordId)
    .sort()
  return known.length ? known[dayNumber(state.today) % known.length] : null
}
