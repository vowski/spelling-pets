import type { DateStr } from './dates'

export type Box = 0 | 1 | 2 | 3 | 4 | 5
export type Role = 'teach' | 'pretest' | 'recall' | 'recognise' | 'build' | 'pattern' | 'placement'
export type GameType =
  | 'workshop' | 'pupPost' | 'storyTime' | 'wheel' | 'wombat' | 'bunnyHop' | 'burrow'
  | 'sortPen' | 'builder' | 'hedgehog' | 'bubblePop' | 'treasureHunt' | 'unitCheck'

export interface WordProgress {
  wordId: string
  box: Box
  due: DateStr | null
  introducedOn: DateStr | null
  lastSeenAt: number | null
  lastPromotedOn: DateStr | null
  lastFailedOn: DateStr | null
  /** First date the word reached box 4. Never cleared. */
  secureOn: DateStr | null
  recallCorrectDays: DateStr[]
  seen: number
  correct: number
  misspellings: Record<string, number>
  focus: boolean
  parentKnown: boolean
}

export interface Attempt {
  wordId: string
  role: Role
  correct: boolean
  firstTry: boolean
  hint: boolean
  typed?: string
}

export function newProgress(wordId: string): WordProgress {
  return {
    wordId, box: 0, due: null, introducedOn: null, lastSeenAt: null, lastPromotedOn: null,
    lastFailedOn: null, secureOn: null, recallCorrectDays: [], seen: 0, correct: 0,
    misspellings: {}, focus: false, parentKnown: false,
  }
}

export type PlacementLevel = 'y1cew' | 'days' | 'hfw' | 'y2cew' | 'y34'

export interface PlacementLevelState {
  level: PlacementLevel
  sampledIds: string[]
  answers: Record<string, boolean>
  status: 'pending' | 'done'
  placed: boolean
}

export type UnitStatus = 'checking' | 'learning' | 'known' | 'complete'

export interface UnitState {
  unitId: string
  status: UnitStatus
  startedOn: DateStr
  completedOn: DateStr | null
  taughtWordIds: string[]
}

export interface SchoolListItem {
  text: string
  wordId: string
  sentence?: string
}

export interface SchoolList {
  id: string
  createdAt: DateStr
  testDate: DateStr
  items: SchoolListItem[]
  score?: number
  outOf?: number
}

export interface PlannerSettings {
  sessionMinutes: number
  newWordsPerDay: number
}

export interface LearnerState {
  today: DateStr
  progress: ReadonlyMap<string, WordProgress>
  units: ReadonlyMap<string, UnitState>
  placement: readonly PlacementLevelState[]
  schoolLists: readonly SchoolList[]
  recentGames: readonly GameType[]
  lastNewKind: 'words' | 'unit' | null
  settings: PlannerSettings
}

export function getProgress(state: Pick<LearnerState, 'progress'>, id: string): WordProgress {
  return state.progress.get(id) ?? newProgress(id)
}
