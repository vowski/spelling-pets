import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { FREE_PLAY_GAMES, freePlayOptions, planFreePlay } from './freeplay'
import { makeState, prog, T } from './testing'

const anchors = new Set(['w-because'])

describe('free play', () => {
  it('offers every game from a starter set before she has learned anything, as practice only', () => {
    const s = makeState()
    expect(freePlayOptions(bank, s, anchors).every(o => o.available)).toBe(true)
    for (const game of FREE_PLAY_GAMES) {
      const a = planFreePlay(bank, s, game, { seed: 3, wheelAnchors: anchors })
      expect(a, game).toMatchObject({ gameType: game, practiceOnly: true })
      expect(a!.wordIds.length, game).toBeGreaterThan(0)
      expect(a!.wordIds.every(id => bank.words.has(id)), game).toBe(true)
    }
    expect(planFreePlay(bank, s, 'sortPen', { seed: 3, wheelAnchors: anchors })?.unitId).toBeDefined()
    expect(planFreePlay(bank, s, 'storyTime', { seed: 3, wheelAnchors: anchors })?.sentenceIds).toHaveLength(3)
    expect(planFreePlay(bank, s, 'wheel', { seed: 3, wheelAnchors: anchors })?.wordIds).toEqual(['w-because'])
  })
  it('plans word games from met words, due first', () => {
    const s = makeState({ progressList: [prog('w-said', { box: 3, due: '2026-12-01', lastSeenAt: 1 }), prog('w-because', { box: 2, due: T }), prog('w-was', { box: 1, due: '2026-10-20' })] })
    expect(planFreePlay(bank, s, 'pupPost', { seed: 1, wheelAnchors: anchors })?.wordIds).toEqual(['w-because', 'w-was', 'w-said'])
    expect(planFreePlay(bank, s, 'wheel', { seed: 1, wheelAnchors: anchors })?.wordIds).toEqual(['w-because'])
  })
  it('gives Word Wheel a puzzle from any of her words, not the same one every time', () => {
    const wheelWords = ['w-today', 'w-said', 'w-because', 'w-was', 'w-they', 'w-people']
    const s = makeState({ progressList: wheelWords.map((id, i) => prog(id, { box: 3, due: '2026-12-01', lastSeenAt: i })) })
    const chosen = new Set(Array.from({ length: 30 }, (_, seed) => planFreePlay(bank, s, 'wheel', { seed, wheelAnchors: new Set(wheelWords) })!.wordIds[0]))
    expect(chosen.size).toBeGreaterThanOrEqual(4)
    for (const id of chosen) expect(wheelWords).toContain(id)
  })

  it('never gives the Word Wheel puzzle she has just played when there is another', () => {
    const wheelWords = ['w-today', 'w-said']
    const s = makeState({ progressList: wheelWords.map(id => prog(id, { box: 3 })) })
    for (let seed = 0; seed < 20; seed++) {
      expect(planFreePlay(bank, s, 'wheel', { seed, wheelAnchors: new Set(wheelWords), avoid: ['w-today'] })!.wordIds).toEqual(['w-said'])
    }
    const one = makeState({ progressList: [prog('w-today', { box: 3 })] })
    expect(planFreePlay(bank, one, 'wheel', { seed: 1, wheelAnchors: new Set(['w-today']), avoid: ['w-today'] })!.wordIds).toEqual(['w-today'])
  })

  it('uses a started unit for pattern games', () => {
    const units = new Map([['y1-tch', { unitId: 'y1-tch', status: 'learning' as const, startedOn: T, completedOn: null, taughtWordIds: [] }]])
    const a = planFreePlay(bank, makeState({ units, progressList: [prog('w-said', { box: 1 })] }), 'sortPen', { seed: 1, wheelAnchors: anchors })
    expect(a).toMatchObject({ gameType: 'sortPen', unitId: 'y1-tch' })
    expect(planFreePlay(bank, makeState({ units }), 'builder', { seed: 1, wheelAnchors: anchors })).toMatchObject({ practiceOnly: true })
  })
})
