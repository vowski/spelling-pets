import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank, getWord } from '../content'
import { weekSummary, secureTimeline, weeklyAccuracy, troubleSpots, homeTip, levelBars } from './overviewData'
import { prog } from '../engine/testing'
import type { AttemptRow, SessionRow } from '../storage/db'
import { computeStats } from '../engine/stats'

const T = '2026-10-15'
const ms = (d: string, h = 16) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
const att = (wordId: string, d: string, correct: boolean, role: AttemptRow['role'] = 'recall'): AttemptRow => ({ wordId, sessionId: 's', game: 'pupPost', role, at: ms(d), typed: '', correct, firstTry: true, hint: false })
const sess = (d: string, mins: number): SessionRow => ({ id: d, date: d, kind: 'main', startedAt: ms(d), endedAt: ms(d) + mins * 60000, plan: { kind: 'normal', activities: [], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: true, coins: 0 })

describe('overview data', () => {
  it('summarises this week', () => {
    const s = weekSummary([sess('2026-10-12', 10), sess('2026-10-14', 12), sess('2026-10-05', 9)],
      [att('w-said', '2026-10-12', true), att('w-said', '2026-10-14', false), att('w-was', '2026-10-14', true), att('w-the', '2026-10-14', true, 'teach'), att('w-a', '2026-10-06', true)], T, 5)
    expect(s).toEqual({ daysPractised: 2, goalDays: 5, minutes: 22, wordsPractised: 3, accuracy: 2 / 3 })
  })
  it('builds a cumulative secure timeline and weekly accuracy', () => {
    const tl = secureTimeline([prog('w-a', { secureOn: '2026-10-01' }), prog('w-b', { secureOn: '2026-10-13' }), prog('w-c')], T, 3)
    expect(tl).toEqual([{ weekStart: '2026-09-28', secure: 1 }, { weekStart: '2026-10-05', secure: 1 }, { weekStart: '2026-10-12', secure: 2 }])
    const wa = weeklyAccuracy([att('w-a', '2026-10-13', true), att('w-b', '2026-10-13', false)], T, 2)
    expect(wa).toEqual([{ weekStart: '2026-10-05', accuracy: null, attempts: 0 }, { weekStart: '2026-10-12', accuracy: 0.5, attempts: 2 }])
  })
  it('finds trouble spots with tips', () => {
    const spots = troubleSpots(bank, [
      prog('w-because', { box: 1, seen: 4, correct: 1, misspellings: { becuase: 3, becos: 1 } }),
      prog('w-said', { box: 2, seen: 2, correct: 1, misspellings: { sed: 1 } }),
      prog('w-was', { box: 5, misspellings: { wos: 9 } }),
    ])
    expect(spots.map(s => s.text)).toEqual(['because', 'said'])
    expect(spots[0].misspellings).toEqual(['becuase', 'becos'])
    expect(homeTip(getWord(bank, 'w-accidentally'), bank)).toBe("Learn 'accident' first, then add the ending.")
    expect(homeTip(getWord(bank, 'w-hear'), bank)).toMatch(/^It sounds like here/)
    expect(homeTip(getWord(bank, 'w-because'), bank)).toMatch(/tricky bit/)
  })
  it('lists level bars with Year 3 markers', () => {
    const bars = levelBars(computeStats(bank, new Map(), new Map(), []))
    expect(bars.map(b => [b.label, b.total])).toEqual([
      ['Year 1 tricky words', 45], ['Days of the week', 7], ['100 high-frequency words', 100], ['Year 2 tricky words', 64], ['Year 3/4 word list', 100], ['Spelling patterns', 67],
    ])
    expect(bars[4].markers).toEqual([50, 70])
  })
})
