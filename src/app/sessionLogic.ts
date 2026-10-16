import type { Bank } from '../content'
import { WHEEL_ANCHORS } from '../content/wheel'
import type { DateStr } from '../engine/dates'
import { finaliseLevels, recordPlacementAnswer } from '../engine/placement'
import { GAME_META, planSession, type Activity } from '../engine/planner'
import { COINS, petStage, type Award, type PetStage, type RealReward } from '../engine/rewards'
import { hashString, makeRng } from '../engine/rng'
import type { Role } from '../engine/types'
import { afterUnitCheck, finishUnitDay, recordUnitTaught, startUnit } from '../engine/units'
import { weekProgress } from '../engine/weekly'
import type { GameAttempt, GameSummary } from '../games/types'
import { writeAutoBackup } from '../storage/autoBackup'
import type { SessionRow } from '../storage/db'
import type { Repo } from '../storage/repo'
import { buildSnapshot, settleAchievements, settleRealRewards } from './achievements'

type Svc = { repo: Repo; bank: Bank }
const UNIT_GAMES = new Set(['sortPen', 'builder', 'hedgehog', 'bunnyHop'])

export async function startOrResumeSession(svc: Svc, kind: 'main' | 'extra', today: DateStr, nowMs: number): Promise<SessionRow> {
  const existing = await svc.repo.getSessionForDay(today, kind)
  if (existing && (kind === 'main' || !existing.complete)) return existing
  const startSnapshot = await buildSnapshot(svc.repo, svc.bank) // before any planning side effects
  const state = await svc.repo.loadLearnerState(today)
  const plan = planSession(svc.bank, state, { seed: hashString(`${today}:${kind}:${nowMs}`), wheelAnchors: WHEEL_ANCHORS, extra: kind === 'extra' })
  if (plan.placementInit) await svc.repo.savePlacement(plan.placementInit)
  const nm = plan.newMaterial
  if (nm.kind === 'unit' && nm.day === 1) await svc.repo.saveUnit(startUnit(nm.unitId, today))
  if (kind === 'main' && nm.kind !== 'none') await svc.repo.updateSettings({ lastNewKind: nm.kind === 'unit' ? 'unit' : 'words' })
  const row: SessionRow = { id: `${today}-${kind}-${nowMs}`, date: today, kind, startedAt: nowMs, endedAt: null, plan, doneActivityIds: [], complete: false, coins: 0, startSnapshot }
  await svc.repo.saveSession(row)
  return row
}

export async function nextActivity(svc: Svc, row: SessionRow): Promise<Activity | null> {
  const units = new Map((await svc.repo.getUnits()).map(u => [u.unitId, u]))
  return row.plan.activities.find(a =>
    !row.doneActivityIds.includes(a.id) &&
    !(a.onlyIfUnitNotKnown && a.unitId && units.get(a.unitId)?.status === 'known')) ?? null
}

export function attemptRoles(activity: Activity, a: GameAttempt): { role: Role; coinRole: Role } {
  const base = a.role ?? GAME_META[activity.gameType].role
  return { role: activity.practiceOnly ? 'placement' : base, coinRole: base }
}

export async function recordGameAttempt(svc: Svc, row: SessionRow, activity: Activity, a: GameAttempt, today: DateStr, nowMs: number): Promise<number> {
  const { role, coinRole } = attemptRoles(activity, a)
  if (activity.gameType === 'treasureHunt') {
    await svc.repo.savePlacement(recordPlacementAnswer(await svc.repo.getPlacement(), a.wordId, a.correct))
  }
  const { coins } = await svc.repo.recordAttempt({
    sessionId: row.id, game: activity.gameType, coinRole, today, nowMs,
    attempt: { wordId: a.wordId, role, correct: a.correct, firstTry: a.firstTry, hint: a.hint, typed: a.typed },
  })
  return coins
}

