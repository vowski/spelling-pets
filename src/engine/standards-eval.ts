import type { StandardRow } from '../content/standards'
import type { LearnerStats } from './stats'

export interface StandardResult { met: boolean; progress: number; evidence: string }
export type GridBand = 'notYet' | 'towards' | 'at' | 'greaterDepth'

const pct = (x: number) => `${Math.round(x * 100)}%`
const ratio = (have: number, need: number) => (need <= 0 ? 1 : Math.min(1, Math.round((have / need) * 100) / 100))

export function evaluateStandard(row: StandardRow, stats: LearnerStats): StandardResult {
  const e = row.evaluator
  switch (e.kind) {
    case 'setSecureFraction':
    case 'setSecureCount': {
      const have = stats.secureBySet[e.set]
      const size = stats.sizeBySet[e.set]
      const need = e.kind === 'setSecureCount' ? e.count : Math.ceil(e.fraction * size)
      return { met: have >= need, progress: ratio(have, need), evidence: `${have} of ${size} Secure (aim: ${need})` }
    }
    case 'unitsDone': {
      const done = e.unitIds.filter(id => stats.unitsDone.has(id)).length
      return { met: done === e.unitIds.length, progress: ratio(done, e.unitIds.length), evidence: `${done} of ${e.unitIds.length} spelling patterns finished` }
    }
    case 'yearUnitsFraction': {
      const done = stats.unitsDoneByYear[e.year]
      const need = Math.ceil(e.fraction * stats.unitsByYear[e.year])
      return { met: done >= need, progress: ratio(done, need), evidence: `${done} of ${stats.unitsByYear[e.year]} Year ${e.year} patterns (aim: ${need})` }
    }
    case 'storyTime': {
      const last = stats.storyResults.slice(-e.lastN)
      if (last.length < e.lastN) return { met: false, progress: ratio(last.length, e.lastN), evidence: `${last.length} of ${e.lastN} sentences so far` }
      const acc = last.reduce((s, r) => s + r.wordAccuracy, 0) / last.length
      const punct = last.filter(r => r.punctuationOk).length / last.length
      return {
        met: acc >= e.minWordAccuracy && punct >= e.minPunctuation,
        progress: Math.min(ratio(acc, e.minWordAccuracy), ratio(punct, e.minPunctuation)),
        evidence: `${pct(acc)} of words right; capitals and full stops ${pct(punct)}`,
      }
    }
  }
}

export function gridBand(rows: readonly StandardRow[], stats: LearnerStats, grid: 1 | 2 | 3): GridBand {
  const ok = (band: StandardRow['band']) => rows.filter(r => r.grid === grid && r.band === band).every(r => evaluateStandard(r, stats).met)
  if (!ok('towards')) return 'notYet'
  if (!ok('at')) return 'towards'
  if (!ok('greaterDepth')) return 'at'
  return 'greaterDepth'
}
