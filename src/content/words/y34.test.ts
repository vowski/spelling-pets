import { describe, it, expect } from 'vitest'
import { parseWordSpec } from '../parse'
import { Y34_FAMILIES } from './y34'
import { Y34_HEADWORDS, Y34_FOLLOW_ONS } from '../curriculum-lists'

const all = Y34_FAMILIES.flatMap(f => f.entries)
const text = (e: readonly [string, string, string?]) => parseWordSpec(e[0]).text

describe('Y3/4 statutory list', () => {
  it('has the 20 families in teaching order', () => {
    expect(Y34_FAMILIES.map(f => f.name)).toEqual([
      'ough-augh', 'ear', 'eigh', 'soft-c-1', 'soft-c-2', 'silent-u', 'double-1', 'double-2', 'double-3',
      'al-endings', 'ar-endings', 'big-words', 'tricky-vowels-1', 'tricky-vowels-2', 'calendar-and-direction',
      'long-e', 'ex-and-y', 'breath', 'purpose', 'last-ones',
    ])
  })
  it('contains every headword exactly once', () => {
    const heads = all.filter(e => !e[2]).map(text)
    expect([...heads].sort()).toEqual([...Y34_HEADWORDS].sort())
  })
  it('contains every follow-on, pointing at its headword, placed after it', () => {
    const follows = all.filter(e => e[2])
    expect(Object.fromEntries(follows.map(e => [text(e), e[2]]))).toEqual(Y34_FOLLOW_ONS)
    const order = all.map(text)
    for (const [f, head] of Object.entries(Y34_FOLLOW_ONS)) expect(order.indexOf(f)).toBeGreaterThan(order.indexOf(head))
  })
})
