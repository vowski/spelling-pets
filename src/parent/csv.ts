import type { DateStr } from '../engine/dates'

export type CsvCell = string | number | null | undefined
export type CsvRow = readonly CsvCell[]

/** A spreadsheet runs a cell starting with one of these as a formula, so text starting with one is kept as text. */
const FORMULA_START = /^[=+\-@\t\r]/

function cell(c: CsvCell): string {
  if (c === null || c === undefined) return ''
  if (typeof c === 'number') return String(c)
  const text = FORMULA_START.test(c) ? `'${c}` : c
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Rows as CSV (RFC 4180): commas between cells, CRLF between rows, quotes only where needed. */
export function toCsv(rows: readonly CsvRow[]): string {
  return rows.map(r => r.map(cell).join(',')).join('\r\n')
}

export const csvFileName = (what: string, today: DateStr) => `spelling-pets-${what}-${today}.csv`

/** Saves the CSV through the browser's downloads, with a byte order mark so Excel reads it as UTF-8. */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Revoking straight after click() can cancel the download in some browsers, so give it time to start.
  setTimeout(() => URL.revokeObjectURL(url), 40_000)
}
