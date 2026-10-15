import { describe, it, expect } from 'vitest'
import { checkWord, checkSentence, normalise } from './checker'

const w = (text: string) => ({ text, caseSensitive: /[A-Z]/.test(text) })
const cs = (t: string) => ['Monday', 'I', "I'm", 'Mr', 'Mrs', 'February'].includes(t)

describe('normalise', () => {
  it('straightens quotes and squashes spaces', () => {
    expect(normalise('  don’t   go ')).toBe("don't go")
  })
})

describe('checkWord', () => {
  it('accepts an exact answer', () => {
    expect(checkWord(w('because'), 'because')).toMatchObject({ correct: true, capitalOnly: false })
  })
  // Review Focus #1: messy typing
  it.each([
    ['because', '  because  '],
    ['because', 'Because'],
    ['because', 'BECAUSE'],
    ["don't", 'don’t'],
    ["don't", 'DON’T'],
    ['Monday', 'MONDAY'],
    ['Monday', ' Monday '],
  ])('accepts %s typed as %j', (target, typed) => {
    expect(checkWord(w(target), typed).correct).toBe(true)
  })
  it('flags a missing capital on a case-sensitive word', () => {
    expect(checkWord(w('Monday'), 'monday')).toMatchObject({ correct: false, capitalOnly: true })
    expect(checkWord(w('I'), 'i')).toMatchObject({ correct: false, capitalOnly: true })
  })
  it('marks a misspelling wrong with letter ops', () => {
    const r = checkWord(w('because'), 'becuase')
    expect(r.correct).toBe(false)
    expect(r.capitalOnly).toBe(false)
    expect(r.typed).toBe('becuase')
    expect(r.ops.filter(o => o.kind !== 'match')).toHaveLength(2)
  })
  it('treats empty input as wrong', () => {
    expect(checkWord(w('was'), '   ').correct).toBe(false)
  })
})

describe('checkSentence', () => {
  it('scores words, capital and full stop', () => {
    const r = checkSentence('The children went to school.', 'the children went to scool', cs)
    expect(r.startsWithCapital).toBe(false)
    expect(r.endsWithPunctuation).toBe(false)
    expect(r.words.map(x => x.correct)).toEqual([true, true, true, true, false])
    expect(r.words[4]).toEqual({ expected: 'school', typed: 'scool', correct: false })
    expect(r.wordAccuracy).toBeCloseTo(0.8)
    expect(r.allCorrect).toBe(false)
  })
  it('needs capitals on proper nouns and I', () => {
    const r = checkSentence('On Monday I went out.', 'On monday i went out.', cs)
    expect(r.words.map(x => x.correct)).toEqual([true, false, false, true, true])
  })
  it('reports a missing word as typed null', () => {
    const r = checkSentence('I like my dog.', 'I like dog.', cs)
    expect(r.words[2]).toEqual({ expected: 'my', typed: null, correct: false })
  })
  it('accepts curly apostrophes and matching end punctuation', () => {
    const r = checkSentence("It's my friend's book.", 'It’s my friend’s book.', cs)
    expect(r.allCorrect).toBe(true)
  })
  it('needs the same end mark as the model sentence', () => {
    expect(checkSentence('Where is my hat?', 'Where is my hat.', cs).endsWithPunctuation).toBe(false)
    expect(checkSentence('Where is my hat?', 'Where is my hat?', cs).endsWithPunctuation).toBe(true)
  })
  it('accepts Caps Lock sentences for words and capital start', () => {
    const r = checkSentence('The dog ran.', 'THE DOG RAN.', cs)
    expect(r.allCorrect).toBe(true)
  })
})
