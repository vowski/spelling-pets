import type { Bank } from '../content'
import { wordId } from '../content/parse'
import { addDays, type DateStr } from './dates'

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
