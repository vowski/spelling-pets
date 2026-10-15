import { BADGES, FRIENDS, STICKERS, STICKER_SETS, type FriendDef } from '../content/rewards'
import type { SetId } from '../content/types'
import type { DateStr } from './dates'
import { pick, type Rng } from './rng'
import type { Role } from './types'
import { weeksGoalMet } from './weekly'

export const COINS = { recallCorrect: 3, otherCorrect: 1, huntChunk: 15, session: 20, bonusWord: 2, weeklyGoal: 50, duplicateSticker: 10 } as const

export function coinsForAttempt(role: Role, correct: boolean, firstTry: boolean, hint: boolean): number {
  if (!correct || !firstTry || hint) return 0
  if (role === 'recall' || role === 'pretest') return COINS.recallCorrect
  if (role === 'recognise' || role === 'build' || role === 'pattern') return COINS.otherCorrect
  return 0
}

export type PetStage = 'egg' | 'baby' | 'young' | 'grown' | 'super' | 'sparkly'
const STAGES: [PetStage, number][] = [['sparkly', 150], ['super', 80], ['grown', 40], ['young', 10], ['baby', 0]]

export function petStage(secureTotal: number, placementDone: boolean): PetStage {
  if (!placementDone) return 'egg'
  return STAGES.find(([, n]) => secureTotal >= n)![0]
}

export interface AchievementSnapshot {
  placementDone: number
  secureTotal: number
  secureBySet: Record<SetId, number>
  sizeBySet: Record<SetId, number>
  unitsDone: number
  weeklyGoalsMet: number
  wheelPuzzles: number
  wheelThreeStars: number
  bonusWords: number
  perfectStoryTimes: number
  punctuationSentences: number
}

export type Award =
  | { kind: 'sticker'; id: string }
  | { kind: 'badge'; id: string }
  | { kind: 'friend'; id: string }
  | { kind: 'coins'; amount: number; reason: string }

export interface Owned { stickers: ReadonlySet<string>; badges: ReadonlySet<string>; friends: ReadonlySet<string> }

export function stickerTriggers(s: AchievementSnapshot): number {
  return Math.floor(s.secureTotal / 5) + s.unitsDone + s.weeklyGoalsMet + Math.floor(s.wheelPuzzles / 10)
}

function friendUnlocked(f: FriendDef, s: AchievementSnapshot): boolean {
  const c = f.condition
  if (c.kind === 'setComplete') return s.sizeBySet[c.set] > 0 && s.secureBySet[c.set] >= s.sizeBySet[c.set]
  if (c.kind === 'setSecure') return s.secureBySet[c.set] >= c.count
  return s.unitsDone >= c.count
}

export function evaluateAchievements(prev: AchievementSnapshot, next: AchievementSnapshot, owned: Owned, rng: Rng): Award[] {
  const awards: Award[] = []
  const stickers = new Set(owned.stickers)
  const newStickers = Math.max(0, stickerTriggers(next) - stickerTriggers(prev))
  for (let i = 0; i < newStickers; i++) {
    const s = pick(STICKERS.filter(x => !stickers.has(x.id)), rng)
    if (s) {
      stickers.add(s.id)
      awards.push({ kind: 'sticker', id: s.id })
    } else {
      awards.push({ kind: 'coins', amount: COINS.duplicateSticker, reason: 'Your sticker album is full!' })
    }
  }
  for (const set of STICKER_SETS) {
    const id = `album-${set.id}`
    if (!owned.badges.has(id) && STICKERS.filter(s => s.set === set.id).every(s => stickers.has(s.id))) awards.push({ kind: 'badge', id })
  }
  for (const b of BADGES) {
    if (b.metric && b.atLeast !== undefined && !owned.badges.has(b.id) && next[b.metric] >= b.atLeast) awards.push({ kind: 'badge', id: b.id })
  }
  for (const f of FRIENDS) if (!owned.friends.has(f.id) && friendUnlocked(f, next)) awards.push({ kind: 'friend', id: f.id })
  return awards
}

export interface RealReward {
  id: string
  title: string
  emoji: string
  goal: { type: 'sessions' | 'secureWords' | 'weeklyGoals' | 'daysPractised' | 'levelComplete'; target: number; levelId?: SetId; countFrom: 'creation' | 'allTime' }
  status: 'active' | 'earned' | 'given'
  createdAt: DateStr
  earnedAt?: DateStr
  givenAt?: DateStr
}

export interface RewardStats {
  completeSessionDates: readonly DateStr[]
  secureOnDates: readonly DateStr[]
  weeklyGoalDays: number
  levelComplete: Partial<Record<SetId, boolean>>
}

export function rewardProgress(r: RealReward, s: RewardStats): { current: number; target: number; done: boolean } {
  const from = r.goal.countFrom === 'creation' ? r.createdAt : '0000-01-01'
  const sinceFrom = (ds: readonly DateStr[]) => ds.filter(d => d >= from)
  let current: number
  let target = r.goal.target
  switch (r.goal.type) {
    case 'sessions': current = sinceFrom(s.completeSessionDates).length; break
    case 'secureWords': current = sinceFrom(s.secureOnDates).length; break
    case 'daysPractised': current = new Set(sinceFrom(s.completeSessionDates)).size; break
    case 'weeklyGoals': current = weeksGoalMet(s.completeSessionDates, s.weeklyGoalDays, r.goal.countFrom === 'creation' ? r.createdAt : undefined); break
    case 'levelComplete': current = r.goal.levelId && s.levelComplete[r.goal.levelId] ? 1 : 0; target = 1; break
  }
  return { current, target, done: current >= target }
}
