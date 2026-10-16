import type { Bank } from '../content'
import { wordId } from '../content/parse'
import { addDays, type DateStr } from './dates'

export function parseSchoolWords(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[\n,;\t]+/)) {
    const piece = part
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .trim()
      .replace(/^(?:\d+\s*[.)]|[-*•·])\s*/, '')
      .replace(/^"+|["!?:.]+$/g, '')
      .trim()
    if (!/^[A-Za-z][A-Za-z' -]*$/.test(piece)) continue
    const k = piece.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(piece)
  }
  return out
}

export function resolveSchoolWords(texts: readonly string[], bank: Bank) {
  return texts.map(text => {
    const id = wordId(text)
    const w = bank.words.get(id)
    return w ? { text: w.text, wordId: id, inBank: true } : { text, wordId: id, inBank: false }
  })
}

export function nextFriday(today: DateStr): DateStr {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay() // 0 Sunday … 5 Friday
  const ahead = (5 - dow + 7) % 7 || 7
  return addDays(today, ahead)
}
