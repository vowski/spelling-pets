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

  it.each([
    ['here', 'hear', '"hear" means this place. This word is "here", meaning listen with your ears.'],
    ['says', 'syas', 'In "says", the y comes before the a.'],
    ['station', 'stashun', 'At the end of "station", the shun sound is spelt sion.'],
    ['patting', 'pating', '"pat" has a long sound, so you do not double the "t" before "ing": "patting".'],
    ['hiking', 'hikeing', '"hike" ends in "e", so keep the "e" and do not drop it before "ing": "hiking".'],
    ['Monday', 'monday', 'Days of the week never need a capital letter: "Monday".'],
    ['happier', 'happyer', 'When "happy" gets "er", the "i" changes to "y": "happier".'],
    ['says', 'syas', 'In “says”, the tricky letters are \'ya\'.'],
  ])('rejects a false rewording the first checks let through (review I5): %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).not.toEqual([])
  })

  it('accepts a sound-alike tip that explains the correct word first', () => {
    expect(checkTip('“Here” means this place; “hear” means listen with your ears.', m('here', 'hear'), deps)).toEqual([])
  })

  it('fails a rule tip that names the wrong root word (laptop run 1)', () => {
    const text = '“Dropping” has a short sound and ends in one consonant, so double the “p” before “ing”: “dropping”.'
    expect(checkTip(text, m('dropping', 'droping'), deps)).toContain('drops the key fact: "drop"')
  })

  it('fails a tricky-word tip that garbles the memory trick (laptop run 1)', () => {
    expect(checkTip('February is “ru”. Let’s look at it: February, ru.', m('February', 'Febuary'), deps)).toContain('drops the key fact: feb-ru-ar-y')
    expect(checkTip('“ai” is tricky in “said”, remember, Sally Ann is Dancing.', m('said', 'sed'), deps)).toEqual([])
  })

  it('rejects the American full stop after Mr and Mrs (laptop run 2)', () => {
    expect(checkTip('Mrs. goes with a name, so it starts with a capital letter.', m('Mrs', 'mrs'), deps)).toContain('American spelling')
  })

  it('every template passes its own checks', () => {
    const all = everyMistake()
    expect(all.length).toBeGreaterThan(150)
    expect(new Set(all.map(x => x.type))).toEqual(new Set(['capital', 'homophone', 'apostrophe', 'doubling', 'dropE', 'yToI', 'ending', 'tricky', 'letters']))
    for (const mistake of all) expect(checkTip(mistake.template, mistake, deps), `${mistake.target}/${mistake.attempt}: ${mistake.template}`).toEqual([])
  })
})
