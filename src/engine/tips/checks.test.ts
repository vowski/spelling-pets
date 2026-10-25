import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../../content'
import { isBlockedWord } from '../../content/dictionary'
import { wordId } from '../../content/parse'
import { CONTRACTIONS } from '../../content/tipContent'
import { checkTip } from './checks'
import { classifyMistake, type Mistake } from './classify'

const m = (t: string, typed: string) => classifyMistake(bank.words.get(wordId(t))!, typed, bank)!
const deps = { isBlocked: isBlockedWord }

/** One realistic mistake of every kind the word bank allows. */
function everyMistake(): Mistake[] {
  const out: (Mistake | null)[] = []
  for (const u of bank.units) {
    if (u.game.kind !== 'builder') continue
    for (const { parts, word } of u.game.pairs) if (parts.length === 2) out.push(classifyMistake(bank.words.get(wordId(word))!, parts.join(''), bank))
  }
  for (const word of bank.words.values()) {
    for (const other of word.homophoneGroup?.split('/') ?? []) out.push(classifyMistake(word, other, bank))
    if (CONTRACTIONS[word.text.toLowerCase()]) out.push(classifyMistake(word, word.text.replace(/'/g, ''), bank))
    if (word.caseSensitive) out.push(classifyMistake(word, word.text.toLowerCase(), bank))
    for (const [a, b] of word.tricky) out.push(classifyMistake(word, word.text.slice(0, a) + word.text.slice(b), bank))
    for (const e of ['tion', 'sion', 'cian', 'ture', 'sure', 'ous']) if (word.text.endsWith(e)) out.push(classifyMistake(word, word.text.slice(0, -e.length) + 'shun', bank))
  }
  return out.filter((x): x is Mistake => x !== null)
}

describe('checkTip', () => {
  it('passes good rewordings from the laptop test', () => {
    expect(checkTip('“Hear” is what you do with your ears; “here” means this place.', m('here', 'hear'), deps)).toEqual([])
    expect(checkTip('When “happy” gets “er”, the “y” changes to “i”: “happier”.', m('happier', 'happyer'), deps)).toEqual([])
  })

  it.each([
    ['friend', 'freind', 'Friend is spelt "freind".'],
    ['here', 'hear', '"Listen" is what you do with your ears. This word is "here", referring to this place.'],
    ['hiking', 'hikeing', 'Hope means wanting to do something. It is "hiking" when you go walking.'],
    ['here', 'hear', 'I think "here" means this place.'],
    ['here', 'hear', 'Great job! "here" means this place.'],
    ['here', 'hear', '"here" is the color of this place.'],
    ['here', 'hear', '"here" means this place.\n\nAnd more.'],
    ['here', 'hear', Array(30).fill('"here"').join(' ')],
  ])('rejects a bad tip for %s/%s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps).length).toBeGreaterThan(0)
  })

  it('every template passes its own checks', () => {
    const all = everyMistake()
    expect(all.length).toBeGreaterThan(150)
    expect(new Set(all.map(x => x.type))).toEqual(new Set(['capital', 'homophone', 'apostrophe', 'doubling', 'dropE', 'yToI', 'ending', 'tricky']))
    for (const mistake of all) expect(checkTip(mistake.template, mistake, deps), `${mistake.target}/${mistake.attempt}: ${mistake.template}`).toEqual([])
  })
})
