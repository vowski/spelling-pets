import { describe, it, expect } from 'vitest'
import { parseWordSpec } from '../parse'
import { Y56_FAMILIES } from './y56'
import { Y56_HEADWORDS, Y56_FOLLOW_ONS } from '../curriculum-lists'

const all = Y56_FAMILIES.flatMap(f => f.entries)
const text = (e: readonly [string, string, string?]) => parseWordSpec(e[0]).text

describe('Y5/6 statutory list', () => {
  it('is the 100 headwords of the DfE Years 5–6 word list', () => {
    expect(Y56_HEADWORDS).toHaveLength(100)
    expect(new Set(Y56_HEADWORDS).size).toBe(100)
    expect(Y56_HEADWORDS).toEqual(expect.arrayContaining(['accommodate', 'criticise', 'equip', 'immediate', 'sincere', 'yacht']))
  })
  it('has 13 teaching families', () => {
    expect(Y56_FAMILIES).toHaveLength(13)
    for (const f of Y56_FAMILIES) expect(f.entries.length, f.name).toBeGreaterThanOrEqual(5)
  })
  it('contains every headword exactly once', () => {
    const heads = all.filter(e => !e[2]).map(text)
    expect([...heads].sort()).toEqual([...Y56_HEADWORDS].sort())
  })
  it('contains every follow-on, pointing at its headword, placed after it', () => {
    const follows = all.filter(e => e[2])
    expect(Object.fromEntries(follows.map(e => [text(e), e[2]]))).toEqual(Y56_FOLLOW_ONS)
    const order = all.map(text)
    for (const [f, head] of Object.entries(Y56_FOLLOW_ONS)) expect(order.indexOf(f)).toBeGreaterThan(order.indexOf(head))
  })
  it('marks one or two tricky parts in every word', () => {
    for (const e of all) {
      const tricky = parseWordSpec(e[0]).tricky
      expect(tricky.length, e[0]).toBeGreaterThanOrEqual(1)
      expect(tricky.length, e[0]).toBeLessThanOrEqual(2)
    }
  })
})
