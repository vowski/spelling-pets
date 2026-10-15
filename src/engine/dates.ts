/** A local calendar date, 'YYYY-MM-DD'. String comparison orders dates correctly. */
export type DateStr = string

const MS_PER_DAY = 86_400_000

export function toDateStr(d: Date): DateStr {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toUtcMs(d: DateStr): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

export function addDays(d: DateStr, n: number): DateStr {
  return new Date(toUtcMs(d) + n * MS_PER_DAY).toISOString().slice(0, 10)
}

export function diffDays(from: DateStr, to: DateStr): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

export function weekStart(d: DateStr): DateStr {
  const dow = new Date(toUtcMs(d)).getUTCDay() // 0 = Sunday
  return addDays(d, -((dow + 6) % 7))
}

export function dayNumber(d: DateStr): number {
  return Math.round(toUtcMs(d) / MS_PER_DAY)
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s
}
