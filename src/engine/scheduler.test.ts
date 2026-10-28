import { describe, it, expect } from 'vitest'
import { applyAttempt, isDue, isSecure, isMastered, markKnown, setFocus, INTERVALS } from './scheduler'
import { newProgress, type Attempt, type Box, type WordProgress } from './types'

const T = '2026-10-15'
const base = (over: Partial<WordProgress> = {}): WordProgress => ({ ...newProgress('w-said'), ...over })
const att = (over: Partial<Attempt> = {}): Attempt => ({ wordId: 'w-said', role: 'recall', correct: true, firstTry: true, hint: false, ...over })

describe('scheduler', () => {
  // Design of 2026-10-28: a week between the last two learning checks, then retests after a month and every three months.
  it('checks after 1, 2 and 7 days while learning, then a month, then every three months', () => {
    expect(INTERVALS).toEqual({ 1: 1, 2: 2, 3: 7, 4: 30, 5: 90 })
  })

  it.each([
    [1, 2, '2026-10-17'],
    [2, 3, '2026-10-22'],
    [3, 4, '2026-11-14'],
    [4, 5, '2027-01-13'],
    [5, 5, '2027-01-13'],
  ])('recall success promotes box %i to %i (due %s)', (from, to, due) => {
    const p = applyAttempt(base({ box: from as Box, due: T }), att(), T, 1000)
    expect(p.box).toBe(to)
    expect(p.due).toBe(due)
    expect(p.lastPromotedOn).toBe(T)
    expect(p.recallCorrectDays).toEqual([T])
    expect(p.correct).toBe(1)
    expect(p.seen).toBe(1)
    expect(p.lastSeenAt).toBe(1000)
  })

  it('does not promote a word that is not due yet (early practice keeps the spacing)', () => {
    const early = applyAttempt(base({ box: 3, due: '2026-10-20' }), att(), T, 1)
    expect(early).toMatchObject({ box: 3, due: '2026-10-20', lastPromotedOn: null, correct: 1 })
    const earlyBuild = applyAttempt(base({ box: 1, due: '2026-10-16' }), att({ role: 'build' }), T, 1)
    expect(earlyBuild.box).toBe(1)
    const earlyWrong = applyAttempt(base({ box: 3, due: '2026-10-20' }), att({ correct: false }), T, 1)
    expect(earlyWrong).toMatchObject({ box: 2, due: T })
  })

  it('promotes at most once per day', () => {
    const once = applyAttempt(base({ box: 1, due: T }), att(), T, 1)
    const twice = applyAttempt(once, att(), T, 2)
    expect(twice.box).toBe(2)
    expect(twice.recallCorrectDays).toEqual([T])
  })

  it('a word she spells right the first time she is asked needs only one more check, a week later', () => {
    const p = applyAttempt(base(), att(), T, 1)
    expect(p).toMatchObject({ box: 3, due: '2026-10-22', introducedOn: T })
    const secure = applyAttempt(p, att(), '2026-10-22', 2)
    expect(secure).toMatchObject({ box: 4, secureOn: '2026-10-22' })
  })

  it('a word she has misspelt before takes the learning steps', () => {
    const p = applyAttempt(base({ misspellings: { sed: 1 } }), att(), T, 1)
    expect(p).toMatchObject({ box: 2, due: '2026-10-17', introducedOn: T })
  })

  it('recall failure demotes one box (min 1), due today, records misspelling', () => {
    const p = applyAttempt(base({ box: 3, due: T }), att({ correct: false, typed: ' siad ' }), T, 1)
    expect(p).toMatchObject({ box: 2, due: T, lastFailedOn: T })
    expect(p.misspellings).toEqual({ siad: 1 })
    expect(applyAttempt(base({ box: 1, due: T }), att({ correct: false }), T, 1).box).toBe(1)
  })

  it('a correct recall after a failure on the same day does not promote but moves due to tomorrow', () => {
    const failed = applyAttempt(base({ box: 3, due: T }), att({ correct: false, typed: 'sed' }), T, 1)
    const later = applyAttempt(failed, att(), T, 2)
    expect(later.box).toBe(2)
    expect(later.due).toBe('2026-10-16')
  })

  it('recall failure on a New word introduces it at Learning', () => {
    const p = applyAttempt(base(), att({ correct: false, typed: 'sed' }), T, 1)
    expect(p).toMatchObject({ box: 1, due: T, introducedOn: T, lastFailedOn: T })
  })

  it('pretest: correct jumps New straight to the week check; wrong leaves New alone', () => {
    expect(applyAttempt(base(), att({ role: 'pretest' }), T, 1)).toMatchObject({ box: 3, due: '2026-10-22' })
    const wrong = applyAttempt(base(), att({ role: 'pretest', correct: false, typed: 'sed' }), T, 1)
    expect(wrong.box).toBe(0)
    expect(wrong.misspellings).toEqual({ sed: 1 })
    expect(wrong.lastFailedOn).toBeNull()
  })

  it('teach introduces a New word only', () => {
    expect(applyAttempt(base(), att({ role: 'teach' }), T, 1)).toMatchObject({ box: 1, due: T, introducedOn: T })
    expect(applyAttempt(base({ box: 3, due: '2026-10-20' }), att({ role: 'teach' }), T, 1)).toMatchObject({ box: 3, due: '2026-10-20' })
  })

  it.each(['recognise', 'build', 'pattern'] as const)('%s success promotes only up to box 2', role => {
    const p1 = applyAttempt(base(), att({ role }), T, 1)
    expect(p1).toMatchObject({ box: 1, due: '2026-10-16', introducedOn: T })
    const p2 = applyAttempt(base({ box: 1, due: T }), att({ role }), T, 1)
    expect(p2.box).toBe(2)
    expect(applyAttempt(base({ box: 2, due: T }), att({ role }), T, 1).box).toBe(2)
  })

  it('non-recall failure changes nothing but the counters', () => {
    const p = applyAttempt(base({ box: 2, due: T }), att({ role: 'build', correct: false, typed: 'x' }), T, 1)
    expect(p).toMatchObject({ box: 2, due: T, lastFailedOn: null, seen: 1, correct: 0 })
  })

  it('hints and retries never move the box or count as correct', () => {
    const hinted = applyAttempt(base({ box: 2, due: T }), att({ hint: true }), T, 1)
    expect(hinted).toMatchObject({ box: 2, correct: 0 })
    const retry = applyAttempt(base({ box: 2, due: T }), att({ firstTry: false, correct: false }), T, 1)
    expect(retry.box).toBe(2)
  })

  it('placement attempts never change the box', () => {
    const p = applyAttempt(base(), att({ role: 'placement', correct: false, typed: 'sed' }), T, 1)
    expect(p.box).toBe(0)
    expect(p.misspellings).toEqual({ sed: 1 })
  })

  it('sets secureOn the first time box reaches 4 and keeps it if the word slips', () => {
    const secure = applyAttempt(base({ box: 3, due: T }), att(), T, 1)
    expect(secure.secureOn).toBe(T)
    const slipped = applyAttempt(secure, att({ correct: false }), '2026-11-14', 2)
    expect(slipped).toMatchObject({ box: 2, due: '2026-11-14', lastFailedOn: '2026-11-14', secureOn: T })
    expect(isSecure(slipped)).toBe(false)
  })

  it('a missed retest of a well-known word sends it back to practice too', () => {
    const p = applyAttempt(base({ box: 5, due: T, secureOn: '2026-01-01' }), att({ correct: false, typed: 'sed' }), T, 1)
    expect(p).toMatchObject({ box: 2, due: T, lastFailedOn: T })
  })

  // Final review of 2026-10-28: only a missed retest makes a Secure word slip. A slip on another day (a typo in Story Time)
  // brings its retest forward to tomorrow instead.
  it('a miss on a Secure word that is not due yet keeps it Secure and retests it tomorrow', () => {
    const p = applyAttempt(base({ box: 5, due: '2027-01-01', secureOn: '2026-01-01', lastPromotedOn: '2026-10-01' }), att({ correct: false, typed: 'sed' }), T, 1)
    expect(p).toMatchObject({ box: 5, due: '2026-10-16', lastFailedOn: T, misspellings: { sed: 1 } })
    expect(isSecure(p)).toBe(true)
  })

  it('that retest keeps the box with a fresh interval when right, and slips the word when missed', () => {
    const early = applyAttempt(base({ box: 5, due: '2027-01-01', secureOn: '2026-01-01', lastPromotedOn: '2026-10-01' }), att({ correct: false }), T, 1)
    expect(applyAttempt(early, att(), '2026-10-16', 2)).toMatchObject({ box: 5, due: '2027-01-14', lastPromotedOn: '2026-10-16' })
    const four = applyAttempt(base({ box: 4, due: '2026-11-01', secureOn: '2026-10-01', lastPromotedOn: '2026-10-01' }), att({ correct: false }), T, 1)
    expect(applyAttempt(four, att(), '2026-10-16', 2)).toMatchObject({ box: 4, due: '2026-11-15' })
    expect(applyAttempt(early, att({ correct: false }), '2026-10-16', 2)).toMatchObject({ box: 2, due: '2026-10-16' })
  })

  it('clears focus once the word reaches box 3', () => {
    const p = applyAttempt(base({ box: 2, due: T, focus: true }), att(), T, 1)
    expect(p.focus).toBe(false)
    const low = applyAttempt(base({ box: 0, focus: true }), att({ role: 'build' }), T, 1)
    expect(low.focus).toBe(true)
  })

  it('does not record a misspelling for correct answers or blank typing', () => {
    expect(applyAttempt(base({ box: 1, due: T }), att({ typed: 'said' }), T, 1).misspellings).toEqual({})
    expect(applyAttempt(base({ box: 1, due: T }), att({ correct: false, typed: '   ' }), T, 1).misspellings).toEqual({})
  })

  it('isDue, isSecure, isMastered', () => {
    expect(isDue(base(), T)).toBe(false)
    expect(isDue(base({ box: 1, due: T }), T)).toBe(true)
    expect(isDue(base({ box: 1, due: '2026-10-16' }), T)).toBe(false)
    expect(isSecure(base({ box: 4 }))).toBe(true)
    expect(isSecure(base({ box: 3 }))).toBe(false)
    expect(isMastered(base({ box: 5 }))).toBe(true)
  })

  it('markKnown and setFocus', () => {
    expect(markKnown(base(), T)).toMatchObject({ box: 4, due: '2026-11-14', parentKnown: true, secureOn: T, introducedOn: T })
    expect(setFocus(base(), true).focus).toBe(true)
  })
})
