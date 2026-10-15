import { describe, it, expect, vi } from 'vitest'
import { Repo } from './repo'
import { writeAutoBackup } from './autoBackup'
import { T } from '../engine/testing'

function fakeDir(permission: PermissionState) {
  const written: string[] = []
  const handle = {
    queryPermission: vi.fn(async () => permission),
    getFileHandle: vi.fn(async () => ({ createWritable: async () => ({ write: async (s: string) => { written.push(s) }, close: async () => {} }) })),
  }
  return { handle: handle as unknown as FileSystemDirectoryHandle, written, raw: handle }
}

describe('auto-backup', () => {
  it('reports when no folder is chosen', async () => {
    const repo = Repo.open(`a-${Math.random()}`)
    expect(await writeAutoBackup(repo, T, 1)).toBe('no-folder')
  })
  it('asks for permission again when it has lapsed', async () => {
    const repo = Repo.open(`a-${Math.random()}`)
    const dir = fakeDir('prompt')
    vi.spyOn(repo.db.handles, 'get').mockResolvedValue({ id: 'backupDir', handle: dir.handle })
    expect(await writeAutoBackup(repo, T, 1)).toBe('needs-permission')
  })
  it('writes the dated file and records the time', async () => {
    const repo = Repo.open(`a-${Math.random()}`)
    const dir = fakeDir('granted')
    vi.spyOn(repo.db.handles, 'get').mockResolvedValue({ id: 'backupDir', handle: dir.handle })
    expect(await writeAutoBackup(repo, T, 1234)).toBe('written')
    expect(dir.raw.getFileHandle).toHaveBeenCalledWith('spelling-pets-backup-2026-10-15.json', { create: true })
    expect(JSON.parse(dir.written[0]).app).toBe('spelling-pets')
    expect((await repo.getSettings()).lastBackupAt).toBe(1234)
  })
  it('logs and reports errors', async () => {
    const repo = Repo.open(`a-${Math.random()}`)
    const dir = fakeDir('granted')
    dir.raw.getFileHandle.mockRejectedValue(new Error('disk full'))
    vi.spyOn(repo.db.handles, 'get').mockResolvedValue({ id: 'backupDir', handle: dir.handle })
    expect(await writeAutoBackup(repo, T, 1)).toBe('error')
    expect((await repo.getErrors())[0].message).toContain('disk full')
  })
})
