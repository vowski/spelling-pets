import { z } from 'zod'
import type { DateStr } from '../engine/dates'
import { BACKUP_TABLES, type BackupTable, type SpellingDB } from './db'

export const BACKUP_SCHEMA_VERSION = 1

export interface BackupFile {
  app: 'spelling-pets'
  schemaVersion: number
  exportedAt: string
  tables: Partial<Record<BackupTable, unknown[]>>
}

export interface BackupSummary { exportedAt: string; childName: string; secureWords: number; sessions: number }
export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; reason: string }

const NOT_A_BACKUP = "This file isn't a Spelling Pets backup."
const TOO_NEW = 'This backup was made by a newer version of Spelling Pets. Please update the app first.'
const DAMAGED = 'This backup looks damaged, so nothing was changed.'

const fileSchema = z.object({
  app: z.literal('spelling-pets'),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.unknown())),
})
const progressRow = z.looseObject({ wordId: z.string().min(3), box: z.number().int().min(0).max(5) })
const sessionRow = z.looseObject({ id: z.string(), date: z.string(), complete: z.boolean() })
const settingsRow = z.looseObject({ id: z.literal('singleton') })

export function backupFileName(today: DateStr): string {
  return `spelling-pets-backup-${today}.json`
}

export async function exportBackup(db: SpellingDB, exportedAt: string): Promise<BackupFile> {
  const tables: Partial<Record<BackupTable, unknown[]>> = {}
  for (const name of BACKUP_TABLES) tables[name] = await db.table(name).toArray()
  return { app: 'spelling-pets', schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt, tables }
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: NOT_A_BACKUP }
  }
  const file = fileSchema.safeParse(raw)
  if (!file.success) return { ok: false, reason: NOT_A_BACKUP }
  if (file.data.schemaVersion > BACKUP_SCHEMA_VERSION) return { ok: false, reason: TOO_NEW }
  const tables: Partial<Record<BackupTable, unknown[]>> = {}
  for (const name of BACKUP_TABLES) if (file.data.tables[name]) tables[name] = file.data.tables[name]
  const ok =
    z.array(progressRow).safeParse(tables.progress ?? []).success &&
    z.array(sessionRow).safeParse(tables.sessions ?? []).success &&
    z.array(settingsRow).safeParse(tables.settings ?? []).success
  if (!ok) return { ok: false, reason: DAMAGED }
  const progress = (tables.progress ?? []) as { box: number }[]
  const sessions = (tables.sessions ?? []) as { complete: boolean }[]
  const settings = (tables.settings ?? [])[0] as { childName?: string } | undefined
  return {
    ok: true,
    backup: { app: 'spelling-pets', schemaVersion: file.data.schemaVersion, exportedAt: file.data.exportedAt, tables },
    summary: {
      exportedAt: file.data.exportedAt,
      childName: settings?.childName ?? '',
      secureWords: progress.filter(p => p.box >= 4).length,
      sessions: sessions.filter(s => s.complete).length,
    },
  }
}

export async function importBackup(db: SpellingDB, backup: BackupFile): Promise<void> {
  const tables = BACKUP_TABLES.map(n => db.table(n))
  await db.transaction('rw', tables, async () => {
    for (const name of BACKUP_TABLES) {
      const t = db.table(name)
      await t.clear()
      const rows = backup.tables[name]
      if (rows?.length) await t.bulkAdd(rows)
    }
  })
}
