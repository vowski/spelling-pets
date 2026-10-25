import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank, buildBank } from '../../content'
import { wordId } from '../../content/parse'
import { classifyMistake, type MistakeType } from './classify'

const w = (t: string) => bank.words.get(wordId(t))!

describe('classifyMistake', () => {
  it.each([
    ['here', 'hear', 'homophone', '"hear" means listen with your ears. This word is "here", meaning this place.'],
    ['here', 'HEAR', 'homophone', '"hear" means listen with your ears. This word is "here", meaning this place.'],
    ['Monday', 'monday', 'capital', 'Days of the week always start with a capital letter: "Monday".'],
    ["can't", 'cant', 'apostrophe', '"can\'t" is short for "cannot". The apostrophe shows where letters are missing.'],
    ['patting', 'pating', 'doubling', '"pat" has a short sound and ends in one consonant, so double the "t" before "ing": "patting".'],
    ['hiking', 'hikeing', 'dropE', '"hike" ends in "e". Drop the "e" before adding "ing" to make "hiking".'],
    ['happier', 'happyer', 'yToI', 'When "happy" gets "er", the "y" changes to "i": "happier".'],
    ['station', 'stashun', 'ending', 'The "shun" sound at the end of "station" is spelt "tion".'],
    ['friend', 'freind', 'tricky', 'The tricky bit in "friend" is "ie". Remember: a friend to the END.'],
  ])('%s typed as %s is a %s mistake', (target, typed, type, template) => {
    expect(classifyMistake(w(target), typed, bank)).toMatchObject({ type, template })
  })

  it('gives no tip when it cannot tell what went wrong', () => {
    for (const typed of ['', '   ', 'xqzt', 'because', 'b'.repeat(40), '!!!']) expect(classifyMistake(w('because'), typed, bank), typed).toBeNull()
  })

  it('treats a curly apostrophe and extra spaces like a straight one', () => {
    expect(classifyMistake(w("can't"), '  cant ', bank)?.type).toBe('apostrophe')
    expect(classifyMistake(w("can't"), 'can’t', bank)).toBeNull() // that is correct
  })

  it('finds a silent or tricky letter even when the capital is also wrong', () => {
    expect(classifyMistake(w('Wednesday'), 'wensday', bank)?.type).toBe('tricky')
  })

  it('only gives school-list words the safe kinds of tip', () => {
    const custom = buildBank([{ wordId: 'w-crocodile', text: 'crocodile' }]).words.get('w-crocodile')!
    expect(classifyMistake(custom, 'crocodil', bank)).toBeNull()
  })

  it('classifies the wrong form of every suffix pair in the word bank', () => {
    let checked = 0
    for (const u of bank.units) {
      if (u.game.kind !== 'builder') continue
      for (const { parts, word: target } of u.game.pairs) {
        if (parts.length !== 2) continue
        const [root, suffix] = parts
        const expected: MistakeType | null =
          target === root + root.at(-1) + suffix ? 'doubling'
            : root.endsWith('e') && target === root.slice(0, -1) + suffix ? 'dropE'
              : root.endsWith('y') && target === root.slice(0, -1) + 'i' + suffix ? 'yToI'
                : null
        if (!expected) continue
        expect(classifyMistake(w(target), root + suffix, bank)?.type, `${target} ← ${root + suffix}`).toBe(expected)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('classifies every homophone mix-up in the word bank', () => {
    let checked = 0
    for (const word of bank.words.values()) {
      for (const other of word.homophoneGroup?.split('/') ?? []) {
        if (other === word.text.toLowerCase()) continue
        expect(classifyMistake(word, other, bank)?.type, `${word.text} ← ${other}`).toBe('homophone')
        checked++
      }
    }
    expect(checked).toBeGreaterThan(50)
  })
})
