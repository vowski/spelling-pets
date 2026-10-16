import { describe, it, expect } from 'vitest'
import { layoutCrossword, validateLayout, cellsOf } from './crossword'

describe('layoutCrossword', () => {
  it('places the anchor and crossing words in a valid grid', () => {
    const l = layoutCrossword('because', ['case', 'cause', 'sauce', 'use', 'bus', 'cub', 'sea'], { maxSize: 10, maxWords: 6 })
    expect(l.placed[0]).toMatchObject({ word: 'because', dir: 'across' })
    expect(l.placed.length).toBeGreaterThanOrEqual(3)
    expect(validateLayout(l)).toEqual([])
    expect(l.rows).toBeLessThanOrEqual(10)
    expect(l.cols).toBeLessThanOrEqual(10)
    for (const p of l.placed.slice(1)) {
      const crosses = cellsOf(p).some(c => l.placed.some(q => q !== p && cellsOf(q).some(d => d.r === c.r && d.c === c.c)))
      expect(crosses, p.word).toBe(true)
    }
  })
  it('respects maxWords and is deterministic', () => {
    const a = layoutCrossword('because', ['case', 'cause', 'sauce', 'use'], { maxSize: 10, maxWords: 2 })
    expect(a.placed).toHaveLength(2)
    expect(layoutCrossword('because', ['case', 'cause', 'sauce', 'use'], { maxSize: 10, maxWords: 2 })).toEqual(a)
  })
  it('validateLayout catches clashes and side-by-side words', () => {
    expect(validateLayout({ rows: 2, cols: 3, placed: [{ word: 'cat', row: 0, col: 0, dir: 'across' }, { word: 'dog', row: 1, col: 0, dir: 'across' }] }).length).toBeGreaterThan(0)
    expect(validateLayout({ rows: 3, cols: 3, placed: [{ word: 'cat', row: 0, col: 0, dir: 'across' }, { word: 'dog', row: 0, col: 1, dir: 'down' }] }).length).toBeGreaterThan(0)
  })
})
