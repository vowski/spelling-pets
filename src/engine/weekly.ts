import { addDays, weekStart, type DateStr } from './dates'

export function weekProgress(completeDates: readonly DateStr[], today: DateStr, goalDays: number) {
  const ws = weekStart(today)
  const end = addDays(ws, 6)
  const days = [...new Set(completeDates.filter(d => d >= ws && d <= end))].sort()
  return { weekStart: ws, daysPractised: days.length, goalDays, met: days.length >= goalDays, days }
}

export function weeksGoalMet(completeDates: readonly DateStr[], goalDays: number, fromDate?: DateStr): number {
  const from = fromDate ? weekStart(fromDate) : '0000-01-01'
  const byWeek = new Map<DateStr, Set<DateStr>>()
  for (const d of completeDates) {
    const ws = weekStart(d)
    if (ws < from) continue
    if (!byWeek.has(ws)) byWeek.set(ws, new Set())
    byWeek.get(ws)!.add(d)
  }
  return [...byWeek.values()].filter(s => s.size >= goalDays).length
}
