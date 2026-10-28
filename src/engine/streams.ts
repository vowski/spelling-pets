import type { Bank } from '../content'
import { activeSchoolList } from './priority'
import { getProgress, type LearnerState } from './types'

export type NewMaterial =
  | { kind: 'words'; wordIds: string[]; source: 'school' | 'focus' | 'queues' }
  | { kind: 'unit'; unitId: string; day: 1 | 2; wordIds: string[] }
  | { kind: 'none' }

export const WORDS_PER_UNIT_DAY = 3
export const SCHOOL_NEW_MAX = 6

const uniq = (ids: string[]) => [...new Set(ids)]
const isNew = (state: LearnerState, id: string) => getProgress(state, id).box === 0

export function gapWordStream(bank: Bank, state: LearnerState): string[] {
  const placed = new Set(state.placement.filter(l => l.placed).map(l => l.level))
  const sets = (['y1cew', 'days', 'hfw', 'y2cew'] as const).filter(s => !placed.has(s))
  return uniq(sets.flatMap(s => bank.setIds[s])).filter(id => isNew(state, id))
}

/** A statutory list's new words in family order, each follow-on once her headword has reached box 2. */
function listStream(bank: Bank, state: LearnerState, families: Bank['y34Families']): string[] {
  const ordered = families.flat()
  const followOns = ordered.filter(id => {
    const head = bank.words.get(id)?.followOnOf
    return head !== undefined && getProgress(state, head).box >= 2 && isNew(state, id)
  })
  const heads = ordered.filter(id => !bank.words.get(id)?.followOnOf && isNew(state, id))
  return [...followOns, ...heads]
}

export const y3WordStream = (bank: Bank, state: LearnerState) => listStream(bank, state, bank.y34Families)
export const y56WordStream = (bank: Bank, state: LearnerState) => listStream(bank, state, bank.y56Families)

const highestYear = (state: LearnerState) => state.settings.highestYear ?? 3

/** One from each list in turn, so a newly unlocked list shows up straight away without dropping the earlier one. */
function alternate(a: string[], b: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(...(i < a.length ? [a[i]] : []), ...(i < b.length ? [b[i]] : []))
  return out
}

/** New statutory-list words: Years 3–4, alternating with Years 5–6 once Year 5 is unlocked. */
export function listWordStream(bank: Bank, state: LearnerState): string[] {
  const y34 = y3WordStream(bank, state)
  return highestYear(state) >= 5 ? alternate(y34, y56WordStream(bank, state)) : y34
}

/** A unit left in 'checking' on an earlier day was abandoned before its Quick Check, so it counts as not started. */
const abandoned = (state: LearnerState, unitId: string) => {
  const u = state.units.get(unitId)
  return u?.status === 'checking' && u.startedOn < state.today
}

export function unitStream(bank: Bank, state: LearnerState): string[] {
  const begun = (id: string) => state.units.has(id) && !abandoned(state, id)
  // A unit above the unlocked year stays only if she has already been in it (the grown-up lowered the setting).
  const fresh = bank.units.filter(u => !begun(u.id) && (u.year <= highestYear(state) || state.units.has(u.id)))
  const gap = fresh.filter(u => u.year <= 2)
  const y3 = fresh.filter(u => u.year === 3).sort((a, b) => (a.schoolPriority ?? 0) - (b.schoolPriority ?? 0))
  const later = fresh.filter(u => u.year >= 4).sort((a, b) => a.year - b.year)
  // Keep the two kinds balanced: whichever kind has had fewer units started goes first (Year 3 on a tie).
  const started = (pred: (year: number) => boolean) => bank.units.filter(u => pred(u.year) && begun(u.id)).length
  const y3First = started(y => y === 3) <= started(y => y <= 2)
  const [first, second] = y3First ? [y3, gap] : [gap, y3]
  const out: string[] = []
  for (let i = 0; i < Math.max(gap.length, y3.length); i++) {
    if (first[i]) out.push(first[i].id)
    if (second[i]) out.push(second[i].id)
  }
  return [...out, ...later.map(u => u.id)]
}

export function chooseNewMaterial(bank: Bank, state: LearnerState, n: number): NewMaterial {
  const cont = [...state.units.values()].find(u => u.status === 'learning' && u.startedOn < state.today)
  if (cont) {
    const unit = bank.unitById.get(cont.unitId)
    if (unit) {
      // Untaught rather than box 0: the day-1 unit game and Quick Check move words out of box 0 without teaching them.
      const wordIds = unit.wordIds.filter(id => !cont.taughtWordIds.includes(id) && getProgress(state, id).box < 3).slice(0, WORDS_PER_UNIT_DAY)
      return { kind: 'unit', unitId: unit.id, day: 2, wordIds }
    }
  }

  const list = activeSchoolList(state)
  if (list) {
    const ids = uniq(list.items.map(i => i.wordId)).filter(id => bank.words.has(id) && isNew(state, id))
    if (ids.length) return { kind: 'words', source: 'school', wordIds: ids.slice(0, Math.max(n, SCHOOL_NEW_MAX)) }
  }

  const focus = [...state.progress.values()].filter(p => p.focus && p.box === 0 && bank.words.has(p.wordId)).map(p => p.wordId)
  if (focus.length) return { kind: 'words', source: 'focus', wordIds: focus.slice(0, n) }

  const units = unitStream(bank, state)
  const unitDay1 = (): NewMaterial => {
    const unit = bank.unitById.get(units[0])!
    return { kind: 'unit', unitId: unit.id, day: 1, wordIds: unit.wordIds.filter(id => isNew(state, id)).slice(0, WORDS_PER_UNIT_DAY) }
  }
  if (state.lastNewKind !== 'unit' && units.length) return unitDay1()

  const gap = gapWordStream(bank, state)
  const listWords = listWordStream(bank, state)
  const fromGap = gap.slice(0, Math.ceil(n / 2))
  let ids = [...fromGap, ...listWords.filter(id => !fromGap.includes(id)).slice(0, n - fromGap.length)]
  if (ids.length < n) ids = [...ids, ...gap.filter(id => !ids.includes(id)).slice(0, n - ids.length)]
  if (ids.length) return { kind: 'words', source: 'queues', wordIds: ids }

  if (units.length) return unitDay1()
  return { kind: 'none' }
}
