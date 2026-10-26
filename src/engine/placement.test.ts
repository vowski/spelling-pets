import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import {
  buildPlacementPlan, huntProgress, nextPlacementChunk, recordPlacementAnswer, finaliseLevels, isPlacementDone, spreadDue,
} from './placement'
import { T, prog } from './testing'
import type { PlacementLevelState, WordProgress } from './types'

const answerAll = (levels: PlacementLevelState[], level: string, correctCount: number) => {
  let out = levels
  const l = levels.find(x => x.level === level)!
  l.sampledIds.forEach((id, i) => { out = recordPlacementAnswer(out, id, i < correctCount) })
  return out
}

describe('huntProgress', () => {
  it('says how far the Treasure Hunt has got and how many hunts are left before the egg hatches', () => {
    expect(huntProgress([])).toEqual({ done: 0, total: 52, huntsLeft: 5, midHunt: false }) // not started yet
    let plan = buildPlacementPlan(bank, 123)
    expect(huntProgress(plan)).toEqual({ done: 0, total: 52, huntsLeft: 5, midHunt: false })
    for (const id of nextPlacementChunk(plan)) plan = recordPlacementAnswer(plan, id, true)
    expect(huntProgress(plan)).toEqual({ done: 12, total: 52, huntsLeft: 4, midHunt: false })
  })

  it('counts a hunt she has started as one, however few of its words are left', () => {
    let plan = buildPlacementPlan(bank, 123)
    for (const id of nextPlacementChunk(plan)) plan = recordPlacementAnswer(plan, id, true)
    const today = nextPlacementChunk(plan)
    for (const id of today.slice(0, 6)) plan = recordPlacementAnswer(plan, id, false)
    // 6 left today, then 28 more: 12 + 12 + 4.
    expect(huntProgress(plan, today)).toEqual({ done: 18, total: 52, huntsLeft: 4, midHunt: true })
    for (const id of today.slice(6)) plan = recordPlacementAnswer(plan, id, true)
    expect(huntProgress(plan, today)).toEqual({ done: 24, total: 52, huntsLeft: 3, midHunt: false })
  })
})

describe('placement', () => {
  it('samples 10/7/10/10/15 distinct headwords per level, deterministically', () => {
    const plan = buildPlacementPlan(bank, 123)
    expect(plan.map(l => [l.level, l.sampledIds.length])).toEqual([['y1cew', 10], ['days', 7], ['hfw', 10], ['y2cew', 10], ['y34', 15]])
    const all = plan.flatMap(l => l.sampledIds)
    expect(new Set(all).size).toBe(all.length)
    plan.find(l => l.level === 'y34')!.sampledIds.forEach(id => expect(bank.words.get(id)!.followOnOf).toBeUndefined())
    expect(buildPlacementPlan(bank, 123)).toEqual(plan)
    plan.forEach(l => expect(l).toMatchObject({ status: 'pending', placed: false, answers: {} }))
  })

  it('serves unanswered words in chunks of 12 in level order', () => {
    let plan = buildPlacementPlan(bank, 1)
    const first = nextPlacementChunk(plan)
    expect(first).toHaveLength(12)
    expect(first.slice(0, 10)).toEqual(plan[0].sampledIds)
    first.forEach(id => { plan = recordPlacementAnswer(plan, id, true) })
    expect(nextPlacementChunk(plan)[0]).toBe(plan[1].sampledIds[2])
  })

  it('places a level at ≥ 90%: sampled-correct and untested words go to box 3 with spread due dates', () => {
    let plan = buildPlacementPlan(bank, 7)
    plan = answerAll(plan, 'y1cew', 9)
    const { levels, updates } = finaliseLevels(plan, bank, new Map(), T)
    const y1 = levels.find(l => l.level === 'y1cew')!
    expect(y1).toMatchObject({ status: 'done', placed: true })
    const byId = new Map(updates.map(u => [u.wordId, u]))
    const wrongId = y1.sampledIds[9]
    expect(byId.get(wrongId)).toMatchObject({ box: 1, due: '2026-10-16', introducedOn: T })
    const untested = bank.setIds.y1cew.filter(id => !y1.sampledIds.includes(id))
    untested.forEach(id => expect(byId.get(id)?.box).toBe(3))
    const dues = [...byId.values()].filter(p => p.box === 3).map(p => p.due!)
    dues.forEach(d => { expect(d > T).toBe(true); expect(d <= '2026-10-29').toBe(true) })
    expect(new Set(dues).size).toBeGreaterThan(5)
    expect(levels.filter(l => l.status === 'done')).toHaveLength(1)
  })

  it('does not place a level below 90%; untested words stay New', () => {
    let plan = buildPlacementPlan(bank, 7)
    plan = answerAll(plan, 'y2cew', 5)
    const { levels, updates } = finaliseLevels(plan, bank, new Map(), T)
    const y2 = levels.find(l => l.level === 'y2cew')!
    expect(y2).toMatchObject({ status: 'done', placed: false })
    expect(updates).toHaveLength(10)
    expect(updates.filter(u => u.box === 3)).toHaveLength(5)
    expect(updates.filter(u => u.box === 1)).toHaveLength(5)
  })

  it('never overwrites words that already have progress when placing untested words', () => {
    let plan = buildPlacementPlan(bank, 7)
    plan = answerAll(plan, 'hfw', 10)
    const hfw = plan.find(l => l.level === 'hfw')!
    const other = bank.setIds.hfw.find(id => !hfw.sampledIds.includes(id))!
    const existing = new Map<string, WordProgress>([[other, prog(other, { box: 2, due: '2026-10-16' })]])
    const { updates } = finaliseLevels(plan, bank, existing, T)
    expect(updates.find(u => u.wordId === other)).toBeUndefined()
  })

  it('a re-run never demotes a word she already knows: a miss only makes it due for review', () => {
    let plan = buildPlacementPlan(bank, 7)
    plan = answerAll(plan, 'y2cew', 0)
    const [secure, learning] = plan.find(l => l.level === 'y2cew')!.sampledIds
    const existing = new Map<string, WordProgress>([
      [secure, prog(secure, { box: 4, due: '2026-10-29', secureOn: '2026-10-01' })],
      [learning, prog(learning, { box: 2, due: '2026-10-17' })],
    ])
    const { updates } = finaliseLevels(plan, bank, existing, T)
    expect(updates.find(u => u.wordId === secure)).toMatchObject({ box: 4, due: T, secureOn: '2026-10-01' })
    expect(updates.find(u => u.wordId === learning)).toMatchObject({ box: 2, due: T })
  })

  it('leaves partly answered levels pending and reports completion', () => {
    let plan = buildPlacementPlan(bank, 7)
    plan = recordPlacementAnswer(plan, plan[0].sampledIds[0], true)
    expect(finaliseLevels(plan, bank, new Map(), T).levels[0].status).toBe('pending')
    expect(isPlacementDone(plan)).toBe(false)
    expect(isPlacementDone([])).toBe(false)
    expect(isPlacementDone(plan.map(l => ({ ...l, status: 'done' as const })))).toBe(true)
  })

  it('spreads due dates over 14 days', () => {
    expect(spreadDue(T, 0)).toBe('2026-10-16')
    expect(spreadDue(T, 13)).toBe('2026-10-29')
    expect(spreadDue(T, 14)).toBe('2026-10-16')
  })
})
