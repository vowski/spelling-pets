import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { activeSchoolList, practiceTestList, reviewCandidates, learningWords, winWord } from './priority'
import { makeState, prog, T } from './testing'

const list = (id: string, testDate: string, words: string[]) => ({ id, createdAt: T, testDate, items: words.map(w => ({ text: w, wordId: `w-${w}` })) })

describe('priority', () => {
  it('finds the active list and the practice-test list', () => {
    const s = makeState({ schoolLists: [list('old', '2026-10-10', ['said']), list('b', '2026-10-20', ['was']), list('a', '2026-10-16', ['the'])] })
    expect(activeSchoolList(s)?.id).toBe('a')
    expect(practiceTestList(s)?.id).toBe('a')
    expect(practiceTestList(makeState({ schoolLists: [list('b', '2026-10-20', ['was'])] }))).toBeNull()
    expect(activeSchoolList(makeState())).toBeNull()
  })

  it('orders reviews: school words, focus, due (oldest first), recent failures', () => {
    const s = makeState({
      schoolLists: [list('a', '2026-10-17', ['because'])],
      progressList: [
        prog('w-because', { box: 2, due: '2026-10-20' }),
        prog('w-friend', { box: 3, due: '2026-10-25', focus: true }),
        prog('w-said', { box: 2, due: '2026-10-15' }),
        prog('w-was', { box: 1, due: '2026-10-12' }),
        prog('w-the', { box: 4, due: '2026-11-30' }),
        prog('w-people', { box: 1, due: '2026-10-16', lastFailedOn: '2026-10-13' }),
        prog('w-water', { box: 1, due: '2026-10-16', lastFailedOn: '2026-10-01' }),
      ],
    })
    expect(reviewCandidates(bank, s, 10)).toEqual(['w-because', 'w-friend', 'w-was', 'w-said', 'w-people'])
    expect(reviewCandidates(bank, s, 2)).toEqual(['w-because', 'w-friend'])
  })

  it('ignores school words not yet introduced and unknown ids', () => {
    const s = makeState({ schoolLists: [list('a', '2026-10-17', ['because', 'zzzz'])], progressList: [prog('w-zzzz', { box: 1, due: T })] })
    expect(reviewCandidates(bank, s, 10)).toEqual([])
  })

  it('lists learning words newest first', () => {
    const s = makeState({ progressList: [prog('w-said', { box: 1, introducedOn: '2026-10-10' }), prog('w-was', { box: 2, introducedOn: '2026-10-14' }), prog('w-the', { box: 3, introducedOn: '2026-10-14' })] })
    expect(learningWords(s, 5)).toEqual(['w-was', 'w-said'])
  })

  it('picks a known (box ≥ 3) win word not excluded, or null', () => {
    const s = makeState({ progressList: [prog('w-said', { box: 3 }), prog('w-was', { box: 5 }), prog('w-the', { box: 1 })] })
    const w = winWord(s, new Set(['w-said']))
    expect(w).toBe('w-was')
    expect(winWord(s, new Set(['w-said', 'w-was']))).toBeNull()
    expect(winWord(makeState(), new Set())).toBeNull()
  })
})
