import type { Bank } from '../../content'
import { CONTRACTIONS, HOMOPHONE_GLOSSES, MEMORY_TRICKS } from '../../content/tipContent'
import type { Word } from '../../content/types'
import { checkWord, normalise } from '../checker'
import { diffLetters } from '../diff'

export type MistakeType = 'capital' | 'homophone' | 'apostrophe' | 'doubling' | 'dropE' | 'yToI' | 'ending' | 'tricky'

export interface Mistake {
  type: MistakeType
  target: string
  /** Normalised attempt, as typed (case kept). */
  attempt: string
  facts: string[]
  /** The always-correct plain tip. */
  template: string
  /** Lowercase tokens a reworded tip must still contain. A token in double quotes must appear quoted. */
  mustMention: string[]
  /** Lowercase strings a tip may put in quotes. */
  quotable: string[]
}

type Suffix = { root: string; suffix: string; kind: 'doubling' | 'dropE' | 'yToI' }
const ENDING_UNITS = new Set(['y2-tion', 'y3-ation', 'y3-ous', 'y4-sion', 'y4-sure-ture', 'y4-tion-ssion-sion-cian'])
const ENDINGS: [ending: string, sound: string | null][] = [
  ['ssion', 'shun'], ['tion', 'shun'], ['cian', 'shun'], ['sion', null], ['ture', 'cher'], ['sure', 'zher'], ['ous', 'us'],
]
const MONTHS = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'])

const suffixCache = new WeakMap<Bank, Map<string, Suffix>>()
/** Target text → the root and suffix of the builder pairs whose spelling changes (doubling, drop e, y to i). */
function suffixesOf(bank: Bank): Map<string, Suffix> {
  let map = suffixCache.get(bank)
  if (map) return map
  map = new Map()
  for (const u of bank.units) {
    if (u.game.kind !== 'builder') continue
    for (const { parts, word } of u.game.pairs) {
      if (parts.length !== 2) continue
      const [root, suffix] = parts
      const kind = word === root + root.at(-1) + suffix ? 'doubling'
        : root.endsWith('e') && word === root.slice(0, -1) + suffix ? 'dropE'
          : root.endsWith('y') && word === root.slice(0, -1) + 'i' + suffix ? 'yToI'
            : null
      if (kind) map.set(word.toLowerCase(), { root, suffix, kind })
    }
  }
  suffixCache.set(bank, map)
  return map
}

const longest = (phrase: string) => phrase.split(/[^a-z0-9]+/i).filter(Boolean).reduce((a, b) => (b.length > a.length ? b : a), '')

function capital(word: Word, attempt: string): Mistake {
  const t = word.text
  const isI = t === 'I' || t.startsWith("I'")
  const template = t === 'I' ? '"I" is always a capital letter.'
    : isI ? `"${t}" starts with "I", and "I" is always a capital letter.`
      : word.sets.includes('days') ? `Days of the week always start with a capital letter: "${t}".`
        : MONTHS.has(t.toLowerCase()) ? `Months of the year always start with a capital letter: "${t}".`
          : `Names start with a capital letter: "${t}".`
  return { type: 'capital', target: t, attempt, facts: [template], template, mustMention: ['capital'], quotable: [t.toLowerCase(), 'i'] }
}

function homophone(word: Word, attempt: string): Mistake | null {
  const a = attempt.toLowerCase()
  const target = word.text.toLowerCase()
  if (a === target || !word.homophoneGroup?.split('/').includes(a)) return null
  const ga = HOMOPHONE_GLOSSES[a]
  const gt = HOMOPHONE_GLOSSES[target]
  if (!ga || !gt) return null
  const template = `"${a}" means ${ga}. This word is "${word.text}", meaning ${gt}.`
  return { type: 'homophone', target: word.text, attempt, facts: [`"${a}" means ${ga}`, `"${word.text}" means ${gt}`], template,
    mustMention: [longest(gt).toLowerCase()], quotable: [a, target] }
}

