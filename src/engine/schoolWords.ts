import type { Bank } from '../content'
import { wordId } from '../content/parse'
import { addDays, isValidDateStr, type DateStr } from './dates'

/**
 * Reads a pasted or typed school list. Each line (or comma-separated piece) may start with a number or a bullet,
 * and words typed on one line with spaces become separate words. Pieces that are not a plain word come back in
 * `skipped` so the grown-up can see what was left out.
 */
export function parseSchoolWords(raw: string): { words: string[]; skipped: string[] } {
  const seen = new Set<string>()
  const words: string[] = []
  const skipped: string[] = []
  for (const part of raw.split(/[\n,;\t]+/)) {
    const line = part
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .trim()
      .replace(/^(?:\d+\s*[.)]\s*|\d+\s+|[-–—*•·]\s*)/, '')
    for (const token of line.split(/\s+/)) {
      const piece = token.replace(/^"+|["!?:.]+$/g, '')
      if (!/^[A-Za-z][A-Za-z'-]*$/.test(piece)) {
        if (/[\p{L}\p{N}]/u.test(piece)) skipped.push(piece)
        continue
      }
      const k = piece.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      words.push(piece)
    }
  }
  return { words, skipped }
}

export interface TermList { name: string; testDate: DateStr; words: string[]; skipped: string[] }

const DATED_LINE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\s*[:\-–—]?\s*(.*)$/

/**
 * Reads a whole term of lists pasted by a grown-up. A line without a date names the lists that follow
 * ("My spellings"); each dated line is one list: its test date (day/month/year, as in England) then its words.
 * Anything else is reported rather than guessed at. With `today`, a test already past is reported too (a year typo).
 */
export function parseTermLists(raw: string, today?: DateStr): { lists: TermList[]; problems: string[] } {
  const lists: TermList[] = []
  const problems: string[] = []
  let name = 'Spelling list'
  for (const line of raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    const m = DATED_LINE.exec(line)
    if (!m) {
      // A name has no numbers or commas; a line with them is a list it could not read ("19.1.27: hen, pig").
      if (/[\d,]/.test(line)) problems.push(`Could not read "${line}". Start each line with the test date, like 12/1/27: then the words.`)
      else name = line.replace(/:$/, '').trim()
      continue
    }
    const [, d, mo, y, rest] = m
    const written = line.slice(0, line.length - rest.length).replace(/\s*[:\-–—]?\s*$/, '')
    const testDate = `${y.length === 2 ? `20${y}` : y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    if (!isValidDateStr(testDate)) { problems.push(`${written} is not a real date.`); continue }
    if (today && testDate < today) { problems.push(`${written} is in the past. Check the year.`); continue }
    const { words, skipped } = parseSchoolWords(rest)
    if (!words.length) { problems.push(`No words after ${written}.`); continue }
    // The same list given twice in one paste: the later one wins.
    const same = lists.findIndex(l => l.name === name && l.testDate === testDate)
    if (same >= 0) lists.splice(same, 1)
    lists.push({ name, testDate, words, skipped })
  }
  return { lists, problems }
}

export function resolveSchoolWords(texts: readonly string[], bank: Bank) {
  return texts.map(text => {
    const id = wordId(text)
    const w = bank.words.get(id)
    // A capital that only comes from how the list was typed ("Crocodile", "VOLCANO") would make the word
    // case-sensitive, so it is dropped; mixed case such as "McDonald" is kept.
    const casual = text === text.toUpperCase() || text.slice(1) === text.slice(1).toLowerCase()
    return w ? { text: w.text, wordId: id, inBank: true } : { text: casual ? text.toLowerCase() : text, wordId: id, inBank: false }
  })
}

export function nextFriday(today: DateStr): DateStr {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay() // 0 Sunday … 5 Friday
  const ahead = (5 - dow + 7) % 7 || 7
  return addDays(today, ahead)
}
