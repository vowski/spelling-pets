import { addDays, type DateStr } from './dates'
import type { Attempt, Box, WordProgress } from './types'

/**
 * Days until the next check, by box. Secure (box 4) means spelt right from memory on different days at least a week
 * apart; it is retested after a month, then every three months (design of 2026-10-28: successive relearning and
 * expanding retrieval).
 */
export const INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 1, 2: 2, 3: 7, 4: 30, 5: 90 }
const NON_RECALL_CAP = 2

function promoteTo(p: WordProgress, box: Exclude<Box, 0>, today: DateStr): WordProgress {
  return {
    ...p,
    box,
    due: addDays(today, INTERVALS[box]),
    lastPromotedOn: today,
    introducedOn: p.introducedOn ?? today,
    secureOn: p.secureOn ?? (box >= 4 ? today : null),
    focus: box >= 3 ? false : p.focus,
  }
}

export function applyAttempt(prev: WordProgress, a: Attempt, today: DateStr, nowMs: number): WordProgress {
  const p: WordProgress = {
    ...prev,
    seen: prev.seen + 1,
    lastSeenAt: nowMs,
    misspellings: { ...prev.misspellings },
    recallCorrectDays: [...prev.recallCorrectDays],
  }
  const scored = a.firstTry && !a.hint
  if (a.correct && scored) p.correct += 1
  const typed = a.typed?.trim()
  if (!a.correct && a.firstTry && typed) p.misspellings[typed] = (p.misspellings[typed] ?? 0) + 1

  if (a.role === 'placement') return p
  if (a.role === 'teach') return p.box === 0 ? { ...p, box: 1, due: today, introducedOn: today } : p
  if (!scored) return p

  const failedToday = p.lastFailedOn === today
  const early = p.due !== null && p.due > today
  const blocked = p.lastPromotedOn === today || failedToday || early

  if (a.role === 'recall' || a.role === 'pretest') {
    if (a.correct) {
      if (!p.recallCorrectDays.includes(today)) p.recallCorrectDays.push(today)
      // Right the first time she's ever asked, never misspelt: she knew it, so one more check a week later decides.
      if (p.box === 0) return promoteTo(p, Object.keys(prev.misspellings).length === 0 && prev.lastFailedOn === null ? 3 : 2, today)
      if (blocked) return failedToday ? { ...p, due: addDays(today, 1) } : p
      // The retest brought forward by a slip (below): passing it keeps the box, with that box's full interval again.
      const slippedSincePromoted = p.lastFailedOn !== null && (p.lastPromotedOn === null || p.lastFailedOn > p.lastPromotedOn)
      if (p.box >= 4 && slippedSincePromoted) return promoteTo(p, p.box as Exclude<Box, 0>, today)
      return promoteTo(p, Math.min(p.box + 1, 5) as Exclude<Box, 0>, today)
    }
    if (a.role === 'pretest' && p.box === 0) return p
    // A Secure word missed before its retest is due (a typo in Story Time) stays Secure, and is retested tomorrow.
    if (p.box >= 4 && early) return { ...p, due: addDays(today, 1), lastFailedOn: today }
    // A missed retest of a Secure word sends it back to practice, so Secure always means secure now.
    const box = (p.box >= 4 ? 2 : Math.max(p.box - 1, 1)) as Box
    return { ...p, box, due: today, lastFailedOn: today, introducedOn: p.introducedOn ?? today }
  }

  // recognise / build / pattern
  if (!a.correct || blocked || p.box >= NON_RECALL_CAP) return p
  return promoteTo(p, (p.box + 1) as Exclude<Box, 0>, today)
}

export function isDue(p: WordProgress, today: DateStr): boolean {
  return p.box >= 1 && p.due !== null && p.due <= today
}

export function isSecure(p: WordProgress): boolean {
  return p.box >= 4
}

export function isMastered(p: WordProgress): boolean {
  return p.box === 5
}

export function markKnown(p: WordProgress, today: DateStr): WordProgress {
  return {
    ...p, box: 4, due: addDays(today, INTERVALS[4]), parentKnown: true,
    secureOn: p.secureOn ?? today, introducedOn: p.introducedOn ?? today,
  }
}

export function setFocus(p: WordProgress, on: boolean): WordProgress {
  return { ...p, focus: on }
}
