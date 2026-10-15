import type { SetId } from './types'

export type Band = 'towards' | 'at' | 'greaterDepth'
export type StandardEvaluator =
  | { kind: 'setSecureFraction'; set: SetId; fraction: number }
  | { kind: 'setSecureCount'; set: SetId; count: number }
  | { kind: 'unitsDone'; unitIds: string[] }
  | { kind: 'yearUnitsFraction'; year: 1 | 2 | 3 | 4; fraction: number }
  | { kind: 'storyTime'; lastN: number; minWordAccuracy: number; minPunctuation: number }

export interface StandardRow { id: string; grid: 1 | 2 | 3; band: Band; text: string; evaluator: StandardEvaluator }

/** Spelling statements from the school's Y1–Y3 writing grids, paraphrased. */
export const STANDARDS: StandardRow[] = [
  // Year 1
  { id: 'y1-t-hfw', grid: 1, band: 'towards', text: 'Begins to spell some of the first 100 high-frequency words', evaluator: { kind: 'setSecureFraction', set: 'hfw', fraction: 0.25 } },
  { id: 'y1-t-cew', grid: 1, band: 'towards', text: 'Writes some common irregular words', evaluator: { kind: 'setSecureFraction', set: 'y1cew', fraction: 0.25 } },
  { id: 'y1-t-rules', grid: 1, band: 'towards', text: 'Applies about half of the Year 1 spelling rules', evaluator: { kind: 'yearUnitsFraction', year: 1, fraction: 0.5 } },
  { id: 'y1-a-cew', grid: 1, band: 'at', text: 'Spells some common exception words', evaluator: { kind: 'setSecureFraction', set: 'y1cew', fraction: 0.5 } },
  { id: 'y1-a-days', grid: 1, band: 'at', text: 'Spells the days of the week', evaluator: { kind: 'setSecureCount', set: 'days', count: 6 } },
  { id: 'y1-a-rules', grid: 1, band: 'at', text: 'Applies the Year 1 spelling rules', evaluator: { kind: 'yearUnitsFraction', year: 1, fraction: 0.9 } },
  { id: 'y1-a-suffixes', grid: 1, band: 'at', text: 'Uses -s/-es, -ing, -ed, -er, -est and un-', evaluator: { kind: 'unitsDone', unitIds: ['y1-s-es', 'y1-ing-ed-er', 'y1-er-est', 'y1-un'] } },
  { id: 'y1-a-dictation', grid: 1, band: 'at', text: 'Writes simple dictated sentences from memory', evaluator: { kind: 'storyTime', lastN: 10, minWordAccuracy: 0.7, minPunctuation: 0.7 } },
  { id: 'y1-g-rules', grid: 1, band: 'greaterDepth', text: 'Independently applies all the Year 1 spelling rules', evaluator: { kind: 'yearUnitsFraction', year: 1, fraction: 1 } },
  { id: 'y1-g-cew', grid: 1, band: 'greaterDepth', text: 'Spelling of Year 1 words is generally accurate', evaluator: { kind: 'setSecureFraction', set: 'y1cew', fraction: 0.9 } },
  // Year 2
  { id: 'y2-t-hfw', grid: 2, band: 'towards', text: 'Spells most of the 100 high-frequency words', evaluator: { kind: 'setSecureFraction', set: 'hfw', fraction: 0.75 } },
  { id: 'y2-t-y1rules', grid: 2, band: 'towards', text: 'Applies all the spelling patterns from Year 1', evaluator: { kind: 'yearUnitsFraction', year: 1, fraction: 1 } },
  { id: 'y2-a-cew', grid: 2, band: 'at', text: 'Spells common exception words', evaluator: { kind: 'setSecureFraction', set: 'y2cew', fraction: 0.8 } },
  { id: 'y2-a-graphemes', grid: 2, band: 'at', text: 'Knows alternative spellings for sounds', evaluator: { kind: 'yearUnitsFraction', year: 2, fraction: 0.75 } },
  { id: 'y2-a-contractions', grid: 2, band: 'at', text: 'Spells words with contracted forms', evaluator: { kind: 'unitsDone', unitIds: ['y2-contractions'] } },
  { id: 'y2-a-homophones', grid: 2, band: 'at', text: 'Tells homophones and near-homophones apart', evaluator: { kind: 'unitsDone', unitIds: ['y2-homophones'] } },
  { id: 'y2-a-suffixes', grid: 2, band: 'at', text: 'Adds suffixes such as -ful and -ly', evaluator: { kind: 'unitsDone', unitIds: ['y2-suffixes'] } },
  { id: 'y2-g-suffixes', grid: 2, band: 'greaterDepth', text: 'Adds -ment, -ness, -less and other suffixes correctly', evaluator: { kind: 'unitsDone', unitIds: ['y2-suffixes', 'y2-drop-e', 'y2-double', 'y2-y-to-i', 'y2-ies'] } },
  { id: 'y2-g-cew', grid: 2, band: 'greaterDepth', text: 'Spells most common exception words', evaluator: { kind: 'setSecureFraction', set: 'y2cew', fraction: 0.9 } },
  // Year 3
  { id: 'y3-t-cew', grid: 3, band: 'towards', text: 'Spells many common exception words', evaluator: { kind: 'setSecureFraction', set: 'y2cew', fraction: 0.6 } },
  { id: 'y3-t-suffixes', grid: 3, band: 'towards', text: "Adds -ment, -ness, -ful, -less, -ly and uses contractions like can't", evaluator: { kind: 'unitsDone', unitIds: ['y3-revise-suffixes'] } },
  { id: 'y3-a-prefixes', grid: 3, band: 'at', text: 'Spells words with in-, un-, dis-, mis-, il- and ir-', evaluator: { kind: 'unitsDone', unitIds: ['y3-un-dis-mis', 'y3-in-il-im-ir'] } },
  { id: 'y3-a-super', grid: 3, band: 'at', text: 'Spells words with super-, anti- and auto-', evaluator: { kind: 'unitsDone', unitIds: ['y3-super-anti-auto'] } },
  { id: 'y3-a-suffixes', grid: 3, band: 'at', text: 'Spells words with -ation, -ly and -ous', evaluator: { kind: 'unitsDone', unitIds: ['y3-ation', 'y3-ly', 'y3-ous'] } },
  { id: 'y3-a-ei', grid: 3, band: 'at', text: 'Spells words with ei, eigh or ey', evaluator: { kind: 'unitsDone', unitIds: ['y3-ei-eigh-ey'] } },
  { id: 'y3-a-homophones', grid: 3, band: 'at', text: 'Spells and identifies common homophones', evaluator: { kind: 'unitsDone', unitIds: ['y3-homophones'] } },
  { id: 'y3-a-list', grid: 3, band: 'at', text: 'Spells about half of the Year 3/4 word list', evaluator: { kind: 'setSecureCount', set: 'y34', count: 50 } },
  { id: 'y3-a-dictation', grid: 3, band: 'at', text: 'Writes dictated sentences with taught words and punctuation', evaluator: { kind: 'storyTime', lastN: 10, minWordAccuracy: 0.8, minPunctuation: 0.8 } },
  { id: 'y3-g-prefixes', grid: 3, band: 'greaterDepth', text: 'Spells words with re-, sub- and inter-', evaluator: { kind: 'unitsDone', unitIds: ['y3-re-sub-inter'] } },
  { id: 'y3-g-list', grid: 3, band: 'greaterDepth', text: 'Spells about 70% of the Year 3/4 word list', evaluator: { kind: 'setSecureCount', set: 'y34', count: 70 } },
]
