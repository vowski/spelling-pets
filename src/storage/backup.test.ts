import { describe, it, expect } from 'vitest'
import { Repo } from './repo'
import { exportBackup, parseBackup, importBackup, backupFileName, BACKUP_SCHEMA_VERSION } from './backup'
import { prog, T } from '../engine/testing'

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
  it('ignores unknown tables', () => {
    const r = parseBackup(JSON.stringify({ app: 'spelling-pets', schemaVersion: 1, exportedAt: 'x', tables: { mystery: [1], progress: [] } }))
    expect(r.ok && Object.keys(r.backup.tables)).toEqual(['progress'])
  })
})
