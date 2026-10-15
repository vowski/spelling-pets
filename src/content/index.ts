import { hashString } from '../engine/rng'
import { parseWordSpec, wordId } from './parse'
import type { CustomWord, PatternUnit, SetId, StorySentence, Word, WordEntry } from './types'
import { Y1CEW } from './words/y1cew'
import { DAYS } from './words/days'
import { Y2CEW } from './words/y2cew'
import { HFW_ORDER, HFW_EXTRA } from './words/hfw'
import { Y34_FAMILIES } from './words/y34'
import { PATTERN_WORDS } from './words/pattern-words'
import { ALL_UNIT_DEFS } from './units'
import { STORY_SENTENCES } from './sentences'

export interface Bank {
  words: ReadonlyMap<string, Word>
  setIds: Readonly<Record<SetId, readonly string[]>>
  units: readonly PatternUnit[]
  unitById: ReadonlyMap<string, PatternUnit>
  sentences: readonly StorySentence[]
  y34Families: readonly (readonly string[])[]
  hfwOrder: readonly string[]
}

const CURRICULUM: readonly SetId[] = ['y1cew', 'days', 'hfw', 'y2cew', 'y34']

export function buildBank(custom: readonly CustomWord[] = []): Bank {
  const words = new Map<string, Word>()
  const setIds: Record<SetId, string[]> = { y1cew: [], days: [], hfw: [], y2cew: [], y34: [], pattern: [], school: [] }

  const addToSet = (w: Word, set: SetId) => {
    if (!w.sets.includes(set)) {
      w.sets.push(set)
      setIds[set].push(w.id)
    }
  }
  const define = (entry: WordEntry, set: SetId): Word => {
    const [spec, sentence, followText] = entry
    const parsed = parseWordSpec(spec)
    const id = wordId(parsed.text)
    let w = words.get(id)
    if (!w) {
      w = {
        id, text: parsed.text, sets: [], patternUnitIds: [], sentence,
        syllables: parsed.syllables, tricky: parsed.tricky, caseSensitive: /[A-Z]/.test(parsed.text),
        ...(followText ? { followOnOf: wordId(followText) } : {}),
      }
      words.set(id, w)
    }
    addToSet(w, set)
    return w
  }

  Y1CEW.forEach(e => define(e, 'y1cew'))
  DAYS.forEach(e => define(e, 'days'))
  Y2CEW.forEach(e => define(e, 'y2cew'))
  const y34Families = Y34_FAMILIES.map(f => f.entries.map(e => define(e, 'y34').id))
  HFW_EXTRA.forEach(e => define(e, 'hfw'))
  const hfwOrder = HFW_ORDER.map(text => {
    const w = words.get(wordId(text))
    if (!w) throw new Error(`HFW word has no entry: ${text}`)
    addToSet(w, 'hfw')
    return w.id
  })
  setIds.hfw = [...hfwOrder]

  const patternEntries = new Map(PATTERN_WORDS.map(e => [wordId(parseWordSpec(e[0]).text), e] as const))
  const units: PatternUnit[] = ALL_UNIT_DEFS.map(def => {
    const wordIds = def.words.map(text => {
      const id = wordId(text)
      let w = words.get(id)
      if (!w) {
        const entry = patternEntries.get(id)
        if (!entry) throw new Error(`Pattern word has no entry: ${text} (${def.id})`)
        w = define(entry, 'pattern')
      } else addToSet(w, 'pattern')
      if (!w.patternUnitIds.includes(def.id)) w.patternUnitIds.push(def.id)
      return id
    })
    return { id: def.id, year: def.year, title: def.title, rule: def.rule, schoolPriority: def.schoolPriority, wordIds, game: def.game }
  })

  for (const u of units) {
    if (u.game.kind !== 'homophone') continue
    for (const item of u.game.items) {
      const group = item.options.map(o => o.toLowerCase()).sort().join('/')
      for (const o of item.options) {
        const w = words.get(wordId(o))
        if (w) w.homophoneGroup = group
      }
    }
  }

  for (const c of custom) {
    let w = words.get(c.wordId)
    if (!w) {
      w = { id: c.wordId, text: c.text, sets: [], patternUnitIds: [], sentence: c.sentence ?? '', syllables: [c.text], tricky: [], caseSensitive: /[A-Z]/.test(c.text), custom: true }
      words.set(w.id, w)
    }
    addToSet(w, 'school')
  }

  const sentences: StorySentence[] = STORY_SENTENCES.map(s => {
    const ids: string[] = []
    for (const raw of s.text.split(/\s+/)) {
      const token = raw.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').replace(/’/g, "'")
      if (!token) continue
      const w = words.get(wordId(token))
      if (!w || !w.sets.some(set => CURRICULUM.includes(set))) continue
      if (w.caseSensitive && token !== w.text) continue
      if (!ids.includes(w.id)) ids.push(w.id)
    }
    return { id: `s-${hashString(s.text).toString(36)}`, text: s.text, level: s.level, wordIds: ids }
  })

  return { words, setIds, units, unitById: new Map(units.map(u => [u.id, u])), sentences, y34Families, hfwOrder }
}

export function getWord(bank: Bank, id: string): Word {
  const w = bank.words.get(id)
  if (!w) throw new Error(`Unknown word id: ${id}`)
  return w
}

export const BUILTIN_BANK: Bank = buildBank()
