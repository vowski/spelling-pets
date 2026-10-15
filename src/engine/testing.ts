import { newProgress, type LearnerState, type WordProgress } from './types'

export const T = '2026-10-15'

export const prog = (wordId: string, over: Partial<WordProgress> = {}): WordProgress => ({ ...newProgress(wordId), ...over })

export function makeState(over: Partial<LearnerState> & { progressList?: WordProgress[] } = {}): LearnerState {
  const { progressList, ...rest } = over
  return {
    today: T,
    progress: new Map((progressList ?? []).map(p => [p.wordId, p])),
    units: new Map(),
    placement: [],
    schoolLists: [],
    recentGames: [],
    lastNewKind: null,
    settings: { sessionMinutes: 10, newWordsPerDay: 4 },
    ...rest,
  }
}
