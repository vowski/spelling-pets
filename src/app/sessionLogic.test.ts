import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { Repo } from '../storage/repo'
import { startOrResumeSession, nextActivity, recordGameAttempt, completeActivity, finishSession, attemptRoles } from './sessionLogic'
import { prog } from '../engine/testing'
import type { SessionRow } from '../storage/db'
import { buildSnapshot } from './achievements'
import { buildPlacementPlan } from '../engine/placement'

const T = '2026-10-15'
const fresh = () => ({ repo: Repo.open(`s-${Math.random()}`), bank })

describe('session logic', () => {
  it('first main session builds placement and starts with the Treasure Hunt; reopening resumes it', async () => {
    const svc = fresh()
    const row = await startOrResumeSession(svc, 'main', T, 1000)
    expect(row.plan.kind).toBe('placement')
    expect(await svc.repo.getPlacement()).toHaveLength(5)
    expect((await nextActivity(svc, row))?.gameType).toBe('treasureHunt')
    expect((await startOrResumeSession(svc, 'main', T, 2000)).id).toBe(row.id)
  })

  it('records Treasure Hunt answers, finalises finished levels and pays the chunk bonus', async () => {
    const svc = fresh()
    let row = await startOrResumeSession(svc, 'main', T, 1)
    const hunt = (await nextActivity(svc, row))!
    for (const id of hunt.wordIds) await recordGameAttempt(svc, row, hunt, { wordId: id, correct: true, firstTry: true, hint: false, typed: 'x' }, T, 2)
    row = await completeActivity(svc, row, hunt, undefined, T, 3)
    const y1 = (await svc.repo.getPlacement()).find(l => l.level === 'y1cew')!
    expect(y1).toMatchObject({ status: 'done', placed: true })
    expect((await svc.repo.getAllProgress()).filter(p => p.box === 3).length).toBeGreaterThan(40)
    expect(await svc.repo.balance()).toBe(15)
    expect(row.doneActivityIds).toContain(hunt.id)
  })

  it('records practice-only attempts as placement (no box change) but pays game coins', async () => {
    const svc = fresh()
    const row = await startOrResumeSession(svc, 'main', T, 1)
    const fun = row.plan.activities[1]
    expect(fun.practiceOnly).toBe(true)
    expect(attemptRoles(fun, { wordId: 'w-said', correct: true, firstTry: true, hint: false })).toEqual({ role: 'placement', coinRole: fun.gameType === 'wombat' ? 'recognise' : 'build' })
    const coins = await recordGameAttempt(svc, row, fun, { wordId: fun.wordIds[0], correct: true, firstTry: true, hint: false }, T, 2)
    expect(coins).toBe(1)
    expect((await svc.repo.getAllProgress()).find(p => p.wordId === fun.wordIds[0])?.box).toBe(0)
  })

  it('a perfect unit check marks the unit known and skips the conditional teaching', async () => {
    const svc = fresh()
    await svc.repo.savePlacement((await import('../engine/placement')).buildPlacementPlan(bank, 1).map(l => ({ ...l, status: 'done' as const })))
    await svc.repo.updateSettings({ lastNewKind: 'words' })
    let row = await startOrResumeSession(svc, 'main', T, 1)
    const check = row.plan.activities.find(a => a.gameType === 'unitCheck')!
    expect((await svc.repo.getUnits())[0]).toMatchObject({ unitId: check.unitId, status: 'checking' })
    row = await completeActivity(svc, row, check, { unitCheckResults: [true, true, true] }, T, 2)
    expect((await svc.repo.getUnits())[0].status).toBe('known')
    const next = await nextActivity(svc, row)
    expect(next?.onlyIfUnitNotKnown).not.toBe(true)
  })

  it('an imperfect unit check starts teaching and the workshop records taught words', async () => {
    const svc = fresh()
    await svc.repo.savePlacement((await import('../engine/placement')).buildPlacementPlan(bank, 1).map(l => ({ ...l, status: 'done' as const })))
    await svc.repo.updateSettings({ lastNewKind: 'words' })
    let row = await startOrResumeSession(svc, 'main', T, 1)
    const check = row.plan.activities.find(a => a.gameType === 'unitCheck')!
    row = await completeActivity(svc, row, check, { unitCheckResults: [true, false, true] }, T, 2)
    const workshop = (await nextActivity(svc, row))!
    expect(workshop.gameType).toBe('workshop')
    row = await completeActivity(svc, row, workshop, undefined, T, 3)
    expect((await svc.repo.getUnits())[0]).toMatchObject({ status: 'learning', taughtWordIds: workshop.wordIds })
  })

  it('saves Story Time results and counters', async () => {
    const svc = fresh()
    const row: SessionRow = { id: 's', date: T, kind: 'main', startedAt: 1, endedAt: null, doneActivityIds: [], complete: false, coins: 0,
      plan: { kind: 'normal', newMaterial: { kind: 'none' }, activities: [{ id: 'a1', gameType: 'storyTime', wordIds: ['w-said'], sentenceIds: [] }] } }
    await svc.repo.saveSession(row)
    await completeActivity(svc, row, row.plan.activities[0], { storyResults: [{ wordAccuracy: 1, punctuationOk: true, perfect: true }, { wordAccuracy: 0.6, punctuationOk: false, perfect: false }] }, T, 5)
    expect((await svc.repo.recentStoryResults()).map(r => r.wordAccuracy)).toEqual([1, 0.6])
    expect(await svc.repo.getCounters()).toMatchObject({ perfectStoryTimes: 1, punctuationSentences: 1 })
  })

  it('finishing pays the session bonus and the weekly-goal bonus once', async () => {
    const svc = fresh()
    await svc.repo.updateSettings({ weeklyGoalDays: 1 })
    await svc.repo.putProgress([prog('w-said', { box: 1, due: T })])
    const row: SessionRow = { id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: null, doneActivityIds: ['a1'], complete: false, coins: 0, plan: { kind: 'normal', newMaterial: { kind: 'none' }, activities: [{ id: 'a1', gameType: 'pupPost', wordIds: ['w-said'] }] } }
    await svc.repo.saveSession(row)
    expect(await finishSession(svc, row, T, 9)).toMatchObject({ coins: 70, weeklyGoalJustMet: true })
    const extra: SessionRow = { ...row, id: 's2', kind: 'extra' }
    await svc.repo.saveSession(extra)
    expect(await finishSession(svc, extra, T, 10)).toMatchObject({ coins: 20, weeklyGoalJustMet: false })
    expect((await svc.repo.getSession('s1'))?.complete).toBe(true)
  })
  it('does not hatch the pet a second time when a re-run Treasure Hunt finishes', async () => {
    const svc = fresh()
    await svc.repo.updateSettings({ hatched: true })
    const startSnapshot = await buildSnapshot(svc.repo, bank) // placement cleared by the re-run
    await svc.repo.savePlacement(buildPlacementPlan(bank, 1).map(l => ({ ...l, status: 'done' as const })))
    const row: SessionRow = { id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: null, doneActivityIds: [], complete: false, coins: 0, startSnapshot, plan: { kind: 'placement', newMaterial: { kind: 'none' }, activities: [] } }
    await svc.repo.saveSession(row)
    expect(await finishSession(svc, row, T, 9)).toMatchObject({ hatched: false, stageBefore: 'baby', stageAfter: 'baby' })
  })
})
