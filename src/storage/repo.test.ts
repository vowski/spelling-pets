import { describe, it, expect, beforeEach } from 'vitest'
import { Repo } from './repo'
import { prog, T } from '../engine/testing'
import type { SessionRow } from './db'
import type { SessionPlan } from '../engine/planner'

let repo: Repo
beforeEach(() => { repo = Repo.open(`test-${Math.random()}`) })

const plan: SessionPlan = { kind: 'normal', newMaterial: { kind: 'none' }, activities: [
  { id: 'a1', gameType: 'pupPost', wordIds: ['w-said'] }, { id: 'a2', gameType: 'wombat', wordIds: ['w-said'] }] }
const session = (over: Partial<SessionRow> = {}): SessionRow => ({ id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: null, plan, doneActivityIds: [], complete: false, coins: 0, ...over })

describe('Repo', () => {
  it('returns default settings and saves patches', async () => {
    expect((await repo.getSettings()).sessionMinutes).toBe(10)
    await repo.updateSettings({ childName: 'Test', sessionMinutes: 12 })
    expect(await repo.getSettings()).toMatchObject({ childName: 'Test', sessionMinutes: 12, newWordsPerDay: 4 })
  })

  it('records an attempt: updates progress, logs it and pays coins', async () => {
    await repo.putProgress([prog('w-said', { box: 1, due: T })])
    const r = await repo.recordAttempt({ sessionId: 's1', game: 'pupPost', attempt: { wordId: 'w-said', role: 'recall', correct: true, firstTry: true, hint: false, typed: 'said' }, coinRole: 'recall', today: T, nowMs: 5 })
    expect(r.progress.box).toBe(2)
    expect(r.coins).toBe(3)
    expect(await repo.balance()).toBe(3)
    expect(await repo.attemptsForWord('w-said')).toEqual([expect.objectContaining({ correct: true, typed: 'said', game: 'pupPost', at: 5 })])
  })

  it('adds and spends coins, refusing to go negative', async () => {
    await repo.addCoins(20, 'session', 1)
    expect(await repo.spendCoins(15, 'cupcake', 2)).toBe(true)
    expect(await repo.spendCoins(15, 'cupcake', 3)).toBe(false)
    expect(await repo.balance()).toBe(5)
  })

  it('stores sessions, marks activities done and lists completed dates', async () => {
    await repo.saveSession(session())
    expect((await repo.getSessionForDay(T, 'main'))?.id).toBe('s1')
    expect(await repo.getSessionForDay(T, 'extra')).toBeUndefined()
    await repo.markActivityDone('s1', 'a1')
    await repo.markActivityDone('s1', 'a1')
    expect((await repo.getSession('s1'))?.doneActivityIds).toEqual(['a1'])
    await repo.completeSession('s1', 99)
    expect(await repo.getSession('s1')).toMatchObject({ complete: true, endedAt: 99 })
    await repo.saveSession(session({ id: 's2', date: '2026-10-16', kind: 'free', complete: true }))
    expect(await repo.completeSessionDates()).toEqual([T])
  })

  it('loads learner state with placement in level order and recent games newest first', async () => {
    await repo.putProgress([prog('w-said', { box: 2 })])
    await repo.savePlacement([
      { level: 'y34', sampledIds: [], answers: {}, status: 'pending', placed: false },
      { level: 'y1cew', sampledIds: [], answers: {}, status: 'done', placed: true },
    ])
    await repo.saveSession(session({ id: 'old', startedAt: 1, doneActivityIds: ['a1'] }))
    await repo.saveSession(session({ id: 'new', date: '2026-10-16', startedAt: 2, doneActivityIds: ['a1', 'a2'] }))
    await repo.updateSettings({ lastNewKind: 'unit', sessionMinutes: 15 })
    const s = await repo.loadLearnerState('2026-10-16')
    expect(s.today).toBe('2026-10-16')
    expect(s.progress.get('w-said')?.box).toBe(2)
    expect(s.placement.map(l => l.level)).toEqual(['y1cew', 'y34'])
    expect(s.recentGames).toEqual(['wombat', 'pupPost', 'pupPost'])
    expect(s.lastNewKind).toBe('unit')
    expect(s.settings).toEqual({ sessionMinutes: 15, newWordsPerDay: 4 })
  })

  it('saves school lists with their custom words', async () => {
    await repo.saveSchoolList({ id: 'l1', createdAt: T, testDate: '2026-10-17', items: [{ text: 'crocodile', wordId: 'w-crocodile' }] }, [{ wordId: 'w-crocodile', text: 'crocodile' }])
    expect(await repo.getSchoolLists()).toHaveLength(1)
    expect(await repo.getCustomWords()).toEqual([{ wordId: 'w-crocodile', text: 'crocodile' }])
    await repo.deleteSchoolList('l1')
    expect(await repo.getSchoolLists()).toHaveLength(0)
  })

  it('counts words ever made Secure, whatever their box now', async () => {
    await repo.putProgress([prog('w-said', { box: 3, secureOn: '2026-10-01' }), prog('w-was', { box: 5, secureOn: T }), prog('w-the', { box: 4 }), prog('w-a', { box: 2 })])
    expect(await repo.everSecureCount()).toBe(2)
  })
  it('keeps inventory counts', async () => {
    await repo.addItem('apple')
    await repo.addItem('apple')
    expect(await repo.useItem('apple')).toBe(true)
    expect(await repo.getInventory()).toEqual([{ itemId: 'apple', count: 1 }])
    expect(await repo.useItem('cupcake')).toBe(false)
  })

  it('stores awards, counters, story results and errors', async () => {
    await repo.addAwards([{ kind: 'sticker', id: 'farm-cow' }, { kind: 'badge', id: 'secure-1' }, { kind: 'friend', id: 'friend-days' }, { kind: 'coins', amount: 10, reason: 'full' }], 7)
    const owned = await repo.getEarned()
    expect([...owned.stickers]).toEqual(['farm-cow'])
    expect([...owned.badges]).toEqual(['secure-1'])
    expect([...owned.friends]).toEqual(['friend-days'])
    expect(await repo.balance()).toBe(10)
    await repo.bumpCounter('bonusWords', 3)
    await repo.bumpCounter('bonusWords', 2)
    expect((await repo.getCounters()).bonusWords).toBe(5)
    expect((await repo.getCounters()).wheelPuzzles).toBe(0)
    await repo.addStoryResult({ at: 2, wordAccuracy: 1, punctuationOk: true })
    await repo.addStoryResult({ at: 1, wordAccuracy: 0.5, punctuationOk: false })
    expect((await repo.recentStoryResults()).map(r => r.at)).toEqual([1, 2])
    await repo.logError('game', 'boom', 3)
    expect(await repo.getErrors()).toEqual([expect.objectContaining({ where: 'game', message: 'boom' })])
  })
})
