import type { Word } from '../../content/types'

export function burrowGaps(word: Pick<Word, 'text' | 'tricky'>): [number, number][] {
  if (word.tricky.length) return word.tricky
  return word.text.length >= 4 ? [[1, 3]] : [[0, 1]]
}

export function fillGaps(text: string, gaps: [number, number][], typed: string[]): string {
  let out = ''
  let pos = 0
  gaps.forEach(([a, b], k) => {
    out += text.slice(pos, a) + (typed[k] ?? '')
    pos = b
  })
  return out + text.slice(pos)
}
