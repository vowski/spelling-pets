import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank, getWord } from '../content'
import { computeStats } from '../engine/stats'
import { prog } from '../engine/testing'
import { newProgress } from '../engine/types'
import { overviewRows, standardsRows, wordsRows } from './exports'

// CSV downloads for the grown-up (2026-11-09).
describe('overviewRows', () => {
  it('lays out every part of the Overview as its own titled table', () => {
    const rows = overviewRows({
      today: '2026-11-09',
      week: { daysPractised: 3, goalDays: 5, minutes: 42, wordsPractised: 20, accuracy: 0.853 },
      secure: { secure: 12, slipped: 1, retestsDue: 2 },
      bars: [{ label: 'Year 3/4 word list', secure: 9, total: 100, markers: [50, 70] }],
      timeline: [{ weekStart: '2026-11-02', secure: 12 }],
      accuracy: [{ weekStart: '2026-11-02', accuracy: null, attempts: 0 }],
      trouble: [{ wordId: 'w-because', text: 'because', mistakes: 3, misspellings: ['becos', 'becuase'], tip: 'Focus on the tricky bit.' }],
    })
    expect(rows).toEqual([
      ['Spelling Pets overview', '2026-11-09'], [],
      ['This week'], ['Days practised', 'Goal days', 'Minutes', 'Words practised', 'First-try accuracy (%)'], [3, 5, 42, 20, 85], [],
      ['Secure words'], ['Secure now', 'Slipped back into practice', 'Retests due'], [12, 1, 2], [],
      ['Progress by word list'], ['List', 'Secure', 'Total'], ['Year 3/4 word list', 9, 100], [],
      ['Secure words over time'], ['Week starting', 'Secure words'], ['2026-11-02', 12], [],
      ['First-try accuracy by week'], ['Week starting', 'First-try accuracy (%)', 'Answers'], ['2026-11-02', null, 0], [],
      ['Trouble spots'], ['Word', 'Mistakes', 'Her spellings', 'Home tip'], ['because', 3, 'becos; becuase', 'Focus on the tricky bit.'],
    ])
  })
})

describe('standardsRows', () => {
  it('gives one row per statement, with its grid result, whether it is met, progress and evidence', () => {
    const stats = computeStats(bank, new Map(bank.setIds.days.map(id => [id, prog(id, { box: 4 })])), new Map(), [])
    const rows = standardsRows(stats)
    expect(rows[0]).toEqual(['Grid', 'Grid result', 'Band', 'Statement', 'Met', 'Progress (%)', 'Evidence'])
    expect(rows).toContainEqual(['Year 1', 'Not yet', 'Working at', 'Spells the days of the week', 'Yes', 100, '7 of 7 Secure (aim: 6)'])
    expect(rows.find(r => r[3] === 'Spells about half of the Year 3/4 word list')).toEqual(['Year 3', 'Not yet', 'Working at', 'Spells about half of the Year 3/4 word list', 'No', 0, '0 of 100 Secure (aim: 50)'])
    expect(rows[1][0]).toBe('Year 3') // Year 3 first, as on screen
  })
})

describe('wordsRows', () => {
  it('gives one row per word with its status, accuracy, dates and her misspellings', () => {
    const progress = new Map([['w-because', prog('w-because', {
      box: 2, seen: 4, correct: 3, due: '2026-11-11', lastSeenAt: new Date('2026-11-08T16:00:00').getTime(), focus: true, misspellings: { becuase: 1, becos: 2 },
    })]])
    const label = (set: string) => (set === 'y1cew' ? 'Year 1 tricky words' : set.toUpperCase())
    const rows = wordsRows([getWord(bank, 'w-because'), getWord(bank, 'w-said')], id => progress.get(id) ?? newProgress(id), label)
    expect(getWord(bank, 'w-said').sets).toContain('y1cew')
    expect(rows).toEqual([
      ['Word', 'Word sets', 'Status', 'Times asked', 'Right first time', 'Accuracy (%)', 'Last seen', 'Next check', 'Secure since', 'Focus', 'Her misspellings'],
      ['because', getWord(bank, 'w-because').sets.map(label).join('; '), 'Practising', 4, 3, 75, '2026-11-08', '2026-11-11', null, 'Yes', 'becos (2); becuase (1)'],
      ['said', getWord(bank, 'w-said').sets.map(label).join('; '), 'New', 0, 0, null, null, null, null, null, null],
    ])
  })
})
