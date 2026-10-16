import type { Bank } from '../content'
import type { DateStr } from '../engine/dates'
import { isPlacementDone } from '../engine/placement'
import { evaluateAchievements, rewardProgress, type AchievementSnapshot, type Award, type RealReward } from '../engine/rewards'
import type { Rng } from '../engine/rng'
import { computeStats } from '../engine/stats'
import { weeksGoalMet } from '../engine/weekly'
import type { Repo } from '../storage/repo'

export async function buildSnapshot(repo: Repo, bank: Bank): Promise<AchievementSnapshot> {
  const [progress, units, placement, counters, dates, settings] = await Promise.all([
    repo.getAllProgress(), repo.getUnits(), repo.getPlacement(), repo.getCounters(), repo.completeSessionDates(), repo.getSettings(),
  ])
  const stats = computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(units.map(u => [u.unitId, u])), [])
  return {
    placementDone: isPlacementDone(placement) ? 1 : 0,
    secureTotal: stats.secureTotal,
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

export async function settleRealRewards(repo: Repo, bank: Bank, today: DateStr): Promise<RealReward[]> {
  const [rewards, dates, progress, settings] = await Promise.all([repo.getRealRewards(), repo.completeSessionDates(), repo.getAllProgress(), repo.getSettings()])
  const stats = computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(), [])
  const rewardStats = {
    completeSessionDates: dates,
    secureOnDates: progress.filter(p => p.box >= 4 && p.secureOn).map(p => p.secureOn!),
    weeklyGoalDays: settings.weeklyGoalDays,
    levelComplete: Object.fromEntries(Object.entries(stats.secureBySet).map(([k, v]) => [k, stats.sizeBySet[k as keyof typeof stats.sizeBySet] > 0 && v >= stats.sizeBySet[k as keyof typeof stats.sizeBySet]])),
  }
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