export async function completeActivity(svc: Svc, row: SessionRow, activity: Activity, summary: GameSummary | undefined, today: DateStr, nowMs: number): Promise<SessionRow> {
  const { repo, bank } = svc
  const unitState = activity.unitId ? (await repo.getUnits()).find(u => u.unitId === activity.unitId) : undefined

  if (activity.gameType === 'treasureHunt') {
    const progress = new Map((await repo.getAllProgress()).map(p => [p.wordId, p]))
    const { levels, updates } = finaliseLevels(await repo.getPlacement(), bank, progress, today)
    await repo.putProgress(updates)
    await repo.savePlacement(levels)
    await repo.addCoins(COINS.huntChunk, 'Treasure Hunt', nowMs)
  } else if (activity.gameType === 'unitCheck' && unitState) {
    const unit = bank.unitById.get(unitState.unitId)!
    const results = summary?.unitCheckResults ?? []
    const progress = new Map((await repo.getAllProgress()).map(p => [p.wordId, p]))
    const out = afterUnitCheck(unitState, unit, results.length >= 3 && results.every(Boolean), progress, today)
    await repo.saveUnit(out.unit)
    await repo.putProgress(out.updates)
  } else if (activity.gameType === 'workshop' && unitState) {
    await repo.saveUnit(recordUnitTaught(unitState, activity.wordIds))
  } else if (UNIT_GAMES.has(activity.gameType) && unitState && activity.unitDay) {
    await repo.saveUnit(finishUnitDay(unitState, activity.unitDay, today))
  } else if (activity.gameType === 'storyTime' && summary?.storyResults) {
    for (const r of summary.storyResults) await repo.addStoryResult({ at: nowMs, wordAccuracy: r.wordAccuracy, punctuationOk: r.punctuationOk })
    await repo.bumpCounter('perfectStoryTimes', summary.storyResults.filter(r => r.perfect).length)
    await repo.bumpCounter('punctuationSentences', summary.storyResults.filter(r => r.punctuationOk).length)
  } else if (activity.gameType === 'wheel' && summary?.wheel) {
    await repo.bumpCounter('wheelPuzzles', summary.wheel.puzzles)
    await repo.bumpCounter('wheelThreeStars', summary.wheel.threeStars)
    await repo.bumpCounter('bonusWords', summary.wheel.bonusWords)
    if (summary.wheel.bonusWords) await repo.addCoins(summary.wheel.bonusWords * COINS.bonusWord, 'Bonus words', nowMs)
  }
  return repo.markActivityDone(row.id, activity.id)
}

export interface SessionOutcome { coins: number; weeklyGoalJustMet: boolean; awards: Award[]; earnedRewards: RealReward[]; stageBefore: PetStage; stageAfter: PetStage; hatched: boolean }

export async function finishSession(svc: Svc, row: SessionRow, today: DateStr, nowMs: number): Promise<SessionOutcome> {
  const { repo, bank } = svc
  const start = row.startSnapshot ?? (await buildSnapshot(repo, bank))
  const settings = await repo.getSettings()
  const wasMet = weekProgress(await repo.completeSessionDates(), today, settings.weeklyGoalDays).met
  await repo.completeSession(row.id, nowMs)
  let coins = COINS.session
  await repo.addCoins(COINS.session, 'Session complete', nowMs)
  const weeklyGoalJustMet = !wasMet && weekProgress(await repo.completeSessionDates(), today, settings.weeklyGoalDays).met
  if (weeklyGoalJustMet) {
    await repo.addCoins(COINS.weeklyGoal, 'Weekly goal', nowMs)
    coins += COINS.weeklyGoal
  }
  const after = await buildSnapshot(repo, bank)
  const awards = await settleAchievements(repo, start, after, nowMs, makeRng(hashString(row.id)))
  const earnedRewards = await settleRealRewards(repo, bank, today)
  void writeAutoBackup(repo, today, nowMs) // last, so the backup includes the awards
  return {
    coins, weeklyGoalJustMet, awards, earnedRewards,
    stageBefore: petStage(start.secureTotal, start.placementDone === 1),
    stageAfter: petStage(after.secureTotal, after.placementDone === 1),
    hatched: start.placementDone === 0 && after.placementDone === 1,
  }
}
