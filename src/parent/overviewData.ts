import type { Bank } from '../content'
import type { Word } from '../content/types'
import { addDays, toDateStr, weekStart, type DateStr } from '../engine/dates'
import type { LearnerStats } from '../engine/stats'
import { isDue, isSecure } from '../engine/scheduler'
import type { WordProgress } from '../engine/types'
import { weekProgress } from '../engine/weekly'
import type { AttemptRow, SessionRow } from '../storage/db'

const SCORED = new Set(['recall', 'pretest', 'recognise', 'build', 'pattern'])
const dayOf = (ms: number) => toDateStr(new Date(ms))

export interface WeekSummary { daysPractised: number; goalDays: number; minutes: number; wordsPractised: number; accuracy: number | null }

export function weekSummary(sessions: SessionRow[], attempts: AttemptRow[], today: DateStr, goalDays: number): WeekSummary {
  const ws = weekStart(today)
  const we = addDays(ws, 6)
  const inWeek = (d: DateStr) => d >= ws && d <= we
  const complete = sessions.filter(s => s.complete && s.kind !== 'free')
  const week = weekProgress(complete.map(s => s.date), today, goalDays)
  const minutes = Math.round(complete.filter(s => inWeek(s.date) && s.endedAt).reduce((m, s) => m + (s.endedAt! - s.startedAt) / 60000, 0))
  const wk = attempts.filter(a => inWeek(dayOf(a.at)))
  const scored = wk.filter(a => a.firstTry && SCORED.has(a.role))
  return {
    daysPractised: week.daysPractised, goalDays, minutes,
    wordsPractised: new Set(wk.map(a => a.wordId)).size,
    accuracy: scored.length ? scored.filter(a => a.correct && !a.hint).length / scored.length : null,
  }
}

/** Words Secure now, words that were Secure but slipped back into practice after a missed retest, and retests due. */
export function secureSummary(progress: WordProgress[], today: DateStr): { secure: number; slipped: number; retestsDue: number } {
  return {
    secure: progress.filter(isSecure).length,
    slipped: progress.filter(p => p.secureOn && !isSecure(p)).length,
    retestsDue: progress.filter(p => isSecure(p) && isDue(p, today)).length,
  }
}

export function secureTimeline(progress: WordProgress[], today: DateStr, weeks = 12) {
  const last = weekStart(today)
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(last, -7 * (weeks - 1 - i))
    const end = addDays(ws, 6)
    return { weekStart: ws, secure: progress.filter(p => p.secureOn && p.secureOn <= end).length }
  })
}

export function weeklyAccuracy(attempts: AttemptRow[], today: DateStr, weeks = 8) {
  const last = weekStart(today)
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(last, -7 * (weeks - 1 - i))
    const we = addDays(ws, 6)
    const scored = attempts.filter(a => { const d = dayOf(a.at); return d >= ws && d <= we && a.firstTry && SCORED.has(a.role) })
    return { weekStart: ws, accuracy: scored.length ? scored.filter(a => a.correct && !a.hint).length / scored.length : null, attempts: scored.length }
  })
}

export interface TroubleSpot { wordId: string; text: string; mistakes: number; misspellings: string[]; tip: string }

export function homeTip(word: Word, bank: Bank): string {
  if (word.followOnOf) return `Learn '${bank.words.get(word.followOnOf)?.text}' first, then add the ending.`
  if (word.homophoneGroup) {
    const others = word.homophoneGroup.split('/').filter(o => o !== word.text.toLowerCase())
    return `It sounds like ${others.join(' and ')}. Practise it in a sentence so the meaning sticks.`
  }
  if (word.tricky.length) return `Focus on the tricky bit '${word.tricky.map(([a, b]) => word.text.slice(a, b)).join("' and '")}'. Write it in a different colour.`
  return 'Practise Look, Say, Cover, Write, Check together.'
}

export function troubleSpots(bank: Bank, progress: WordProgress[], limit = 10): TroubleSpot[] {
  return progress
    .filter(p => p.box <= 3 && bank.words.has(p.wordId) && Object.keys(p.misspellings).length)
    .map(p => {
      const entries = Object.entries(p.misspellings).sort((a, b) => b[1] - a[1])
      const word = bank.words.get(p.wordId)!
      return { p, spot: { wordId: p.wordId, text: word.text, mistakes: entries.reduce((s, [, n]) => s + n, 0), misspellings: entries.slice(0, 3).map(([t]) => t), tip: homeTip(word, bank) } }
    })
    .sort((a, b) => b.spot.mistakes - a.spot.mistakes || (a.p.correct / Math.max(1, a.p.seen)) - (b.p.correct / Math.max(1, b.p.seen)))
    .slice(0, limit)
    .map(x => x.spot)
}

export interface LevelBar { label: string; secure: number; total: number; markers?: number[] }

export function levelBars(stats: LearnerStats): LevelBar[] {
  const s = stats.secureBySet
  const n = stats.sizeBySet
  const unitsTotal = Object.values(stats.unitsByYear).reduce((a, b) => a + b, 0)
  return [
    { label: 'Year 1 tricky words', secure: s.y1cew, total: n.y1cew },
    { label: 'Days of the week', secure: s.days, total: n.days },
    { label: '100 high-frequency words', secure: s.hfw, total: n.hfw },
    { label: 'Year 2 tricky words', secure: s.y2cew, total: n.y2cew },
    { label: 'Year 3/4 word list', secure: s.y34, total: n.y34, markers: [50, 70] },
    { label: 'Spelling patterns', secure: stats.unitsDone.size, total: unitsTotal },
  ]
}
