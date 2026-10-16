export interface WheelPlacement { word: string; row: number; col: number; dir: 'across' | 'down' }
export interface WheelPuzzle { id: string; anchorWordId: string; letters: string[]; rows: number; cols: number; grid: WheelPlacement[]; bonus: string[] }

/** Generated in Task 37 by scripts/generate-wheel-puzzles.ts. */
export const WHEEL_PUZZLES: WheelPuzzle[] = []
export const WHEEL_ANCHORS: ReadonlySet<string> = new Set(WHEEL_PUZZLES.map(p => p.anchorWordId))
export const puzzlesForAnchor = (wordId: string) => WHEEL_PUZZLES.filter(p => p.anchorWordId === wordId)
