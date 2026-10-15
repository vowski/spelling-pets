import { describe, it, expect } from 'vitest'
import { applyAttempt, isDue, isSecure, isMastered, markKnown, setFocus, INTERVALS } from './scheduler'
import { newProgress, type Attempt, type Box, type WordProgress } from './types'

const T = '2026-10-15'
const base = (over: Partial<WordProgress> = {}): WordProgress => ({ ...newProgress('w-said'), ...over })
const att = (over: Partial<Attempt> = {}): Attempt => ({ wordId: 'w-said', role: 'recall', correct: true, firstTry: true, hint: false, ...over })

describe('scheduler', () => {
  it('has the spec intervals', () => {
    expect(INTERVALS).toEqual({ 1: 1, 2: 2, 3: 5, 4: 14, 5: 30 })
  })

  it.each([
    [1, 2, '2026-10-17'],
    [2, 3, '2026-10-20'],
    [3, 4, '2026-10-29'],
    [4, 5, '2026-11-14'],
    [5, 5, '2026-11-14'],
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

  it('recall success on a New word jumps to Practising', () => {
    const p = applyAttempt(base(), att(), T, 1)
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

  it('pretest: correct jumps New to Practising; wrong leaves New alone', () => {
    expect(applyAttempt(base(), att({ role: 'pretest' }), T, 1).box).toBe(2)
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

  it('sets secureOn the first time box reaches 4 and keeps it after a demotion', () => {
    const secure = applyAttempt(base({ box: 3, due: T }), att(), T, 1)
    expect(secure.secureOn).toBe(T)
    const dropped = applyAttempt(secure, att({ correct: false }), '2026-10-29', 2)
    expect(dropped.box).toBe(3)
    expect(dropped.secureOn).toBe(T)
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
    expect(markKnown(base(), T)).toMatchObject({ box: 4, due: '2026-10-29', parentKnown: true, secureOn: T, introducedOn: T })
    expect(setFocus(base(), true).focus).toBe(true)
  })
})
