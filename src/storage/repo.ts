import type { CustomWord } from '../content/types'
import type { DateStr } from '../engine/dates'
import { PLACEMENT_LEVELS } from '../engine/placement'
import { coinsForAttempt, type Award, type Owned, type RealReward } from '../engine/rewards'
import { applyAttempt } from '../engine/scheduler'
import {
  newProgress, type Attempt, type GameType, type LearnerState, type PlacementLevelState, type Role,
  type SchoolList, type UnitState, type WordProgress,
} from '../engine/types'
import {
  DEFAULT_SETTINGS, SpellingDB, type AttemptRow, type CounterId, type ErrorRow, type InventoryRow,
  type SessionKind, type SessionRow, type SettingsRow, type StoryResultRow,
} from './db'

const COUNTERS: CounterId[] = ['wheelPuzzles', 'wheelThreeStars', 'bonusWords', 'perfectStoryTimes', 'punctuationSentences']

export class Repo {
  readonly db: SpellingDB

  constructor(db: SpellingDB) {
    this.db = db
  }

  static open(name?: string): Repo {
    return new Repo(new SpellingDB(name))
  }

  // Settings
  async getSettings(): Promise<SettingsRow> {
    return (await this.db.settings.get('singleton')) ?? { ...DEFAULT_SETTINGS }
  }

  async updateSettings(patch: Partial<Omit<SettingsRow, 'id'>>): Promise<SettingsRow> {
    return this.db.transaction('rw', this.db.settings, async () => {
      const next: SettingsRow = { ...(await this.getSettings()), ...patch, id: 'singleton' }
      await this.db.settings.put(next)
      return next
    })
  }

