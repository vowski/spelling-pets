import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { freePlayOptions, planFreePlay } from './freeplay'
import { makeState, prog, T } from './testing'

const anchors = new Set(['w-because'])

describe('free play', () => {
  it('needs met words', () => {
    const opts = freePlayOptions(bank, makeState(), anchors)
    expect(opts.find(o => o.game === 'pupPost')).toEqual({ game: 'pupPost', available: false, reason: 'Learn some words first' })
    expect(opts.find(o => o.game === 'sortPen')?.reason).toBe('Finish a spelling pattern first')
  })
  it('plans word games from met words, due first', () => {
    const s = makeState({ progressList: [prog('w-said', { box: 3, due: '2026-12-01', lastSeenAt: 1 }), prog('w-because', { box: 2, due: T }), prog('w-was', { box: 1, due: '2026-10-20' })] })
    expect(planFreePlay(bank, s, 'pupPost', { seed: 1, wheelAnchors: anchors })?.wordIds).toEqual(['w-because', 'w-was', 'w-said'])
    expect(planFreePlay(bank, s, 'wheel', { seed: 1, wheelAnchors: anchors })?.wordIds).toEqual(['w-because'])
  })
  it('uses a started unit for pattern games', () => {
    const units = new Map([['y1-tch', { unitId: 'y1-tch', status: 'learning' as const, startedOn: T, completedOn: null, taughtWordIds: [] }]])
    const a = planFreePlay(bank, makeState({ units, progressList: [prog('w-said', { box: 1 })] }), 'sortPen', { seed: 1, wheelAnchors: anchors })
    expect(a).toMatchObject({ gameType: 'sortPen', unitId: 'y1-tch' })
    expect(planFreePlay(bank, makeState({ units }), 'builder', { seed: 1, wheelAnchors: anchors })).toBeNull()
  })
})
