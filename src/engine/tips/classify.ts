import type { Bank } from '../../content'
import { CONTRACTIONS, HOMOPHONE_GLOSSES, MEMORY_TRICKS } from '../../content/tipContent'
import type { Word } from '../../content/types'
import { checkWord, normalise } from '../checker'
import { diffLetters } from '../diff'
import { letterChunks, type LetterChunk } from './letters'

export type MistakeType = 'capital' | 'homophone' | 'apostrophe' | 'doubling' | 'dropE' | 'yToI' | 'ending' | 'tricky' | 'letters'

export interface Mistake {
  type: MistakeType
  target: string
  /** Normalised attempt, as typed (case kept). */
  attempt: string
  facts: string[]
  /** The always-correct plain tip. */
  template: string
  /** The part of the plain tip the model may reword: all of it, or all but its memory trick. */
  reword: string
  /** A reviewed memory trick the model never sees; tipFromReply adds it back word for word. */
  keep?: string
  /** Lowercase tokens a reworded tip must still contain. A token in double quotes must appear quoted. */
  mustMention: string[]
  /** Lowercase strings a tip may put in quotes. */
  quotable: string[]
  /** Sound-alike tips only: each word's meaning (its key word) must come after that word, not after the other one. */
  meanings?: { word: string; token: string }[]
  /** Tricky and letters mistakes: each run of letters she got wrong, so the tip can talk about what she wrote. */
  letters?: LetterChunk[]
  /** Always the plain tip, never the AI: the attempt is nothing like the word, or only says where a hyphen goes. */
  plainOnly?: true
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

const TITLES = new Set(['mr', 'mrs', 'ms', 'dr'])

function capital(word: Word, attempt: string): Mistake {
  const t = word.text
  const isI = t === 'I' || t.startsWith("I'")
  const template = t === 'I' ? '"I" is always a capital letter.'
    : isI ? `"${t}" starts with "I", and "I" is always a capital letter.`
      : word.sets.includes('days') ? `Days of the week always start with a capital letter: "${t}".`
        : MONTHS.has(t.toLowerCase()) ? `Months of the year always start with a capital letter: "${t}".`
          : TITLES.has(t.toLowerCase()) ? `"${t}" goes with a name, so it starts with a capital letter.`
          : `Names start with a capital letter: "${t}".`
  return { type: 'capital', target: t, attempt, facts: [template], template, reword: template, mustMention: ['capital'], quotable: [t.toLowerCase(), 'i'] }
}

function homophone(word: Word, attempt: string): Mistake | null {
  const a = attempt.toLowerCase()
  const target = word.text.toLowerCase()
  if (a === target || !word.homophoneGroup?.split('/').includes(a)) return null
  const ga = HOMOPHONE_GLOSSES[a]
  const gt = HOMOPHONE_GLOSSES[target]
  if (!ga || !gt) return null
  const template = `"${a}" means ${ga}. This word is "${word.text}", meaning ${gt}.`
  return { type: 'homophone', target: word.text, attempt, facts: [`"${a}" means ${ga}`, `"${word.text}" means ${gt}`], template, reword: template,
    mustMention: [longest(gt).toLowerCase()], quotable: [a, target],
    meanings: [{ word: a, token: longest(ga).toLowerCase() }, { word: target, token: longest(gt).toLowerCase() }] }
}

function apostrophe(word: Word, attempt: string): Mistake | null {
  const key = word.text.toLowerCase()
  const expansion = CONTRACTIONS[key]
  if (!expansion || attempt.toLowerCase().replace(/'/g, '') !== key.replace(/'/g, '')) return null
  const template = `"${word.text}" is short for "${expansion}". The apostrophe shows where letters are missing.`
  return { type: 'apostrophe', target: word.text, attempt, facts: [`"${word.text}" is short for "${expansion}"`], template, reword: template,
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
    return { type: 'doubling', target: t, attempt, facts: [template], template, reword: template, mustMention: ['double', 'short', `"${root}"`], quotable: [root, last, sfx, t.toLowerCase()] }
  }
  if (s.kind === 'dropE') {
    const template = `"${root}" ends in "e", so drop the "e" before "${sfx}": "${t}".`
    return { type: 'dropE', target: t, attempt, facts: [template], template, reword: template, mustMention: ['drop', `"${root}"`], quotable: [root, 'e', sfx, t.toLowerCase()] }
  }
  const template = `When "${root}" gets "${sfx}", the "y" changes to "i": "${t}".`
  return { type: 'yToI', target: t, attempt, facts: [template], template, reword: template, mustMention: ['"y" changes to "i"', `"${root}"`], quotable: [root, sfx, 'y', 'i', t.toLowerCase()] }
}

function ending(word: Word, attempt: string): Mistake | null {
  if (!word.patternUnitIds.some(id => ENDING_UNITS.has(id))) return null
  const t = word.text
  const found = ENDINGS.find(([e]) => t.toLowerCase().endsWith(e))
  if (!found || attempt.toLowerCase().endsWith(found[0])) return null
  const [e, sound] = found
  const template = sound ? `The "${sound}" sound at the end of "${t}" is spelt "${e}".` : `The end of "${t}" is spelt "${e}".`
  // Spelt the way it sounds ("stashun"): the notes say so. Otherwise ("stasion") the tip talks about her letters.
  const chunks = sound && attempt.toLowerCase().endsWith(sound) ? [] : letterChunks(t, attempt)
  const letters = chunks.length && chunks.length <= 3 ? { letters: chunks } : {}
  return { type: 'ending', target: t, attempt, facts: [template], template, reword: template, mustMention: [`"${e}"`],
    quotable: [t.toLowerCase(), e, ...(sound ? [sound] : []), ...(letters.letters ? chunkLetters(chunks) : [])], ...letters }
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
  const chunks = letterChunks(word.text, attempt)
  const t = word.text
  const lead = bits.length === 1 && bits[0] === t ? `The whole of "${t}" is tricky, so learn it by heart.`
    : bits.length === 1 ? `The tricky bit in "${t}" is "${bits[0]}".` : `The tricky bits in "${t}" are ${bits.map(b => `"${b}"`).join(' and ')}.`
  const trick = MEMORY_TRICKS[word.id]
  const template = trick ? `${lead} ${trick}` : lead
  return { type: 'tricky', target: t, attempt, facts: [lead, ...(trick ? [trick] : [])], template, reword: lead, ...(trick ? { keep: trick } : {}),
    // The trick is added back word for word after the reworded lead (tipFromReply); this guards that it survived.
    mustMention: [...bits.map(b => `"${b.toLowerCase()}"`), ...(trick ? [trick.slice(trick.indexOf(':') + 1).trim().replace(/\.$/, '').toLowerCase()] : [])],
    quotable: [t.toLowerCase(), ...bits.map(b => b.toLowerCase()), ...chunkLetters(chunks)], letters: chunks }
}

/** A hyphenated word written without its hyphen ("coordinate", "re elect"): say where the hyphen goes, in words. */
function hyphen(word: Word, attempt: string): Mistake | null {
  const t = word.text
  if (!t.includes('-') || attempt.includes('-')) return null
  const parts = t.split('-')
  const template = parts.length === 2 ? `"${t}" has a hyphen (-) between "${parts[0]}" and "${parts[1]}".`
    : `"${t}" has hyphens (-) joining ${joinAnd(parts.map(p => `"${p}"`))}.`
  return { type: 'letters', target: t, attempt, facts: [template], template, reword: template, mustMention: [], quotable: [t.toLowerCase(), ...parts.map(p => p.toLowerCase())], plainOnly: true }
}

const chunkLetters = (chunks: LetterChunk[]) => chunks.flatMap(c => [c.has, c.wrote]).filter(Boolean)
const joinAnd = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`)

/** Any other wrong spelling: name the letters she got wrong. Too different from the word, and it's a plain "look carefully". */
function letters(word: Word, attempt: string): Mistake {
  const t = word.text
  const chunks = letterChunks(t, attempt)
  const lower = attempt.toLowerCase()
  const odd = (c: LetterChunk) => c.wrote === lower || `${c.has}${c.wrote}`.includes("'")
  if (!/^[a-z']+$/i.test(attempt) || !chunks.length || chunks.length > 3 || chunks.some(odd)) {
    const template = `Look carefully at each letter of "${t}".`
    return { type: 'letters', target: t, attempt, facts: [template], template, reword: template, mustMention: [], quotable: [t.toLowerCase()], plainOnly: true }
  }
  const clauses = chunks.map(c => (!c.wrote ? `you missed out "${c.has}"` : !c.has ? `you added "${c.wrote}"` : `you wrote "${c.wrote}" where it has "${c.has}"`))
  const partTyped = t.toLowerCase().startsWith(lower)
  const template = partTyped ? `In "${t}", you missed out the end, "${chunks[0].has}".` : `In "${t}", ${joinAnd(clauses)}.`
  return { type: 'letters', target: t, attempt, facts: [template], template, reword: template, mustMention: [], quotable: [t.toLowerCase(), ...chunkLetters(chunks)], letters: chunks }
}

/** Works out what kind of mistake she made, with the facts and an always-correct plain tip; null when there is nothing to say. */
export function classifyMistake(word: Word, typed: string, bank: Bank): Mistake | null {
  const attempt = normalise(typed)
  if (!attempt) return null
  const check = checkWord(word, attempt)
  if (check.correct || attempt.length > word.text.length * 2) return null
  if (check.capitalOnly) return capital(word, attempt)
  // School-list words have no tricky letters, meanings or patterns: only the safe kinds of tip.
  if (word.custom) return apostrophe(word, attempt) ?? hyphen(word, attempt) ?? letters(word, attempt)
  return homophone(word, attempt) ?? apostrophe(word, attempt) ?? hyphen(word, attempt) ?? suffix(word, attempt, bank) ?? ending(word, attempt) ?? tricky(word, attempt) ?? letters(word, attempt)
}
