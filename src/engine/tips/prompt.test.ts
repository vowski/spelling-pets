import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../../content'
import { wordId } from '../../content/parse'
import { classifyMistake } from './classify'
import { FEEDBACK_EXAMPLES, FEEDBACK_SYSTEM, TIP_PROMPT_VERSION, feedbackMessages, feedbackNotes, tipFromReply } from './prompt'

const mistake = (t: string, typed: string) => classifyMistake(bank.words.get(wordId(t))!, typed, bank)!

describe('feedbackMessages', () => {
  it('asks the model to write the feedback itself from notes, with one worked example of the same kind', () => {
    const msgs = feedbackMessages(mistake('because', 'bicos'))
    expect(TIP_PROMPT_VERSION).toBe(3)
    expect(msgs.map(x => x.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(msgs[0].content).toBe(FEEDBACK_SYSTEM)
    expect(FEEDBACK_SYSTEM).toContain('never tell her that what she wrote was right')
    expect(FEEDBACK_SYSTEM).toContain('Do not add any fact, rule, letter, sound or example that is not in the notes')
    const kind = (notes: string) => notes.split('\n').find(l => l.startsWith('Kind of mistake:'))
    expect(kind(msgs[1].content)).toBe(kind(msgs[3].content))
  })

  it('tells the model what she did, using the letters she actually wrote', () => {
    expect(feedbackNotes(mistake('because', 'bicos'))).toContain('What she did: She wrote "i" where the word has "e". She wrote "o" where the word has "au". She missed out "e".')
    const friend = feedbackNotes(mistake('friend', 'freind'))
    expect(friend).toContain('She wrote "ei" where the word has "ie".')
    expect(friend).toContain('- The tricky bit in "friend" is "ie".')
    expect(friend).not.toContain('Remember') // the memory trick is added back afterwards, word for word
    expect(feedbackNotes(mistake('patting', 'pating'))).toContain('What she did: She wrote only one "t" before "ing".')
  })

  it('has a worked example for every kind of mistake, and none uses a word from her word bank', () => {
    expect(Object.keys(FEEDBACK_EXAMPLES).sort()).toEqual(['apostrophe', 'capital', 'doubling', 'dropE', 'ending', 'homophone', 'letters', 'tricky', 'yToI'])
    for (const [notes] of Object.values(FEEDBACK_EXAMPLES)) {
      const word = /The correct word: "(.+)"/.exec(notes)![1]
      expect(bank.words.has(wordId(word)), word).toBe(false)
    }
  })
})

describe('tipFromReply', () => {
  it('adds the memory trick back after the model\'s part, word for word', () => {
    expect(tipFromReply(mistake('friend', 'freind'), '  Watch the “ie” in “friend”. ')).toBe('Watch the “ie” in “friend”. Remember: a friend to the END.')
    expect(tipFromReply(mistake('here', 'hear'), ' “here” means this place. ')).toBe('“here” means this place.')
  })
})
