import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { planSession, choosePlayGame, itemCount, unitGameType, GAME_META } from './planner'
import { buildPlacementPlan } from './placement'
import { addDays, dayNumber } from './dates'
import { makeRng } from './rng'
import { makeState, prog, T } from './testing'
import type { LearnerState, PlacementLevelState } from './types'

const doneLevels = (): PlacementLevelState[] => buildPlacementPlan(bank, 1).map(l => ({ ...l, status: 'done' as const }))
const anchors = new Set<string>()
const evenDay = dayNumber(T) % 2 === 0 ? T : addDays(T, 1)
const oddDay = dayNumber(T) % 2 === 1 ? T : addDays(T, 1)
const games = (s: LearnerState, seed = 1) => planSession(bank, s, { seed, wheelAnchors: anchors }).activities.map(a => a.gameType)

describe('planSession', () => {
  it('builds placement on first ever run and serves the first chunk', () => {
    const plan = planSession(bank, makeState(), { seed: 9, wheelAnchors: anchors })
    expect(plan.kind).toBe('placement')
    expect(plan.placementInit).toHaveLength(5)
    expect(plan.activities[0]).toMatchObject({ gameType: 'treasureHunt' })
    expect(plan.activities[0].wordIds).toHaveLength(12)
    expect(plan.activities[1]).toMatchObject({ practiceOnly: true })
    expect(plan.activities[1].wordIds).toHaveLength(5)
  })

  it('continues placement while it is in progress', () => {
    const levels = buildPlacementPlan(bank, 2)
    const plan = planSession(bank, makeState({ placement: levels }), { seed: 1, wheelAnchors: anchors })
    expect(plan.kind).toBe('placement')
    expect(plan.placementInit).toBeUndefined()
  })

  it('plans a words day: warm-up, workshop, play, quick check, finale', () => {
    const s = makeState({
      today: evenDay, placement: doneLevels(), lastNewKind: 'unit',
      progressList: [prog('w-said', { box: 2, due: evenDay }), prog('w-was', { box: 4, due: '2026-12-01' })],
    })
    const plan = planSession(bank, s, { seed: 3, wheelAnchors: anchors })
    const kinds = plan.activities.map(a => a.gameType)
    expect(kinds[0]).toBe('pupPost')
    expect(kinds[1]).toBe('workshop')
    expect(['wombat', 'bunnyHop', 'burrow', 'bubblePop']).toContain(kinds[2])
    expect(kinds[3]).toBe('pupPost')
    expect(plan.activities[1].wordIds).toHaveLength(4)
    expect(plan.activities[3].wordIds.slice(0, 4)).toEqual(plan.activities[1].wordIds)
    expect(plan.activities[3].wordIds.at(-1)).toBe('w-was') // finale appended to the unconditional quick check
    expect(plan.newMaterial.kind).toBe('words')
  })

  it('plans unit day 1 with a check first and conditional teaching', () => {
    const s = makeState({ today: evenDay, placement: doneLevels(), lastNewKind: 'words', progressList: [prog('w-was', { box: 4, due: '2026-12-01' })] })
    const plan = planSession(bank, s, { seed: 3, wheelAnchors: anchors })
    const acts = plan.activities
    expect(acts.map(a => a.gameType)).toEqual(['unitCheck', 'workshop', 'builder', 'pupPost', 'wombat'])
    expect(acts[0]).toMatchObject({ unitId: 'y3-revise-suffixes', unitDay: 1 })
    expect(acts[0].wordIds).toHaveLength(3)
    expect(acts[1].onlyIfUnitNotKnown).toBe(true)
    expect(acts[2].onlyIfUnitNotKnown).toBe(true)
    expect(acts[3].onlyIfUnitNotKnown).toBe(true)
    expect(acts[4]).toMatchObject({ finale: true, wordIds: ['w-was'] })
  })

  it('turns a test-tomorrow list into a practice test', () => {
    const items = ['because', 'friend'].map(w => ({ text: w, wordId: `w-${w}` }))
    const s = makeState({ placement: doneLevels(), schoolLists: [{ id: 'l', createdAt: T, testDate: addDays(T, 1), items }], progressList: items.map(i => prog(i.wordId, { box: 1, due: T })) })
    const first = planSession(bank, s, { seed: 1, wheelAnchors: anchors }).activities[0]
    expect(first).toMatchObject({ gameType: 'pupPost', practiceTest: true, wordIds: ['w-because', 'w-friend'] })
  })

  it('uses Story Time for the warm-up on odd days when a fully-known sentence exists', () => {
    const sentence = bank.sentences.find(s => s.level === 1)!
    const s = makeState({ today: oddDay, placement: doneLevels(), lastNewKind: 'unit', progressList: sentence.wordIds.map(id => prog(id, { box: 2, due: oddDay })) })
    const first = planSession(bank, s, { seed: 1, wheelAnchors: anchors }).activities[0]
    expect(first.gameType).toBe('storyTime')
    expect(first.sentenceIds!.length).toBeGreaterThanOrEqual(1)
  })

  it('never puts the same game twice in a row', () => {
    for (let d = 0; d < 8; d++) {
      for (const lastNewKind of ['words', 'unit'] as const) {
        const today = addDays(T, d)
        const s = makeState({ today, placement: doneLevels(), lastNewKind, progressList: [prog('w-said', { box: 2, due: today }), prog('w-was', { box: 4, due: '2027-01-01' })] })
        const g = games(s, d + 1)
        g.forEach((x, i) => { if (i > 0) expect(x, g.join(',')).not.toBe(g[i - 1]) })
      }
    }
  })

  it('scales the warm-up with session length', () => {
    const due = bank.setIds.y1cew.slice(0, 20).map(id => prog(id, { box: 2, due: evenDay }))
    const short = planSession(bank, makeState({ today: evenDay, placement: doneLevels(), progressList: due }), { seed: 1, wheelAnchors: anchors })
    const long = planSession(bank, makeState({ today: evenDay, placement: doneLevels(), progressList: due, settings: { sessionMinutes: 20, newWordsPerDay: 4 } }), { seed: 1, wheelAnchors: anchors })
    expect(short.activities[0].wordIds).toHaveLength(6)
    expect(long.activities[0].wordIds).toHaveLength(12)
  })

  it('extra sessions add no new material', () => {
    const s = makeState({ placement: doneLevels(), progressList: [prog('w-said', { box: 2, due: T })] })
    const plan = planSession(bank, s, { seed: 1, wheelAnchors: anchors, extra: true })
    expect(plan.kind).toBe('extra')
    expect(plan.newMaterial.kind).toBe('none')
    expect(plan.activities.some(a => a.gameType === 'workshop')).toBe(false)
  })

  // Review Focus #4: edge states never give an empty plan
  it('is never empty: everything mastered, nothing new, nothing due', () => {
    const all = [...bank.words.keys()].map(id => prog(id, { box: 5, due: '2027-06-01' }))
    const units = new Map(bank.units.map(u => [u.id, { unitId: u.id, status: 'complete' as const, startedOn: T, completedOn: T, taughtWordIds: [] }]))
    const plan = planSession(bank, makeState({ placement: doneLevels(), progressList: all, units, lastNewKind: 'unit' }), { seed: 1, wheelAnchors: anchors })
    expect(plan.activities.length).toBeGreaterThan(0)
    expect(plan.activities.every(a => a.wordIds.length > 0)).toBe(true)
  })
  it('is never empty: placement done but no progress at all and no win word', () => {
    const plan = planSession(bank, makeState({ placement: doneLevels(), lastNewKind: 'unit' }), { seed: 1, wheelAnchors: anchors })
    expect(plan.activities.map(a => a.gameType)).toContain('workshop')
    expect(plan.activities.some(a => a.finale)).toBe(false)
  })
})

