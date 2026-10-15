import { describe, it, expect } from 'vitest'
import { toDateStr, addDays, diffDays, weekStart, dayNumber, isValidDateStr } from './dates'

describe('dates', () => {
  it('formats the local calendar date', () => {
    expect(toDateStr(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05')
    expect(toDateStr(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // UK clocks go back 25 Oct 2026
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-15', 0)).toBe('2026-10-15')
  })
  it('measures whole days between dates', () => {
    expect(diffDays('2026-10-15', '2026-10-22')).toBe(7)
    expect(diffDays('2026-10-22', '2026-10-15')).toBe(-7)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2) // spans spring DST change
  })
  it('finds the Monday that starts the week', () => {
    expect(weekStart('2026-10-15')).toBe('2026-10-12') // Thursday
    expect(weekStart('2026-10-12')).toBe('2026-10-12') // Monday
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday
  })
  it('gives consecutive day numbers', () => {
    expect(dayNumber('2026-10-16') - dayNumber('2026-10-15')).toBe(1)
  })
  it('validates YYYY-MM-DD strings', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true)
    expect(isValidDateStr('2026-02-30')).toBe(false)
    expect(isValidDateStr('15/10/2026')).toBe(false)
  })
})
