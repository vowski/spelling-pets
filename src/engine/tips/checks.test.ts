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

  it.each([
    ['because', 'bicos', 'You wrote "e" where "because" has "i".'],
    ['friend', 'freind', 'You wrote "ie", but "friend" has "ei".'],
    ['what', 'wot', 'You missed out "o" in "what".'],
  ])('rejects AI feedback that gets her letters backwards: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).toContain('gets her letters backwards')
  })

  it.each([
    ['do', 'd', 'You missed out the “o”. “Do” is tricky because it’s a vowel sound.'],
    ['the', 'th', 'You missed out the “e”. “The” is tricky because it’s a special word.'],
  ])('rejects a made-up reason (laptop run of 2026-10-26): %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).toContain('adds a reason')
  })

  it.each([
    ['friend', 'frend', 'You missed the “ie” in “friend”. “Friend” has a tricky “ie” part. Remember: a friend to the END.'],
    ['school', 'scool', 'You missed out the “ch”. “School” has a tricky “ch” sound.'],
    ['knowledge', 'nolege', 'You missed out the “k” and the “dge”. “Knowledge” has “k” and “dge” in it.'],
    ['thought', 'thort', 'You wrote “r” where “ough” should be. “Thought” has “ough”, so pay attention to the letters.'],
  ])('rejects letter claims that do not match what she wrote (laptop run of 2026-10-26): %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).toContain('gets her letters wrong')
  })

  it('accepts true letter claims, and "because" when it is the spelling word', () => {
    expect(checkTip('You missed out the “h”. “School” has a tricky “ch” sound.', m('school', 'scool'), deps)).toEqual([])
    const because = 'You wrote “o” where “au” should be in “because”. Remember: Big Elephants Can Always Understand Small Elephants.'
    expect(checkTip(because, m('because', 'becos'), deps)).toEqual([])
  })

  it('lets an ending tip talk about the letters she wrote when she did not spell it the way it sounds (laptop run of 2026-10-26)', () => {
    const reply = 'You wrote “s” where the word has “t”, the “shun” sound at the end of “station” is spelt “tion”.'
    expect(checkTip(reply, m('station', 'stasion'), deps)).toEqual([])
    expect(checkTip('You wrote “t” where the word has “s”. The “shun” sound at the end of “station” is spelt “tion”.', m('station', 'stasion'), deps)).toContain('gets her letters backwards')
  })

  it('rejects a letters tip that says nothing about her letters', () => {
    expect(checkTip('"because" is a tricky word, so learn it well.', m('because', 'bicos'), deps)).toContain('says nothing about her letters')
  })

  it('accepts AI feedback about her letters, and does not count the memory trick towards the length', () => {
    expect(checkTip('You wrote "o", but "what" has "ha" there.', m('what', 'wot'), deps)).toEqual([])
    const tricky = 'You wrote "ei". The tricky bit in "friend" is "ie", so look carefully at it. Remember: a friend to the END.'
    expect(checkTip(tricky, m('friend', 'freind'), deps)).toEqual([])
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

// Code review of 2026-10-26: replies a small model could plausibly write, which must never reach her.
describe('checkTip after the code review', () => {
  it.each([
    ['said', 'sed', 'You wrote ‘ai’ where ‘e’ should be. “Said” has an “ai” – that’s the tricky part. Remember: Sally Ann Is Dancing.'],
    ['come', 'cum', 'You wrote ‘u’ instead of ‘e’. “Come” has an “o”, so you need to put the ‘e’ back.'],
    ['which', 'wich', 'You added the ‘h’ in “which”. Look at the “h”.'],
    ['friend', 'freind', 'You wrote ‘ie’ instead of ‘ei’. “ie” is the tricky part of “friend”. Remember: a friend to the END.'],
    ['busy', 'bussy', 'You missed out \'s\' in "busy". Look at the "s".'],
  ])('C1: rejects a false letter claim in single quotes: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).not.toEqual([])
  })

  it.each([
    ['come', 'cum', 'You wrote “u” instead of “o”. “Come” has an “o”, so take the ‘e’ off.'],
    ['which', 'wich', 'You missed “h” in “which”. It’s important to leave out the ‘h’.'],
    ['because', 'bicos', 'In “because”, use “i” instead of “e”.'],
    ['because', 'bicos', 'In “because”, the “e” should be an “i”.'],
    ['because', 'bicos', 'Change the “e” to an “i” in “because”.'],
    ['because', 'bicos', 'You used “e” instead of “i” in “because”.'],
    ['what', 'wot', 'In “what”, the “ha” should be “o”.'],
    ['because', 'bicos', 'You wrote “o”, but “because” has an “e” there.'],
    ['where', 'wear', 'You wrote “ar”, but “where” has “h” there.'],
    ['because', 'bicos', 'You wrote “i” where the word has “au”. It is “because”.'],
    ['busy', 'bussy', 'You added "s". "busy" is spelt with a double "s".'],
    ['happy', 'hapy', 'You missed out “p”. “happy” has three “p” letters.'],
    ['which', 'wich', 'You missed the “h”. “which” is spelt w-i-c-h.'],
  ])('C2: rejects a letter claim it cannot verify, or one that teaches the misspelling: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).not.toEqual([])
  })

  it('rejects a claim that she wrote some letters instead of the whole word (laptop run of 2026-10-26)', () => {
    const reply = 'You wrote “po” instead of “people”. ‘eo’ is the tricky part of ‘people’. Remember: People Eat Orange Peel Like Elephants.'
    expect(checkTip(reply, m('people', 'pepole'), deps)).toContain('gets her letters wrong')
  })

  it('accepts "put the … back" for a letter she missed', () => {
    expect(checkTip('You wrote “u” instead of “o”. “Some” has an ‘o’, so put the ‘e’ back.', m('some', 'sum'), deps)).toEqual([])
  })

  it.each([
    ['which', 'wich', 'You spelt “which” correctly, but missed the “h”.'],
    ['friend', 'freind', 'You got the “ie” right in “friend”. Remember: a friend to the END.'],
    ['station', 'stasion', 'The “shun” sound at the end of “station” is spelt “tion”, and you wrote it right.'],
    ['which', 'wich', 'Wrong! You missed the “h” in “which”.'],
    ['which', 'wich', 'Silly you, you missed the “h” in “which”.'],
    ['which', 'wich', 'Nice try! You missed the “h” in “which”.'],
    ['which', 'wich', 'Super! You missed the “h” in “which”.'],
    ['which', 'wich', 'Perfect! You missed the “h” in “which”.'],
    ['which', 'wich', 'Excellent spelling. You missed the “h” in “which”.'],
  ])('I1: rejects telling her she was right, praise and harsh words: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).not.toEqual([])
  })

  it.each([
    ['probably', 'probly', 'You missed out “ba” in “probably”, just like basket.'],
    ['which', 'wich', 'You missed the “h” in “which”. The h is silent so you cannot hear it.'],
  ])('rejects the worked example\'s word and made-up rules: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).not.toEqual([])
  })

  it.each([
    ['library', 'libary', 'You missed the ‘r’ in “library”.'],
    ['what', 'wot', 'You wrote “o” where “what” has “ha”.'],
    ['minute', 'minit', 'You wrote “i” where “minute” has “u”, and you missed out “e”.'],
    ['because', 'bicos', 'You wrote “i” where “because” has “e”, and “o” where it has “au”.'],
    ['said', 'seid', 'You wrote “e” where “a” should be. “Said” has a tricky “ai” sound. Remember: Sally Ann Is Dancing.'],
  ])('C1/I3: accepts true letter claims, in single quotes or naming the word: %s / %s', (t, typed, text) => {
    expect(checkTip(text, m(t, typed), deps)).toEqual([])
  })
})
