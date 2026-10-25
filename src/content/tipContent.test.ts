import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from './index'
import { isBlockedWord } from './dictionary'
import { HOMOPHONE_GLOSSES, MEMORY_TRICKS, CONTRACTIONS } from './tipContent'

const AMERICAN = /\b(color|favorite|realize|center|mom|gray|neighbor)\b/i

describe('tip content', () => {
  it('has a short, British, child-safe gloss for every member of every homophone group', () => {
    const members = new Set([...bank.words.values()].flatMap(w => w.homophoneGroup?.split('/') ?? []))
    expect(members.size).toBeGreaterThan(40)
    for (const m of members) {
      const g = HOMOPHONE_GLOSSES[m]
      expect(g, m).toBeTruthy()
      expect(g.split(/\s+/).length, m).toBeLessThanOrEqual(8)
      expect(g, m).not.toMatch(/\.$|^[A-Z]/)
      expect(AMERICAN.test(g), m).toBe(false)
      for (const w of g.split(/\W+/).filter(Boolean)) expect(isBlockedWord(w), `${m}: ${w}`).toBe(false)
    }
    expect(HOMOPHONE_GLOSSES.here).toBe('this place')
    expect(HOMOPHONE_GLOSSES.hear).toBe('listen with your ears')
  })

  it('only has memory tricks for real words', () => {
    for (const id of Object.keys(MEMORY_TRICKS)) expect(bank.words.has(id), id).toBe(true)
    expect(MEMORY_TRICKS['w-friend']).toBe('Remember: a friend to the END.')
  })

  it('lists what every bank contraction is short for', () => {
    const contractions = [...bank.words.values()].map(w => w.text).filter(t => (/'(t|s|m|ll|re|ve|d)$/.test(t) && !/'s$/.test(t)) || ["it's", "who's"].includes(t))
    expect(contractions.length).toBeGreaterThan(8)
    for (const c of contractions) expect(CONTRACTIONS[c.toLowerCase()], c).toBeTruthy()
    expect(CONTRACTIONS["can't"]).toBe('cannot')
    expect(CONTRACTIONS["it's"]).toBe('it is')
    expect(CONTRACTIONS["i'm"]).toBe('I am') // the pronoun keeps its capital
  })
})
