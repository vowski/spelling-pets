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
