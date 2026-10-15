export type SetId = 'y1cew' | 'days' | 'hfw' | 'y2cew' | 'y34' | 'pattern' | 'school'
export type Year = 1 | 2 | 3 | 4

export interface Word {
  id: string
  text: string
  sets: SetId[]
  patternUnitIds: string[]
  /** Child-friendly, ≤ 10 words, contains the word. Empty only for custom words without one. */
  sentence: string
  syllables: string[]
  /** Character ranges [start, end) to highlight. */
  tricky: [number, number][]
  /** True when the word contains a capital (Monday, Mr, I, February…). */
  caseSensitive: boolean
  /** Id of the headword this word follows on from (accidentally → accident). */
  followOnOf?: string
  homophoneGroup?: string
  custom?: boolean
}

/** Authoring format: [spec, sentence, followOnOf-text?]. Spec: '|' between syllables, [..] around tricky letters. */
export type WordEntry = readonly [spec: string, sentence: string, followOnOf?: string]

/** Unit games refer to words by their TEXT; buildBank resolves them. */
export type UnitGame =
  | { kind: 'sort'; buckets: { id: string; label: string; words: string[] }[] }
  | { kind: 'builder'; pairs: { parts: string[]; word: string }[] }
  | { kind: 'homophone'; items: { sentence: string; answer: string; options: string[] }[] }
  | { kind: 'spell' }

export interface PatternUnitDef {
  id: string
  year: Year
  title: string
  /** One or two short sentences a 7-year-old can follow. */
  rule: string
  schoolPriority?: number
  /** Word TEXTS; their specs/sentences live in an earlier set or in words/pattern-words.ts. */
  words: string[]
  game: UnitGame
}

export interface PatternUnit {
  id: string
  year: Year
  title: string
  rule: string
  schoolPriority?: number
  wordIds: string[]
  game: UnitGame
}

export interface StorySentence {
  id: string
  text: string
  level: 1 | 2 | 3
  /** Bank words (curriculum sets only) that appear in the sentence. */
  wordIds: string[]
}

export interface CustomWord {
  wordId: string
  text: string
  sentence?: string
}
