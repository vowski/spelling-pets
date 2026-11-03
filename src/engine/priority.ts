import type { Bank } from '../content'
import { addDays, dayNumber, diffDays } from './dates'
import { isDue, isSecure } from './scheduler'
import { getProgress, type LearnerState, type SchoolList } from './types'

/** This week's lists: every list whose test is the next one to come (more than one list can share a date). */
export function weekLists(state: Pick<LearnerState, 'schoolLists' | 'today'>): SchoolList[] {
  const next = state.schoolLists.filter(l => l.testDate >= state.today).map(l => l.testDate).sort()[0]
  return next ? state.schoolLists.filter(l => l.testDate === next) : []
}

/** Lists that share a test date, as one list for the daily adventure (each word once). */
function merged(lists: SchoolList[]): SchoolList | null {
  if (!lists.length) return null
  const items = lists.flatMap(l => l.items).filter((item, i, all) => all.findIndex(x => x.wordId === item.wordId) === i)
  return { ...lists[0], items }
}

export function activeSchoolList(state: LearnerState): SchoolList | null {
  return merged(weekLists(state))
}

export function practiceTestList(state: LearnerState): SchoolList | null {
  const tomorrow = addDays(state.today, 1)
  return merged(state.schoolLists.filter(l => l.testDate === tomorrow))
}

/** Most Secure-word retests in one warm-up. */
export const MAX_RETESTS = 2

export function reviewCandidates(bank: Bank, state: LearnerState, max: number): string[] {
  const out: string[] = []
  const add = (id: string) => {
    if (out.length < max && !out.includes(id) && bank.words.has(id)) out.push(id)
  }
  const list = activeSchoolList(state)
  // School words take at most half the places, least known first, so a long list can't crowd out retests all term.
  if (list) {
    const box = (id: string) => getProgress(state, id).box
    list.items.map(i => i.wordId).filter(id => box(id) >= 1).sort((a, b) => box(a) - box(b)).slice(0, Math.ceil(max / 2)).forEach(add)
  }
  const all = [...state.progress.values()]
  all.filter(p => p.focus && p.box >= 1).forEach(p => add(p.wordId))
  // At most MAX_RETESTS Secure retests come before the words still being learnt; the rest wait for any spare places.
  let retests = 0
  const waiting: string[] = []
  all
    .filter(p => isDue(p, state.today))
    .sort((a, b) => a.due!.localeCompare(b.due!) || a.wordId.localeCompare(b.wordId))
    .forEach(p => {
      if (isSecure(p)) {
        if (retests >= MAX_RETESTS) return void waiting.push(p.wordId)
        retests++
      }
      add(p.wordId)
    })
  all
    .filter(p => p.lastFailedOn !== null && diffDays(p.lastFailedOn, state.today) <= 3)
    .sort((a, b) => b.lastFailedOn!.localeCompare(a.lastFailedOn!) || a.wordId.localeCompare(b.wordId))
    .forEach(p => add(p.wordId))
  waiting.forEach(add)
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
