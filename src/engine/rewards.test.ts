import { describe, it, expect } from 'vitest'
import { coinsForAttempt, petStage, evaluateAchievements, stickerTriggers, rewardProgress, COINS, type AchievementSnapshot, type RealReward } from './rewards'
import { makeRng } from './rng'
import { STICKERS } from '../content/rewards'

const zeroSets = { y1cew: 0, days: 0, hfw: 0, y2cew: 0, y34: 0, pattern: 0, school: 0 }
const snap = (over: Partial<AchievementSnapshot> = {}): AchievementSnapshot => ({
  placementDone: 1, secureTotal: 0, secureBySet: { ...zeroSets }, sizeBySet: { y1cew: 45, days: 7, hfw: 100, y2cew: 64, y34: 100, pattern: 400, school: 0 },
  unitsDone: 0, weeklyGoalsMet: 0, wheelPuzzles: 0, wheelThreeStars: 0, bonusWords: 0, perfectStoryTimes: 0, punctuationSentences: 0, ...over,
})
const none = { stickers: new Set<string>(), badges: new Set<string>(), friends: new Set<string>() }

describe('rewards', () => {
  it('pays coins per the spec', () => {
    expect(coinsForAttempt('recall', true, true, false)).toBe(3)
    expect(coinsForAttempt('pretest', true, true, false)).toBe(3)
    expect(coinsForAttempt('build', true, true, false)).toBe(1)
    expect(coinsForAttempt('recall', true, false, false)).toBe(0)
    expect(coinsForAttempt('recall', true, true, true)).toBe(0)
    expect(coinsForAttempt('recall', false, true, false)).toBe(0)
    expect(coinsForAttempt('teach', true, true, false)).toBe(0)
    expect(COINS).toMatchObject({ huntChunk: 15, session: 20, bonusWord: 2, weeklyGoal: 50 })
  })
  it('grows the pet by Secure words', () => {
    expect(petStage(500, false)).toBe('egg')
    expect([0, 9, 10, 39, 40, 79, 80, 149, 150].map(n => petStage(n, true))).toEqual(['baby', 'baby', 'young', 'young', 'grown', 'grown', 'super', 'super', 'sparkly'])
  })
  it('awards one sticker per trigger, never a duplicate', () => {
    expect(stickerTriggers(snap({ secureTotal: 12, unitsDone: 2, weeklyGoalsMet: 1, wheelPuzzles: 25 }))).toBe(2 + 2 + 1 + 2)
    const awards = evaluateAchievements(snap(), snap({ secureTotal: 10 }), none, makeRng(1))
    const stickers = awards.filter(a => a.kind === 'sticker')
    expect(stickers).toHaveLength(2)
    expect(new Set(stickers.map(s => (s as { id: string }).id)).size).toBe(2)
  })
  it('pays coins instead when the album is full, and awards album badges', () => {
    const owned = { ...none, stickers: new Set(STICKERS.map(s => s.id)) }
    expect(evaluateAchievements(snap(), snap({ secureTotal: 5 }), owned, makeRng(1))).toContainEqual({ kind: 'coins', amount: 10, reason: 'Your sticker album is full!' })
    const allButOne = { ...none, stickers: new Set(STICKERS.slice(1).map(s => s.id)) } // STICKERS[0] is the farm cow
    const a = evaluateAchievements(snap(), snap({ secureTotal: 5 }), allButOne, makeRng(1))
    expect(a).toContainEqual({ kind: 'sticker', id: STICKERS[0].id })
    expect(a).toContainEqual({ kind: 'badge', id: 'album-farm' })
  })
  it('awards metric badges and friends once', () => {
    const next = snap({ secureTotal: 10, secureBySet: { ...zeroSets, days: 7 } })
    const a = evaluateAchievements(snap(), next, none, makeRng(1))
    expect(a).toContainEqual({ kind: 'badge', id: 'secure-1' })
    expect(a).toContainEqual({ kind: 'badge', id: 'secure-10' })
    expect(a).toContainEqual({ kind: 'friend', id: 'friend-days' })
    const again = evaluateAchievements(next, next, { ...none, badges: new Set(['secure-1', 'secure-10', 'hunt-done']), friends: new Set(['friend-days']) }, makeRng(1))
    expect(again).toEqual([])
  })
  it('tracks real-reward progress from creation or all time', () => {
    const r: RealReward = { id: 'r', title: 'Park trip', emoji: '🛝', goal: { type: 'sessions', target: 3, countFrom: 'creation' }, status: 'active', createdAt: '2026-10-14' }
    const stats = { completeSessionDates: ['2026-10-10', '2026-10-14', '2026-10-15', '2026-10-15'], secureOnDates: ['2026-10-01', '2026-10-15'], weeklyGoalDays: 2, levelComplete: { days: true } }
    expect(rewardProgress(r, stats)).toEqual({ current: 3, target: 3, done: true })
    expect(rewardProgress({ ...r, goal: { type: 'daysPractised', target: 5, countFrom: 'allTime' } }, stats)).toEqual({ current: 3, target: 5, done: false })
    expect(rewardProgress({ ...r, goal: { type: 'secureWords', target: 1, countFrom: 'creation' } }, stats).current).toBe(1)
    expect(rewardProgress({ ...r, goal: { type: 'weeklyGoals', target: 1, countFrom: 'allTime' } }, stats).current).toBe(1)
    expect(rewardProgress({ ...r, goal: { type: 'levelComplete', target: 1, levelId: 'days', countFrom: 'allTime' } }, stats)).toEqual({ current: 1, target: 1, done: true })
  })
})
