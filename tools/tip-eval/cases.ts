// Mistakes for the on-laptop tip evaluation: hand-picked ones from the first laptop test, plus a spread of every kind
// generated from the word bank. Each case must classify; tools/tip-eval/cases.test.ts checks that.
import { BUILTIN_BANK, type Bank } from '../../src/content'
import { CONTRACTIONS } from '../../src/content/tipContent'
import { classifyMistake, type MistakeType } from '../../src/engine/tips/classify'

export interface EvalCase { wordId: string; typed: string }

const HAND: EvalCase[] = [
  { wordId: 'w-here', typed: 'hear' }, { wordId: 'w-there', typed: 'their' }, { wordId: 'w-because', typed: 'becos' },
  { wordId: 'w-happier', typed: 'happyer' }, { wordId: 'w-friend', typed: 'freind' }, { wordId: 'w-wednesday', typed: 'wensday' },
  { wordId: 'w-station', typed: 'stashun' }, { wordId: 'w-monday', typed: 'monday' }, { wordId: 'w-people', typed: 'pepul' },
  { wordId: 'w-can-t', typed: 'cant' }, { wordId: 'w-said', typed: 'sed' }, { wordId: 'w-february', typed: 'Febuary' },
]
const SOUNDED: Record<string, string> = { ssion: 'shun', tion: 'shun', cian: 'shun', sion: 'zhun', ture: 'cher', sure: 'zher', ous: 'us' }
const QUOTA = 7

function generated(bank: Bank): EvalCase[] {
  const words = [...bank.words.values()]
  const out: EvalCase[] = []
  const add = (wordId: string, typed: string) => out.push({ wordId, typed })
  // capitals: days, I-words, others
  for (const w of words.filter(w => w.sets.includes('days')).slice(0, 3)) add(w.id, w.text.toLowerCase())
  for (const w of words.filter(w => /^I('|$)/.test(w.text)).slice(0, 2)) add(w.id, w.text.toLowerCase())
  for (const w of words.filter(w => w.caseSensitive && !w.sets.includes('days') && !/^I('|$)/.test(w.text)).slice(0, 2)) add(w.id, w.text.toLowerCase())
  // homophones: one mix-up from each of 8 groups
  const groups = [...new Set(words.map(w => w.homophoneGroup).filter((g): g is string => !!g))].slice(0, 8)
  for (const g of groups) {
    const [a, b] = g.split('/')
    const target = words.find(w => w.text.toLowerCase() === b)
    if (target) add(target.id, a)
  }
  // apostrophes
  for (const w of words.filter(w => CONTRACTIONS[w.text.toLowerCase()]).slice(0, QUOTA)) add(w.id, w.text.replace(/'/g, ''))
  // suffix rules, from the builder units
  const byKind: Record<string, EvalCase[]> = { doubling: [], dropE: [], yToI: [] }
  for (const u of bank.units) {
    if (u.game.kind !== 'builder') continue
    for (const { parts, word } of u.game.pairs) {
      if (parts.length !== 2) continue
      const w = bank.words.get(words.find(x => x.text === word)?.id ?? '')
      if (!w) continue
      const m = classifyMistake(w, parts.join(''), bank)
      if (m && m.type in byKind) byKind[m.type].push({ wordId: w.id, typed: parts.join('') })
    }
  }
  for (const list of Object.values(byKind)) out.push(...list.slice(0, QUOTA))
  // endings: up to two of each ending
  const perEnding = new Map<string, number>()
  for (const w of words) {
    const e = Object.keys(SOUNDED).find(x => w.text.endsWith(x))
    if (!e || (perEnding.get(e) ?? 0) >= 2) continue
    const typed = w.text.slice(0, -e.length) + SOUNDED[e]
    if (classifyMistake(w, typed, bank)?.type !== 'ending') continue
    perEnding.set(e, (perEnding.get(e) ?? 0) + 1)
    add(w.id, typed)
  }
  // tricky parts: swap the tricky letters (or drop a single one) in curriculum tricky words
  let tricky = 0
  for (const w of words.filter(w => w.sets.some(s => s === 'y1cew' || s === 'y2cew' || s === 'y34'))) {
    if (tricky >= QUOTA + 1 || !w.tricky.length) continue
    const [a, b] = w.tricky[0]
    const bit = w.text.slice(a, b)
    const changed = bit.length > 1 ? [...bit].reverse().join('') : ''
    if (changed === bit) continue
    const typed = w.text.slice(0, a) + changed + w.text.slice(b)
    if (classifyMistake(w, typed, bank)?.type !== 'tricky') continue
    add(w.id, typed)
    tricky++
  }
  return out
}

function build(bank: Bank): EvalCase[] {
  const seen = new Set<string>()
  const all: EvalCase[] = []
  for (const c of [...HAND, ...generated(bank)]) {
    const key = `${c.wordId}|${c.typed}`
    const w = bank.words.get(c.wordId)
    if (seen.has(key) || !w || !classifyMistake(w, c.typed, bank)) continue
    seen.add(key)
    all.push(c)
  }
  return all
}

export const EVAL_CASES: EvalCase[] = build(BUILTIN_BANK)
export const EVAL_TYPES: MistakeType[] = ['capital', 'homophone', 'apostrophe', 'doubling', 'dropE', 'yToI', 'ending', 'tricky']
