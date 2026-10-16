import { useLiveQuery } from 'dexie-react-hooks'
import { rewardStatsFrom } from './achievements'
import { useServices } from './services'

export function useRewardStats() {
  const { repo, bank } = useServices()
  return useLiveQuery(async () => {
    const [progress, dates, settings] = await Promise.all([repo.getAllProgress(), repo.completeSessionDates(), repo.getSettings()])
    return rewardStatsFrom(bank, progress, dates, settings.weeklyGoalDays)
  }, [repo, bank])
}
