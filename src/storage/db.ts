import Dexie, { type EntityTable } from 'dexie'
import type { AccessorySlot } from '../content/rewards'
import type { CustomWord } from '../content/types'
import type { DateStr } from '../engine/dates'
import type { SessionPlan } from '../engine/planner'
import type { AchievementSnapshot, RealReward } from '../engine/rewards'
import type { GameType, PlacementLevelState, Role, SchoolList, UnitState, UnlockYear, WordProgress } from '../engine/types'

export type PetSpecies = 'puppy' | 'kitten' | 'bunny' | 'fox' | 'panda'

export interface SettingsRow {
  id: 'singleton'
  childName: string
  petName: string
  petSpecies: PetSpecies
  pinHash: string
  pinSalt: string
  voiceURI: string | null
  speechRate: number
  sessionMinutes: number
  newWordsPerDay: number
  weeklyGoalDays: number
  soundOn: boolean
  musicOn: boolean
  dyslexiaFont: boolean
  lastBackupAt: number | null
  /** Outcome of the last automatic backup, so the dashboard can say at once when it stops working. */
  lastAutoBackup?: 'written' | 'needs-permission' | 'error'
  firstRunDone: boolean
  lastNewKind: 'words' | 'unit' | null
  /** The highest school year she practises; unset (older data) means Year 3. */
  highestYear?: UnlockYear
  coins: number
  equipped: Partial<Record<AccessorySlot, string>>
  hatched: boolean
  /** The grown-up switched AI spelling tips on (off by default). */
  aiTipsOn?: boolean
  /** Words the grown-up set to always use the plain tip. */
  plainTipWordIds?: string[]
}

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 'singleton', childName: '', petName: '', petSpecies: 'puppy', pinHash: '', pinSalt: '',
  voiceURI: null, speechRate: 0.85, sessionMinutes: 10, newWordsPerDay: 4, weeklyGoalDays: 5,
  soundOn: true, musicOn: false, dyslexiaFont: false, lastBackupAt: null, firstRunDone: false,
  lastNewKind: null, coins: 0, equipped: {}, hatched: false,
}

export interface AttemptRow {
  id?: number; wordId: string; sessionId: string; game: GameType; role: Role; at: number; typed: string; correct: boolean; firstTry: boolean; hint: boolean
  /** The activity and the go at it (a resumed activity starts again as a new run), so replayed answers can be told apart. */
  activityId?: string; run?: string
}
export type SessionKind = 'main' | 'extra' | 'free'
export interface SessionRow { id: string; date: DateStr; kind: SessionKind; startedAt: number; endedAt: number | null; plan: SessionPlan; doneActivityIds: string[]; complete: boolean; coins: number; startSnapshot?: AchievementSnapshot }
/** A spelling tip: a cached AI tip (key …|<tip version>) or the last tip shown for a word (key …|shown). */
export interface TipRow { key: string; wordId: string; attempt: string; text: string; source: 'ai' | 'plain'; at: number }
export interface WalletRow { id?: number; at: number; delta: number; reason: string }
export interface InventoryRow { itemId: string; count: number }
export interface EarnedRow { id: string; earnedAt: number }
export type CounterId = 'wheelPuzzles' | 'wheelThreeStars' | 'bonusWords' | 'perfectStoryTimes' | 'punctuationSentences'
export interface CounterRow { id: CounterId; value: number }
export interface StoryResultRow { id?: number; at: number; wordAccuracy: number; punctuationOk: boolean }
export interface ErrorRow { id?: number; at: number; where: string; message: string }
export interface HandleRow { id: 'backupDir'; handle: FileSystemDirectoryHandle }

export class SpellingDB extends Dexie {
  settings!: EntityTable<SettingsRow, 'id'>
  progress!: EntityTable<WordProgress, 'wordId'>
  attempts!: EntityTable<AttemptRow, 'id'>
  sessions!: EntityTable<SessionRow, 'id'>
  placement!: EntityTable<PlacementLevelState, 'level'>
  units!: EntityTable<UnitState, 'unitId'>
  schoolLists!: EntityTable<SchoolList, 'id'>
  customWords!: EntityTable<CustomWord, 'wordId'>
  wallet!: EntityTable<WalletRow, 'id'>
  inventory!: EntityTable<InventoryRow, 'itemId'>
  stickers!: EntityTable<EarnedRow, 'id'>
  badges!: EntityTable<EarnedRow, 'id'>
  friends!: EntityTable<EarnedRow, 'id'>
  realRewards!: EntityTable<RealReward, 'id'>
  counters!: EntityTable<CounterRow, 'id'>
  storyResults!: EntityTable<StoryResultRow, 'id'>
  errors!: EntityTable<ErrorRow, 'id'>
  handles!: EntityTable<HandleRow, 'id'>
  tips!: EntityTable<TipRow, 'key'>

  constructor(name = 'spelling-pets') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      progress: 'wordId, box, due',
      attempts: '++id, wordId, sessionId, at',
      sessions: 'id, date',
      placement: 'level',
      units: 'unitId',
      schoolLists: 'id, testDate',
      customWords: 'wordId',
      wallet: '++id, at',
      inventory: 'itemId',
      stickers: 'id',
      badges: 'id',
      friends: 'id',
      realRewards: 'id',
      counters: 'id',
      storyResults: '++id, at',
      errors: '++id, at',
      handles: 'id',
    })
    // Version 2: spelling tips. Not in BACKUP_TABLES: tips can always be made again.
    this.version(2).stores({ tips: 'key, wordId, at' })
  }
}

export const BACKUP_TABLES = [
  'settings', 'progress', 'attempts', 'sessions', 'placement', 'units', 'schoolLists', 'customWords', 'wallet',
  'inventory', 'stickers', 'badges', 'friends', 'realRewards', 'counters', 'storyResults', 'errors',
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]
