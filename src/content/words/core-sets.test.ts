import { describe, it, expect } from 'vitest'
import { parseWordSpec } from '../parse'
import { Y1CEW } from './y1cew'
import { DAYS } from './days'
import { Y2CEW } from './y2cew'
import { HFW_ORDER, HFW_EXTRA } from './hfw'
import { Y1CEW_LIST, DAYS_LIST, Y2CEW_LIST, HFW_LIST, Y34_HEADWORDS } from '../curriculum-lists'

const texts = (entries: readonly (readonly [string, string, string?])[]) => entries.map(e => parseWordSpec(e[0]).text)

describe('core word sets', () => {
  it('Y1 common exception words match the statutory list exactly', () => {
    expect([...texts(Y1CEW)].sort()).toEqual([...Y1CEW_LIST].sort())
  })
  it('days of the week, in order', () => {
    expect(texts(DAYS)).toEqual([...DAYS_LIST])
  })
  it('Y2 common exception words match the statutory list exactly', () => {
    expect([...texts(Y2CEW)].sort()).toEqual([...Y2CEW_LIST].sort())
  })
  it('HFW order is the Letters and Sounds 100, in order', () => {
    expect(HFW_ORDER).toEqual([...HFW_LIST])
  })
  it('HFW_EXTRA covers exactly the HFW words not defined in other core sets or the Y3/4 list', () => {
    const elsewhere = new Set<string>([...Y1CEW_LIST, ...DAYS_LIST, ...Y2CEW_LIST, ...Y34_HEADWORDS])
    const expected = HFW_LIST.filter(w => !elsewhere.has(w))
    expect(expected).toHaveLength(62)
    expect([...texts(HFW_EXTRA)].sort()).toEqual([...expected].sort())
  })
})