describe('planner helpers', () => {
  it('itemCount fits the time and clamps', () => {
    expect(itemCount('wombat', 10)).toBe(10)
    expect(itemCount('storyTime', 10)).toBe(5)
    expect(itemCount('wheel', 10)).toBe(3)
  })
  it('maps unit games', () => {
    expect(unitGameType(bank.unitById.get('y1-tch')!)).toBe('sortPen')
    expect(unitGameType(bank.unitById.get('y1-un')!)).toBe('builder')
    expect(unitGameType(bank.unitById.get('y2-homophones')!)).toBe('hedgehog')
    expect(unitGameType(bank.unitById.get('y1-nk')!)).toBe('bunnyHop')
  })
  it('chooses the least recently used eligible play game', () => {
    const s = makeState({ recentGames: ['wombat', 'bunnyHop', 'burrow', 'bubblePop'] })
    expect(choosePlayGame(bank, s, ['w-because'], null, new Set(['w-because']), makeRng(1))).toBe('wheel')
    expect(choosePlayGame(bank, s, ['w-because'], null, new Set(), makeRng(1))).toBe('bubblePop')
    expect(choosePlayGame(bank, s, [], null, new Set(), makeRng(1))).toBeNull()
  })
  it('has metadata for every game', () => {
    expect(Object.keys(GAME_META)).toHaveLength(13)
  })
})
