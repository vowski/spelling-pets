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
// Each table's rows must have their key and the fields the app reads without checking, so a damaged file is
// turned away here rather than breaking the app after it has replaced everything.
const ids = z.array(z.string())
const autoId = z.number().optional()
const earnedRow = z.looseObject({ id: z.string(), earnedAt: z.number() })
const rowSchemas: Record<BackupTable, { key: string; row: z.ZodType }> = {
  settings: { key: 'id', row: z.looseObject({ id: z.literal('singleton'), childName: z.string(), coins: z.number(), sessionMinutes: z.number(), newWordsPerDay: z.number(), equipped: z.record(z.string(), z.string()) }) },
  progress: { key: 'wordId', row: z.looseObject({ wordId: z.string().min(3), box: z.number().int().min(0).max(5), due: z.string().nullable(), recallCorrectDays: ids, misspellings: z.record(z.string(), z.number()), seen: z.number(), correct: z.number() }) },
  attempts: { key: 'id', row: z.looseObject({ id: autoId, wordId: z.string(), sessionId: z.string(), at: z.number(), correct: z.boolean() }) },
  sessions: { key: 'id', row: z.looseObject({ id: z.string(), date: z.string(), startedAt: z.number(), complete: z.boolean(), doneActivityIds: ids, plan: z.looseObject({ activities: z.array(z.looseObject({ id: z.string(), gameType: z.string(), wordIds: ids })) }) }) },
  placement: { key: 'level', row: z.looseObject({ level: z.string(), sampledIds: ids, answers: z.record(z.string(), z.boolean()), status: z.string() }) },
  units: { key: 'unitId', row: z.looseObject({ unitId: z.string(), status: z.string(), taughtWordIds: ids }) },
  schoolLists: { key: 'id', row: z.looseObject({ id: z.string(), testDate: z.string(), items: z.array(z.looseObject({ text: z.string(), wordId: z.string() })) }) },
  customWords: { key: 'wordId', row: z.looseObject({ wordId: z.string(), text: z.string() }) },
  wallet: { key: 'id', row: z.looseObject({ id: autoId, at: z.number(), delta: z.number() }) },
  inventory: { key: 'itemId', row: z.looseObject({ itemId: z.string(), count: z.number() }) },
  stickers: { key: 'id', row: earnedRow },
  badges: { key: 'id', row: earnedRow },
  friends: { key: 'id', row: earnedRow },
  realRewards: { key: 'id', row: z.looseObject({ id: z.string(), title: z.string(), status: z.string(), goal: z.looseObject({ type: z.string(), target: z.number() }) }) },
  counters: { key: 'id', row: z.looseObject({ id: z.string(), value: z.number() }) },
  storyResults: { key: 'id', row: z.looseObject({ id: autoId, at: z.number() }) },
  errors: { key: 'id', row: z.looseObject({ id: autoId, at: z.number(), where: z.string(), message: z.string() }) },
}

function tableLooksRight(name: BackupTable, rows: unknown[]): boolean {
  const { key, row } = rowSchemas[name]
  if (!z.array(row).safeParse(rows).success) return false
  const keys = rows.map(r => (r as Record<string, unknown>)[key]).filter(k => k !== undefined)
  return new Set(keys).size === keys.length
}

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
  if (!BACKUP_TABLES.every(name => tableLooksRight(name, tables[name] ?? []))) return { ok: false, reason: DAMAGED }
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
