import type { Word } from '../content/types'
import type { Activity } from '../engine/planner'
import type { Role } from '../engine/types'

export interface GameAttempt { wordId: string; correct: boolean; firstTry: boolean; hint: boolean; typed?: string; role?: Role }
export interface StoryOutcome { wordAccuracy: number; punctuationOk: boolean; perfect: boolean }
export interface GameSummary {
  unitCheckResults?: boolean[]
  storyResults?: StoryOutcome[]
  wheel?: { puzzles: number; threeStars: number; bonusWords: number }
}
export interface GameProps {
  activity: Activity
  words: Word[]
  onAttempt: (a: GameAttempt) => void
  onDone: (s?: GameSummary) => void
}
