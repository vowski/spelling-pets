import { describe, it, expect } from 'vitest'
import { REWORD_SYSTEM, rewordMessages } from './prompt'

describe('rewordMessages', () => {
  it('asks only to reword the template, with two worked examples', () => {
    const msgs = rewordMessages('X')
    expect(msgs).toHaveLength(6)
    expect(msgs[0]).toEqual({ role: 'system', content: REWORD_SYSTEM })
    expect(REWORD_SYSTEM).toContain('Do not add any new fact, rule, letter, sound or example.')
    expect(msgs.map(x => x.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user'])
    expect(msgs[5].content).toBe('Tip to reword: X')
  })
})
