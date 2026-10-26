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
    ['Mr', 'mr', 'capital', '"Mr" goes with a name, so it starts with a capital letter.'],
    ['Kent', 'kent', 'capital', 'Names start with a capital letter: "Kent".'],
    ["can't", 'cant', 'apostrophe', '"can\'t" is short for "cannot". The apostrophe shows where letters are missing.'],
    ['patting', 'pating', 'doubling', '"pat" has a short sound and ends in one consonant, so double the "t" before "ing": "patting".'],
    ['hiking', 'hikeing', 'dropE', '"hike" ends in "e", so drop the "e" before "ing": "hiking".'],
    ['happier', 'happyer', 'yToI', 'When "happy" gets "er", the "y" changes to "i": "happier".'],
    ['station', 'stashun', 'ending', 'The "shun" sound at the end of "station" is spelt "tion".'],
    ['friend', 'freind', 'tricky', 'The tricky bit in "friend" is "ie". Remember: a friend to the END.'],
    // Wording the grown-up asked for in the 2026-10-25 review.
    ['are', 'era', 'tricky', 'The whole of "are" is tricky, so learn it by heart.'],
    ['bee', 'be', 'homophone', '"be" means to act or feel a certain way, like be kind. This word is "bee", meaning a buzzing insect that makes honey.'],
  ])('%s typed as %s is a %s mistake', (target, typed, type, template) => {
    expect(classifyMistake(w(target), typed, bank)).toMatchObject({ type, template })
  })

  it('keeps a memory trick out of the part the model rewords', () => {
    expect(classifyMistake(w('friend'), 'freind', bank)).toMatchObject({
      reword: 'The tricky bit in "friend" is "ie".', keep: 'Remember: a friend to the END.',
      template: 'The tricky bit in "friend" is "ie". Remember: a friend to the END.',
    })
    const m = classifyMistake(w('here'), 'hear', bank)!
    expect(m.reword).toBe(m.template)
    expect(m.keep).toBeUndefined()
  })

  it('gives no tip for an empty, correct or far too long attempt', () => {
    for (const typed of ['', '   ', 'because', 'b'.repeat(40)]) expect(classifyMistake(w('because'), typed, bank), typed).toBeNull()
  })

  // AI-written feedback for any wrong spelling: the mistakes the rules can't name get a "letters" mistake.
  it('gives every other wrong spelling a letters tip that names the letters she got wrong', () => {
    expect(classifyMistake(w('because'), 'bicos', bank)).toMatchObject({
      type: 'letters', letters: [{ has: 'e', wrote: 'i' }, { has: 'au', wrote: 'o' }, { has: 'e', wrote: '' }],
      template: 'In "because", you wrote "i" where it has "e", you wrote "o" where it has "au" and you missed out "e".',
    })
    expect(classifyMistake(w('what'), 'wot', bank)).toMatchObject({ type: 'letters', template: 'In "what", you wrote "o" where it has "ha".' })
    expect(classifyMistake(w('busy'), 'bussy', bank)).toMatchObject({ type: 'letters', template: 'In "busy", you added "s".' })
    expect(classifyMistake(w('probably'), 'probly', bank)?.template).toMatch(/^In "probably", you missed out "(ab|ba)"\.$/)
  })

  it('gives a plain look-carefully tip, without the AI, when the attempt is nothing like the word', () => {
    for (const typed of ['xqzt', '!!!']) {
      expect(classifyMistake(w('because'), typed, bank), typed).toMatchObject({
        type: 'letters', plainOnly: true, template: 'Look carefully at each letter of "because".',
      })
    }
  })

  it('lets a tricky-letter tip talk about the letters she wrote', () => {
    const m = classifyMistake(w('friend'), 'freind', bank)!
    expect(m).toMatchObject({ type: 'tricky', letters: [{ has: 'ie', wrote: 'ei' }] })
    expect(m.quotable).toContain('ei')
  })

  it('treats a curly apostrophe and extra spaces like a straight one', () => {
    expect(classifyMistake(w("can't"), '  cant ', bank)?.type).toBe('apostrophe')
    expect(classifyMistake(w("can't"), 'can’t', bank)).toBeNull() // that is correct
  })

  it('finds a silent or tricky letter even when the capital is also wrong', () => {
    expect(classifyMistake(w('Wednesday'), 'wensday', bank)?.type).toBe('tricky')
  })

  it('only gives school-list words the safe kinds of tip: apostrophes and the letters she got wrong', () => {
    const custom = buildBank([{ wordId: 'w-crocodile', text: 'crocodile' }]).words.get('w-crocodile')!
    expect(classifyMistake(custom, 'crocodil', bank)).toMatchObject({ type: 'letters', template: 'In "crocodile", you missed out the end, "e".' })
    expect(classifyMistake(custom, 'crocdile', bank)).toMatchObject({ type: 'letters', template: 'In "crocodile", you missed out "o".' })
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

describe('classifyMistake after the code review', () => {
  it('I2: a part-typed word says she missed out the end', () => {
    expect(classifyMistake(w('because'), 'be', bank)).toMatchObject({ letters: [{ has: 'cause', wrote: '' }], template: 'In "because", you missed out the end, "cause".' })
    expect(classifyMistake(w('Saturday'), 'Sa', bank)?.template).toBe('In "Saturday", you missed out the end, "turday".')
  })
})