  // Learner state
  async loadLearnerState(today: DateStr): Promise<LearnerState> {
    const [settings, progress, units, placement, schoolLists, sessions] = await Promise.all([
      this.getSettings(), this.db.progress.toArray(), this.db.units.toArray(), this.getPlacement(),
      this.db.schoolLists.toArray(), this.db.sessions.toArray(),
    ])
    const recentGames: GameType[] = []
    for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
      const done = s.plan.activities.filter(a => s.doneActivityIds.includes(a.id)).reverse()
      for (const a of done) recentGames.push(a.gameType)
      if (recentGames.length >= 20) break
    }
    return {
      today,
      progress: new Map(progress.map(p => [p.wordId, p])),
      units: new Map(units.map(u => [u.unitId, u])),
      placement,
      schoolLists,
      recentGames: recentGames.slice(0, 20),
      lastNewKind: settings.lastNewKind,
      settings: { sessionMinutes: settings.sessionMinutes, newWordsPerDay: settings.newWordsPerDay },
    }
  }

  // Progress and attempts
  async getAllProgress(): Promise<WordProgress[]> {
    return this.db.progress.toArray()
  }

  async putProgress(rows: readonly WordProgress[]): Promise<void> {
    if (rows.length) await this.db.progress.bulkPut([...rows])
  }

  async recordAttempt(a: { sessionId: string; activityId?: string; run?: string; game: GameType; attempt: Attempt; coinRole: Role; noCoins?: boolean; today: DateStr; nowMs: number }): Promise<{ progress: WordProgress; coins: number }> {
    const { attempt } = a
    return this.db.transaction('rw', [this.db.progress, this.db.attempts, this.db.wallet, this.db.settings], async () => {
      const prev = (await this.db.progress.get(attempt.wordId)) ?? newProgress(attempt.wordId)
      const progress = applyAttempt(prev, attempt, a.today, a.nowMs)
      await this.db.progress.put(progress)
      await this.db.attempts.add({
        wordId: attempt.wordId, sessionId: a.sessionId, game: a.game, role: attempt.role, at: a.nowMs,
        typed: attempt.typed ?? '', correct: attempt.correct, firstTry: attempt.firstTry, hint: attempt.hint,
        ...(a.activityId ? { activityId: a.activityId } : {}), ...(a.run ? { run: a.run } : {}),
      })
      const coins = a.noCoins ? 0 : coinsForAttempt(a.coinRole, attempt.correct, attempt.firstTry, attempt.hint)
      if (coins) await this.addCoins(coins, a.game, a.nowMs)
      return { progress, coins }
    })
  }

  /** How many first tries at this word each go (run) at this activity recorded. */
  async firstTriesByRun(sessionId: string, activityId: string, wordId: string): Promise<Map<string, number>> {
    const rows = await this.db.attempts.where('sessionId').equals(sessionId).filter(r => r.activityId === activityId && r.wordId === wordId && r.firstTry).toArray()
    const out = new Map<string, number>()
    for (const r of rows) out.set(r.run ?? '', (out.get(r.run ?? '') ?? 0) + 1)
    return out
  }

  async attemptsForWord(wordId: string): Promise<AttemptRow[]> {
    return this.db.attempts.where('wordId').equals(wordId).sortBy('at')
  }

  // Coins
  async balance(): Promise<number> {
    return (await this.getSettings()).coins
  }

  async addCoins(delta: number, reason: string, nowMs: number): Promise<number> {
    return this.db.transaction('rw', [this.db.wallet, this.db.settings], async () => {
      const s = await this.getSettings()
      const coins = Math.max(0, s.coins + delta)
      await this.db.wallet.add({ at: nowMs, delta, reason })
      await this.db.settings.put({ ...s, coins })
      return coins
    })
  }

  /** Words that have ever reached Secure. It never goes down, so the pet never shrinks after a slip. */
  everSecureCount(): Promise<number> {
    return this.db.progress.filter(p => !!p.secureOn).count()
  }

  async spendCoins(price: number, reason: string, nowMs: number): Promise<boolean> {
    return this.db.transaction('rw', [this.db.wallet, this.db.settings], async () => {
      if ((await this.balance()) < price) return false
      await this.addCoins(-price, reason, nowMs)
      return true
    })
  }

  // Placement and units
  async getPlacement(): Promise<PlacementLevelState[]> {
    const rows = await this.db.placement.toArray()
    const order = PLACEMENT_LEVELS.map(l => l.level)
    return rows.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
  }

  async savePlacement(levels: readonly PlacementLevelState[]): Promise<void> {
    await this.db.placement.bulkPut([...levels])
  }

  async getUnits(): Promise<UnitState[]> {
    return this.db.units.toArray()
  }

  async saveUnit(u: UnitState): Promise<void> {
    await this.db.units.put(u)
  }

  // Sessions
  async getSession(id: string): Promise<SessionRow | undefined> {
    return this.db.sessions.get(id)
  }

  async getSessionForDay(date: DateStr, kind: SessionKind): Promise<SessionRow | undefined> {
    const rows = await this.db.sessions.where('date').equals(date).toArray()
    return rows.filter(r => r.kind === kind).sort((a, b) => b.startedAt - a.startedAt)[0]
  }

  async saveSession(row: SessionRow): Promise<void> {
    await this.db.sessions.put(row)
  }

  async markActivityDone(sessionId: string, activityId: string): Promise<SessionRow> {
    return this.db.transaction('rw', this.db.sessions, async () => {
      const s = await this.db.sessions.get(sessionId)
      if (!s) throw new Error(`No session ${sessionId}`)
      const next = s.doneActivityIds.includes(activityId) ? s : { ...s, doneActivityIds: [...s.doneActivityIds, activityId] }
      await this.db.sessions.put(next)
      return next
    })
  }

  async completeSession(sessionId: string, nowMs: number): Promise<SessionRow> {
    return this.db.transaction('rw', this.db.sessions, async () => {
      const s = await this.db.sessions.get(sessionId)
      if (!s) throw new Error(`No session ${sessionId}`)
      const next = { ...s, complete: true, endedAt: nowMs }
      await this.db.sessions.put(next)
      return next
    })
  }

  async allSessions(): Promise<SessionRow[]> {
    return this.db.sessions.orderBy('date').toArray()
  }

  async completeSessionDates(): Promise<DateStr[]> {
    return (await this.allSessions()).filter(s => s.complete && s.kind !== 'free').map(s => s.date)
  }

  // School lists
  async getSchoolLists(): Promise<SchoolList[]> {
    return this.db.schoolLists.orderBy('testDate').toArray()
  }

  async saveSchoolList(list: SchoolList, custom: readonly CustomWord[]): Promise<void> {
    await this.db.transaction('rw', [this.db.schoolLists, this.db.customWords], async () => {
      await this.db.schoolLists.put(list)
      if (custom.length) await this.db.customWords.bulkPut([...custom])
    })
  }

  async deleteSchoolList(id: string): Promise<void> {
    await this.db.schoolLists.delete(id)
  }

  async getCustomWords(): Promise<CustomWord[]> {
    return this.db.customWords.toArray()
  }

  // Inventory
  async getInventory(): Promise<InventoryRow[]> {
    return (await this.db.inventory.toArray()).filter(r => r.count > 0)
  }

  async addItem(itemId: string): Promise<void> {
    await this.db.transaction('rw', this.db.inventory, async () => {
      const row = await this.db.inventory.get(itemId)
      await this.db.inventory.put({ itemId, count: (row?.count ?? 0) + 1 })
    })
  }

  async useItem(itemId: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.inventory, async () => {
      const row = await this.db.inventory.get(itemId)
      if (!row || row.count < 1) return false
      await this.db.inventory.put({ itemId, count: row.count - 1 })
      return true
    })
  }

  // Awards
  async getEarned(): Promise<Owned> {
    const [stickers, badges, friends] = await Promise.all([this.db.stickers.toArray(), this.db.badges.toArray(), this.db.friends.toArray()])
    return { stickers: new Set(stickers.map(r => r.id)), badges: new Set(badges.map(r => r.id)), friends: new Set(friends.map(r => r.id)) }
  }

  async addAwards(awards: readonly Award[], nowMs: number): Promise<void> {
    for (const a of awards) {
      if (a.kind === 'sticker') await this.db.stickers.put({ id: a.id, earnedAt: nowMs })
      else if (a.kind === 'badge') await this.db.badges.put({ id: a.id, earnedAt: nowMs })
      else if (a.kind === 'friend') await this.db.friends.put({ id: a.id, earnedAt: nowMs })
      else await this.addCoins(a.amount, a.reason, nowMs)
    }
  }

  // Counters and story results
  async getCounters(): Promise<Record<CounterId, number>> {
    const rows = await this.db.counters.toArray()
    const out = Object.fromEntries(COUNTERS.map(c => [c, 0])) as Record<CounterId, number>
    rows.forEach(r => { out[r.id] = r.value })
    return out
  }

  async bumpCounter(id: CounterId, by: number): Promise<void> {
    await this.db.transaction('rw', this.db.counters, async () => {
      const row = await this.db.counters.get(id)
      await this.db.counters.put({ id, value: (row?.value ?? 0) + by })
    })
  }

  async addStoryResult(r: Omit<StoryResultRow, 'id'>): Promise<void> {
    await this.db.storyResults.add(r)
  }

  async recentStoryResults(limit = 50): Promise<StoryResultRow[]> {
    return (await this.db.storyResults.orderBy('at').reverse().limit(limit).toArray()).reverse()
  }

  // Real rewards
  async getRealRewards(): Promise<RealReward[]> {
    return this.db.realRewards.toArray()
  }

  async saveRealReward(r: RealReward): Promise<void> {
    await this.db.realRewards.put(r)
  }

  async deleteRealReward(id: string): Promise<void> {
    await this.db.realRewards.delete(id)
  }

  // Errors
  async logError(where: string, message: string, nowMs: number): Promise<void> {
    await this.db.errors.add({ at: nowMs, where, message: message.slice(0, 500) })
  }

  async getErrors(): Promise<ErrorRow[]> {
    return this.db.errors.orderBy('at').reverse().limit(100).toArray()
  }
}
