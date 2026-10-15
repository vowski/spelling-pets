import { describe, it, expect } from 'vitest'
import { weekProgress, weeksGoalMet } from './weekly'

describe('weekly goal', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-13', '2026-10-15', '2026-10-11', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']
  it('counts unique practice days in the current Monday–Sunday week', () => {
    expect(weekProgress(dates, '2026-10-15', 5)).toEqual({ weekStart: '2026-10-12', daysPractised: 3, goalDays: 5, met: false, days: ['2026-10-12', '2026-10-13', '2026-10-15'] })
    expect(weekProgress(dates, '2026-10-11', 5)).toMatchObject({ weekStart: '2026-10-05', daysPractised: 6, met: true })
  })
  it('counts weeks where the goal was met, optionally from a date', () => {
    expect(weeksGoalMet(dates, 5)).toBe(1)
    expect(weeksGoalMet(dates, 3)).toBe(2)
    expect(weeksGoalMet(dates, 3, '2026-10-14')).toBe(1)
  })
})