function apostrophe(word: Word, attempt: string): Mistake | null {
  const key = word.text.toLowerCase()
  const expansion = CONTRACTIONS[key]
  if (!expansion || attempt.toLowerCase().replace(/'/g, '') !== key.replace(/'/g, '')) return null
  const template = `"${word.text}" is short for "${expansion}". The apostrophe shows where letters are missing.`
  return { type: 'apostrophe', target: word.text, attempt, facts: [`"${word.text}" is short for "${expansion}"`], template,
    mustMention: ['short for'], quotable: [key, expansion.toLowerCase()] }
}

function suffix(word: Word, attempt: string, bank: Bank): Mistake | null {
  const s = suffixesOf(bank).get(word.text.toLowerCase())
  if (!s || attempt.toLowerCase() !== s.root + s.suffix) return null
  const { root, suffix: sfx } = s
  const t = word.text
  if (s.kind === 'doubling') {
    const last = root.at(-1)!
    const template = `"${root}" has a short sound and ends in one consonant, so double the "${last}" before "${sfx}": "${t}".`
    return { type: 'doubling', target: t, attempt, facts: [template], template, mustMention: ['double'], quotable: [root, last, sfx, t.toLowerCase()] }
  }
  if (s.kind === 'dropE') {
    const template = `"${root}" ends in "e". Drop the "e" before adding "${sfx}" to make "${t}".`
    return { type: 'dropE', target: t, attempt, facts: [template], template, mustMention: ['drop'], quotable: [root, 'e', sfx, t.toLowerCase()] }
  }
  const template = `When "${root}" gets "${sfx}", the "y" changes to "i": "${t}".`
  return { type: 'yToI', target: t, attempt, facts: [template], template, mustMention: ['"i"'], quotable: [root, sfx, 'y', 'i', t.toLowerCase()] }
}

function ending(word: Word, attempt: string): Mistake | null {
  if (!word.patternUnitIds.some(id => ENDING_UNITS.has(id))) return null
  const t = word.text
  const found = ENDINGS.find(([e]) => t.toLowerCase().endsWith(e))
  if (!found || attempt.toLowerCase().endsWith(found[0])) return null
  const [e, sound] = found
  const template = sound ? `The "${sound}" sound at the end of "${t}" is spelt "${e}".` : `The end of "${t}" is spelt "${e}".`
  return { type: 'ending', target: t, attempt, facts: [template], template, mustMention: [e], quotable: [t.toLowerCase(), e, ...(sound ? [sound] : [])] }
}

function tricky(word: Word, attempt: string): Mistake | null {
  if (!word.tricky.length) return null
  // Find the first letter of the word that she got wrong (case is handled by the capital rule).
  let i = 0
  let first = -1
  for (const op of diffLetters(word.text, attempt, { foldCase: true })) {
    if (op.kind === 'match') { i++; continue }
    first = i
    break
  }
  if (first < 0 || !word.tricky.some(([a, b]) => first >= a && first < b)) return null
  const bits = word.tricky.map(([a, b]) => word.text.slice(a, b))
  const t = word.text
  const lead = bits.length === 1 ? `The tricky bit in "${t}" is "${bits[0]}".` : `The tricky bits in "${t}" are ${bits.map(b => `"${b}"`).join(' and ')}.`
  const trick = MEMORY_TRICKS[word.id]
  const template = trick ? `${lead} ${trick}` : lead
  return { type: 'tricky', target: t, attempt, facts: [lead, ...(trick ? [trick] : [])], template,
    mustMention: bits.map(b => b.toLowerCase()), quotable: [t.toLowerCase(), ...bits.map(b => b.toLowerCase())] }
}

/** Works out what kind of mistake she made, with the facts and an always-correct plain tip; null when it can't tell. */
export function classifyMistake(word: Word, typed: string, bank: Bank): Mistake | null {
  const attempt = normalise(typed)
  if (!attempt) return null
  const check = checkWord(word, attempt)
  if (check.correct || attempt.length > word.text.length * 2) return null
  if (check.capitalOnly) return capital(word, attempt)
  // School-list words have no tricky letters, meanings or patterns: only the safe kinds of tip.
  if (word.custom) return apostrophe(word, attempt)
  return homophone(word, attempt) ?? apostrophe(word, attempt) ?? suffix(word, attempt, bank) ?? ending(word, attempt) ?? tricky(word, attempt)
}
