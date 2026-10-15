import type { DateStr } from '../engine/dates'
import { backupFileName, exportBackup } from './backup'
import type { Repo } from './repo'

export type AutoBackupResult = 'written' | 'needs-permission' | 'no-folder' | 'error'

export function supportsFolderBackup(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function chooseBackupFolder(repo: Repo): Promise<boolean> {
  try {
    const handle = await window.showDirectoryPicker({ id: 'spelling-pets-backup', mode: 'readwrite' })
    await repo.db.handles.put({ id: 'backupDir', handle })
    return true
  } catch {
    return false // the grown-up cancelled the picker
  }
}

export async function reconnectBackupFolder(repo: Repo): Promise<boolean> {
  const row = await repo.db.handles.get('backupDir')
  if (!row) return false
  return (await row.handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

export async function writeAutoBackup(repo: Repo, today: DateStr, nowMs: number): Promise<AutoBackupResult> {
  const row = await repo.db.handles.get('backupDir')
  if (!row) return 'no-folder'
  try {
    if ((await row.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return 'needs-permission'
    const file = await row.handle.getFileHandle(backupFileName(today), { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(await exportBackup(repo.db, new Date(nowMs).toISOString())))
    await writable.close()
    await repo.updateSettings({ lastBackupAt: nowMs })
    return 'written'
  } catch (e) {
    await repo.logError('autoBackup', e instanceof Error ? e.message : String(e), nowMs)
    return 'error'
  }
}
