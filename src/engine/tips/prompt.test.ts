import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../../content'
import { wordId } from '../../content/parse'
import { classifyMistake } from './classify'
import { REWORD_SYSTEM, TIP_PROMPT_VERSION, rewordMessages, tipFromReply } from './prompt'

describe('rewordMessages', () => {
  it('asks only to reword the template, with three worked examples', () => {
    const msgs = rewordMessages('X')
    expect(msgs).toHaveLength(8)
    expect(msgs[0]).toEqual({ role: 'system', content: REWORD_SYSTEM })
    expect(REWORD_SYSTEM).toContain('Do not add any new fact, rule, letter, sound or example.')
    expect(REWORD_SYSTEM).toContain('Copy every word in quotation marks exactly, letter for letter.')
    expect(REWORD_SYSTEM).toContain('no lists, headings or line breaks')
    expect(TIP_PROMPT_VERSION).toBe(2)
    expect(msgs.map(x => x.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user'])
    expect(msgs[7].content).toBe('Tip to reword: X')
    // The rule example keeps the root word as given ("hop", not "hopping"): laptop runs 1 and 3 swapped it.
    expect(msgs[6].content).toMatch(/^"hop" has a short sound/)
    expect(bank.words.has(wordId('hop')) || bank.words.has(wordId('hopping'))).toBe(false)
  })

  it('adds the memory trick back after the reworded part, word for word', () => {
    const friend = classifyMistake(bank.words.get(wordId('friend'))!, 'freind', bank)!
    expect(tipFromReply(friend, '  Watch the “ie” in “friend”. ')).toBe('Watch the “ie” in “friend”. Remember: a friend to the END.')
    const here = classifyMistake(bank.words.get(wordId('here'))!, 'hear', bank)!
    expect(tipFromReply(here, ' “here” means this place. ')).toBe('“here” means this place.')
  })
})
