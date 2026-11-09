import { STANDARDS } from '../content/standards'
import type { Word } from '../content/types'
import { toDateStr, type DateStr } from '../engine/dates'
import { evaluateStandard, gridBand } from '../engine/standards-eval'
import type { LearnerStats } from '../engine/stats'
import type { WordProgress } from '../engine/types'
import type { CsvRow } from './csv'
import type { LevelBar, TroubleSpot, WeekSummary } from './overviewData'
import { BAND_LABEL, BANDS } from './standardsLabels'
import { BOX_NAMES } from './boxNames'

// What each grown-up CSV download holds (2026-11-09). Percentages are whole numbers; dates are yyyy-mm-dd, which every
// spreadsheet reads; a blank cell means "none yet".

const percent = (x: number | null) => (x === null ? null : Math.round(x * 100))

export interface OverviewData {
  today: DateStr
  week: WeekSummary
  secure: { secure: number; slipped: number; retestsDue: number }
  bars: LevelBar[]
  timeline: { weekStart: DateStr; secure: number }[]
  accuracy: { weekStart: DateStr; accuracy: number | null; attempts: number }[]
  trouble: TroubleSpot[]
}

/** The Overview, one titled table after another, with a blank row between them. */
export function overviewRows(d: OverviewData): CsvRow[] {
  const table = (title: string, header: string[], rows: CsvRow[]): CsvRow[] => [[title], header, ...rows]
  return [
    ['Spelling Pets overview', d.today], [],
    ...table('This week', ['Days practised', 'Goal days', 'Minutes', 'Words practised', 'First-try accuracy (%)'],
      [[d.week.daysPractised, d.week.goalDays, d.week.minutes, d.week.wordsPractised, percent(d.week.accuracy)]]), [],
    ...table('Secure words', ['Secure now', 'Slipped back into practice', 'Retests due'], [[d.secure.secure, d.secure.slipped, d.secure.retestsDue]]), [],
    ...table('Progress by word list', ['List', 'Secure', 'Total'], d.bars.map(b => [b.label, b.secure, b.total])), [],
    ...table('Secure words over time', ['Week starting', 'Secure words'], d.timeline.map(t => [t.weekStart, t.secure])), [],
    ...table('First-try accuracy by week', ['Week starting', 'First-try accuracy (%)', 'Answers'], d.accuracy.map(a => [a.weekStart, percent(a.accuracy), a.attempts])), [],
    ...table('Trouble spots', ['Word', 'Mistakes', 'Her spellings', 'Home tip'], d.trouble.map(t => [t.text, t.mistakes, t.misspellings.join('; '), t.tip])),
  ]
}

/** Every writing-grid statement, Year 3 first as on screen, with the grid's result and the evidence. */
export function standardsRows(stats: LearnerStats): CsvRow[] {
  const rows: CsvRow[] = [['Grid', 'Grid result', 'Band', 'Statement', 'Met', 'Progress (%)', 'Evidence']]
  for (const grid of [3, 2, 1] as const) {
    const result = BAND_LABEL[gridBand(STANDARDS, stats, grid)]
    for (const band of BANDS) {
      for (const r of STANDARDS.filter(s => s.grid === grid && s.band === band)) {
        const res = evaluateStandard(r, stats)
        rows.push([`Year ${grid}`, result, BAND_LABEL[band], r.text, res.met ? 'Yes' : 'No', percent(res.progress), res.evidence])
      }
    }
  }
  return rows
}

/** One row per word: where it is in her learning, how she does, and how she has misspelt it (most often first). */
export function wordsRows(words: readonly Word[], get: (id: string) => WordProgress, setLabel: (set: string) => string): CsvRow[] {
  return [
    ['Word', 'Word sets', 'Status', 'Times asked', 'Right first time', 'Accuracy (%)', 'Last seen', 'Next check', 'Secure since', 'Focus', 'Her misspellings'],
    ...words.map(w => {
      const p = get(w.id)
      const misspelt = Object.entries(p.misspellings).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => `${t} (${n})`)
      return [
        w.text, w.sets.map(setLabel).join('; '), BOX_NAMES[p.box], p.seen, p.correct, p.seen ? percent(p.correct / p.seen) : null,
        p.lastSeenAt ? toDateStr(new Date(p.lastSeenAt)) : null, p.box >= 1 ? p.due : null, p.secureOn, p.focus ? 'Yes' : null,
        misspelt.length ? misspelt.join('; ') : null,
      ]
    }),
  ]
}
