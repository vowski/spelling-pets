import { describe, it, expect } from 'vitest'
import { Repo } from './repo'
import { exportBackup, parseBackup, importBackup, backupFileName, BACKUP_SCHEMA_VERSION } from './backup'
import { prog, T } from '../engine/testing'
import { DEFAULT_SETTINGS } from './db'

async function seeded() {
  const repo = Repo.open(`b-${Math.random()}`)
  await repo.updateSettings({ childName: 'Amy', coins: 42 })
  await repo.putProgress([prog('w-said', { box: 4 }), prog('w-was', { box: 2 })])
  await repo.saveSession({ id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal', activities: [], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: true, coins: 0 })
  return repo
}

describe('backup', () => {
  it('names files by date', () => {
    expect(backupFileName(T)).toBe('spelling-pets-backup-2026-10-15.json')
  })
  it('round-trips through export, parse and import', async () => {
    const src = await seeded()
    const file = await exportBackup(src.db, '2026-10-15T18:00:00.000Z')
    expect(file).toMatchObject({ app: 'spelling-pets', schemaVersion: BACKUP_SCHEMA_VERSION })
    expect(file.tables).not.toHaveProperty('handles')
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.summary).toEqual({ exportedAt: '2026-10-15T18:00:00.000Z', childName: 'Amy', secureWords: 1, sessions: 1 })
    const dest = Repo.open(`b-${Math.random()}`)
    await dest.putProgress([prog('w-the', { box: 1 })])
    await importBackup(dest.db, parsed.backup)
    expect((await dest.getAllProgress()).map(p => p.wordId).sort()).toEqual(['w-said', 'w-was'])
    expect(await dest.getSettings()).toMatchObject({ childName: 'Amy', coins: 42 })
  })
  it.each([
    ['not json', "This file isn't a Spelling Pets backup."],
    [JSON.stringify({ app: 'other', schemaVersion: 1, exportedAt: 'x', tables: {} }), "This file isn't a Spelling Pets backup."],
    [JSON.stringify({ app: 'spelling-pets', schemaVersion: 99, exportedAt: 'x', tables: {} }), 'This backup was made by a newer version of Spelling Pets. Please update the app first.'],
    [JSON.stringify({ app: 'spelling-pets', schemaVersion: 1, exportedAt: 'x', tables: { progress: [{ wordId: 'w-a', box: 9 }] } }), 'This backup looks damaged, so nothing was changed.'],
  ])('rejects bad files without changing anything (%#)', (text, reason) => {
    expect(parseBackup(text)).toEqual({ ok: false, reason })
  })
  it.each([
    ['a session with no plan', { sessions: [{ id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: 2, doneActivityIds: [], complete: true, coins: 0 }] }],
    ['a session plan with no activities', { sessions: [{ id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal' }, doneActivityIds: [], complete: true, coins: 0 }] }],
    ['a session with no done list', { sessions: [{ id: 's1', date: T, kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal', activities: [] }, complete: true, coins: 0 }] }],
    ['a progress row with no misspellings', { progress: [{ ...prog('w-said'), misspellings: undefined }] }],
    ['two progress rows for one word', { progress: [prog('w-said'), prog('w-said', { box: 2 })] }],
    ['settings with text for coins', { settings: [{ ...DEFAULT_SETTINGS, coins: 'lots' }] }],
    ['a school list with no items', { schoolLists: [{ id: 'l1', createdAt: T, testDate: T }] }],
    ['a unit with no taught words', { units: [{ unitId: 'u1', status: 'learning', startedOn: T, completedOn: null }] }],
    ['a placement level with no answers', { placement: [{ level: 'hfw', sampledIds: [], status: 'done', placed: true }] }],
    ['a wallet row with text for the amount', { wallet: [{ id: 1, at: 1, delta: 'ten', reason: 'x' }] }],
    ['an inventory row with no count', { inventory: [{ itemId: 'hat' }] }],
    ['a sticker with no id', { stickers: [{ earnedAt: 1 }] }],
    ['a real reward with no goal', { realRewards: [{ id: 'r1', title: 'Park', emoji: '🌳', status: 'active', createdAt: T }] }],
    ['a counter with no value', { counters: [{ id: 'wheelPuzzles' }] }],
    ['a custom word with no text', { customWords: [{ wordId: 'w-crocodile' }] }],
    ['an attempt with no word', { attempts: [{ id: 1, sessionId: 's1', game: 'workshop', role: 'recall', at: 1, typed: '', correct: true, firstTry: true, hint: false }] }],
  ])('rejects a backup with %s', (_name, tables) => {
    expect(parseBackup(JSON.stringify({ app: 'spelling-pets', schemaVersion: 1, exportedAt: 'x', tables }))).toEqual({ ok: false, reason: 'This backup looks damaged, so nothing was changed.' })
  })
  it('accepts and restores a backup with a row in every table', async () => {
    const src = await seeded()
    const db = src.db
    await db.attempts.add({ wordId: 'w-said', sessionId: 's1', game: 'workshop', role: 'recall', at: 5, typed: 'said', correct: true, firstTry: true, hint: false })
    await db.sessions.put({ id: 's2', date: T, kind: 'main', startedAt: 3, endedAt: null, plan: { kind: 'normal', activities: [{ id: 'a1', gameType: 'workshop', wordIds: ['w-said'] }], newMaterial: { kind: 'none' } }, doneActivityIds: ['a1'], complete: false, coins: 2 })
    await db.placement.put({ level: 'hfw', sampledIds: ['w-said'], answers: { 'w-said': true }, status: 'done', placed: true })
    await db.units.put({ unitId: 'y3-u1', status: 'learning', startedOn: T, completedOn: null, taughtWordIds: [] })
    await src.saveSchoolList({ id: 'l1', createdAt: T, testDate: T, items: [{ text: 'crocodile', wordId: 'w-crocodile' }], score: 1, outOf: 1 }, [{ wordId: 'w-crocodile', text: 'crocodile' }])
    await db.wallet.add({ at: 4, delta: 5, reason: 'session' })
    await db.inventory.put({ itemId: 'hat-red', count: 1 })
    await db.stickers.put({ id: 'st-1', earnedAt: 4 })
    await db.badges.put({ id: 'b-1', earnedAt: 4 })
    await db.friends.put({ id: 'f-1', earnedAt: 4 })
    await db.realRewards.put({ id: 'r1', title: 'Park trip', emoji: '🌳', goal: { type: 'sessions', target: 5, countFrom: 'creation' }, status: 'active', createdAt: T })
    await db.counters.put({ id: 'wheelPuzzles', value: 3 })
    await db.storyResults.add({ at: 4, wordAccuracy: 1, punctuationOk: true })
    await db.errors.add({ at: 4, where: 'test', message: 'oops' })
    const parsed = parseBackup(JSON.stringify(await exportBackup(db, '2026-10-15T18:00:00.000Z')))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const dest = Repo.open(`b-${Math.random()}`)
    await importBackup(dest.db, parsed.backup)
    expect((await dest.loadLearnerState(T)).recentGames).toEqual(['workshop'])
  })
  it('ignores unknown tables', () => {
    const r = parseBackup(JSON.stringify({ app: 'spelling-pets', schemaVersion: 1, exportedAt: 'x', tables: { mystery: [1], progress: [] } }))
    expect(r.ok && Object.keys(r.backup.tables)).toEqual(['progress'])
  })

  it('leaves tips out of backups', async () => {
    const src = Repo.open(`b-${Math.random()}`)
    await src.putTip({ key: 'k', wordId: 'w-said', attempt: 'sed', text: 'T', source: 'plain', at: 1 })
    const file = await exportBackup(src.db, '2026-10-25T10:00:00.000Z')
    expect(Object.keys(file.tables)).not.toContain('tips')
    expect(Object.keys(file.tables)).toContain('progress')
  })
})
