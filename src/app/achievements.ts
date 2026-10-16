import type { Bank } from '../content'
import type { SetId } from '../content/types'
import type { DateStr } from '../engine/dates'
import { isPlacementDone } from '../engine/placement'
import { evaluateAchievements, rewardProgress, type AchievementSnapshot, type Award, type RealReward, type RewardStats } from '../engine/rewards'
import type { Rng } from '../engine/rng'
import { computeStats } from '../engine/stats'
import type { WordProgress } from '../engine/types'
import { weeksGoalMet } from '../engine/weekly'
import type { Repo } from '../storage/repo'

export async function buildSnapshot(repo: Repo, bank: Bank): Promise<AchievementSnapshot> {
  const [progress, units, placement, counters, dates, settings] = await Promise.all([
    repo.getAllProgress(), repo.getUnits(), repo.getPlacement(), repo.getCounters(), repo.completeSessionDates(), repo.getSettings(),
  ])
  const stats = computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(units.map(u => [u.unitId, u])), [])
  return {
    placementDone: isPlacementDone(placement) ? 1 : 0,
    secureTotal: progress.filter(p => p.secureOn).length, // ever Secure: drives the pet and stickers, never goes down
    secureBySet: stats.secureBySet,
    sizeBySet: stats.sizeBySet,
    unitsDone: stats.unitsDone.size,
    weeklyGoalsMet: weeksGoalMet(dates, settings.weeklyGoalDays),
    ...counters,
  }
}

export async function settleAchievements(repo: Repo, before: AchievementSnapshot, after: AchievementSnapshot, nowMs: number, rng: Rng): Promise<Award[]> {
  const awards = evaluateAchievements(before, after, await repo.getEarned(), rng)
  await repo.addAwards(awards, nowMs)
  return awards
}

export function rewardStatsFrom(bank: Bank, progress: WordProgress[], dates: DateStr[], weeklyGoalDays: number): RewardStats {
  const stats = computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(), [])
  const levelComplete: Partial<Record<SetId, boolean>> = {}
  for (const k of Object.keys(stats.secureBySet) as SetId[]) levelComplete[k] = stats.sizeBySet[k] > 0 && stats.secureBySet[k] >= stats.sizeBySet[k]
  return { completeSessionDates: dates, secureOnDates: progress.filter(p => p.box >= 4 && p.secureOn).map(p => p.secureOn!), weeklyGoalDays, levelComplete }
}

export async function settleRealRewards(repo: Repo, bank: Bank, today: DateStr): Promise<RealReward[]> {
  const [rewards, dates, progress, settings] = await Promise.all([repo.getRealRewards(), repo.completeSessionDates(), repo.getAllProgress(), repo.getSettings()])
  const rewardStats = rewardStatsFrom(bank, progress, dates, settings.weeklyGoalDays)
  const earned: RealReward[] = []
  for (const r of rewards.filter(x => x.status === 'active')) {
    if (rewardProgress(r, rewardStats).done) {
      const next = { ...r, status: 'earned' as const, earnedAt: today }
      await repo.saveRealReward(next)
      earned.push(next)
    }
  }
  return earned
}
