import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { Repo } from '../storage/repo'
import { buildSnapshot, settleAchievements, settleRealRewards } from './achievements'
import { makeRng } from '../engine/rng'
import { prog } from '../engine/testing'
import { buildPlacementPlan } from '../engine/placement'

const T = '2026-10-15'

describe('achievements', () => {
  it('builds a snapshot from stored progress and counters', async () => {
    const repo = Repo.open(`ac-${Math.random()}`)
    await repo.putProgress(bank.setIds.days.map(id => prog(id, { box: 4, secureOn: T })))
    await repo.bumpCounter('bonusWords', 4)
    const s = await buildSnapshot(repo, bank)
    expect(s).toMatchObject({ placementDone: 0, secureTotal: 7, bonusWords: 4 })
    expect(s.secureBySet.days).toBe(7)
  })
  it('settles and saves awards once', async () => {
    const repo = Repo.open(`ac-${Math.random()}`)
    const before = await buildSnapshot(repo, bank)
    await repo.putProgress(bank.setIds.days.map(id => prog(id, { box: 4, secureOn: T })))
    await repo.savePlacement(buildPlacementPlan(bank, 1).map(l => ({ ...l, status: 'done' as const })))
    const after = await buildSnapshot(repo, bank)
    const awards = await settleAchievements(repo, before, after, 5, makeRng(1))
    expect(awards).toEqual(expect.arrayContaining([{ kind: 'friend', id: 'friend-days' }, { kind: 'badge', id: 'hunt-done' }, { kind: 'badge', id: 'secure-1' }]))
    expect(awards.filter(a => a.kind === 'sticker')).toHaveLength(1)
    expect([...(await repo.getEarned()).friends]).toEqual(['friend-days'])
    expect(await settleAchievements(repo, after, after, 6, makeRng(1))).toEqual([])
  })
  it('marks finished real rewards as earned, once', async () => {
    const repo = Repo.open(`ac-${Math.random()}`)
    await repo.saveRealReward({ id: 'r', title: 'Park', emoji: '🛝', goal: { type: 'sessions', target: 1, countFrom: 'allTime' }, status: 'active', createdAt: T })
    expect(await settleRealRewards(repo, bank, T)).toEqual([])
    await repo.saveSession({ id: 's', date: T, kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal', activities: [], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: true, coins: 0 })
    expect((await settleRealRewards(repo, bank, T)).map(r => r.id)).toEqual(['r'])
    expect((await repo.getRealRewards())[0]).toMatchObject({ status: 'earned', earnedAt: T })
    expect(await settleRealRewards(repo, bank, T)).toEqual([])
  })
})
