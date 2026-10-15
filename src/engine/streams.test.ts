import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { gapWordStream, y3WordStream, unitStream, chooseNewMaterial } from './streams'
import { makeState, prog, T } from './testing'
import type { PlacementLevelState, UnitState } from './types'

const placedLevel = (level: PlacementLevelState['level']): PlacementLevelState => ({ level, sampledIds: [], answers: {}, status: 'done', placed: true })

describe('streams', () => {
  it('gap stream runs y1cew → days → hfw → y2cew and skips placed levels and known words', () => {
    const s = makeState()
    expect(gapWordStream(bank, s).slice(0, 2)).toEqual([bank.setIds.y1cew[0], bank.setIds.y1cew[1]])
    const placed = makeState({ placement: [placedLevel('y1cew')] })
    expect(gapWordStream(bank, placed)[0]).toBe(bank.setIds.days[0])
    const known = makeState({ progressList: [prog(bank.setIds.y1cew[0], { box: 2 })] })
    expect(gapWordStream(bank, known)[0]).toBe(bank.setIds.y1cew[1])
  })

  it('Y3 stream gives headwords in family order and releases follow-ons once the headword reaches box 2', () => {
    expect(y3WordStream(bank, makeState()).slice(0, 3)).toEqual(['w-though', 'w-thought', 'w-through'])
    const s = makeState({ progressList: [prog('w-though', { box: 2 })] })
    expect(y3WordStream(bank, s)[0]).toBe('w-although')
  })

  it('unit stream alternates Y3 (school order) with KS1 gap units, then Y4', () => {
    const ids = unitStream(bank, makeState())
    expect(ids.slice(0, 4)).toEqual(['y3-revise-suffixes', 'y1-ff-ll-ss-zz-ck', 'y3-un-dis-mis', 'y1-nk'])
    expect(ids.at(-1)).toBe('y4-plural-possessive')
    const started: UnitState = { unitId: 'y3-revise-suffixes', status: 'known', startedOn: T, completedOn: T, taughtWordIds: [] }
    expect(unitStream(bank, makeState({ units: new Map([[started.unitId, started]]) }))[0]).toBe('y1-ff-ll-ss-zz-ck')
  })

  it('starts with a unit day, then alternates to a words day of 2 gap + 2 Year 3 words', () => {
    const first = chooseNewMaterial(bank, makeState(), 4)
    expect(first).toEqual({ kind: 'unit', unitId: 'y3-revise-suffixes', day: 1, wordIds: bank.unitById.get('y3-revise-suffixes')!.wordIds.slice(0, 3) })
    const words = chooseNewMaterial(bank, makeState({ lastNewKind: 'unit' }), 4)
    expect(words).toEqual({ kind: 'words', source: 'queues', wordIds: [bank.setIds.y1cew[0], bank.setIds.y1cew[1], 'w-though', 'w-thought'] })
  })

  it('continues a unit begun on an earlier day with its next untaught words', () => {
    const unit = bank.unitById.get('y3-un-dis-mis')!
    const u: UnitState = { unitId: unit.id, status: 'learning', startedOn: '2026-10-14', completedOn: null, taughtWordIds: unit.wordIds.slice(0, 3) }
    expect(chooseNewMaterial(bank, makeState({ units: new Map([[u.unitId, u]]) }), 4)).toEqual({ kind: 'unit', unitId: unit.id, day: 2, wordIds: unit.wordIds.slice(3, 6) })
  })

  it('puts new school words first, up to 6', () => {
    const items = ['w-because', 'w-friend', 'w-people', 'w-water', 'w-again', 'w-money', 'w-half'].map(id => ({ text: id.slice(2), wordId: id }))
    const s = makeState({ schoolLists: [{ id: 'l1', createdAt: T, testDate: '2026-10-17', items }] })
    expect(chooseNewMaterial(bank, s, 4)).toEqual({ kind: 'words', source: 'school', wordIds: items.slice(0, 6).map(i => i.wordId) })
  })

  it('then focus-flagged new words', () => {
    const s = makeState({ progressList: [prog('w-island', { focus: true })] })
    expect(chooseNewMaterial(bank, s, 4)).toEqual({ kind: 'words', source: 'focus', wordIds: ['w-island'] })
  })

  it('returns none when there is nothing left to learn', () => {
    const all = [...bank.words.keys()].map(id => prog(id, { box: 5, due: '2026-12-01' }))
    const units = new Map(bank.units.map(u => [u.id, { unitId: u.id, status: 'complete' as const, startedOn: T, completedOn: T, taughtWordIds: [] }]))
    expect(chooseNewMaterial(bank, makeState({ progressList: all, units }), 4)).toEqual({ kind: 'none' })
  })
})
