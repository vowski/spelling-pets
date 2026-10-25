import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { isBlockedWord } from '../content/dictionary'
import { wordId } from '../content/parse'
import { TIP_VERSION } from '../ai/tipModel'
import { fixedClock } from './clock'
import { classifyMistake } from '../engine/tips/classify'
import { createTipService, tipCacheKey } from './tips'
import { Repo } from '../storage/repo'
import { fakeTipModel, type FakeTipModelOptions } from '../test/fakeTipModel'

const here = bank.words.get(wordId('here'))!
const GOOD = '“Hear” is what you do with your ears; “here” means this place.'
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

function setup(o: FakeTipModelOptions = {}, model: ReturnType<typeof fakeTipModel> | null = fakeTipModel(o)) {
  const repo = Repo.open(`tips-${Math.random()}`)
  const tips = createTipService({ repo, bank, model, clock: fixedClock('2026-10-25T16:00:00'), timeoutMs: 50, isBlocked: isBlockedWord })
  return { repo, tips, model }
}
/** Switch AI tips on (self-test passes with the default echo reply), then use the given reply options. */
async function enabled(o: FakeTipModelOptions = {}) {
  const s = setup()
  await s.tips.enable()
  Object.assign(s.model!.options, o)
  s.model!.calls = 0
  return s
}

describe('tip service', () => {
  it('returns null when the mistake cannot be classified', () => {
    expect(setup().tips.prepare(here, 'xqzt')).toBeNull()
  })

  it('gives the plain tip straight away while AI tips are off', async () => {
    const { tips, model } = setup({ reply: GOOD })
    const p = tips.prepare(here, 'hear')!
    expect(await p.result).toEqual({ text: p.mistake.template, source: 'plain' })
    expect(model!.calls).toBe(0)
  })

  it('gives a checked AI tip when on, and reuses it from the cache', async () => {
    const { tips, model } = await enabled({ reply: GOOD })
    expect(await tips.prepare(here, 'hear')!.result).toEqual({ text: GOOD, source: 'ai' })
    expect(await tips.prepare(here, 'hear')!.result).toEqual({ text: GOOD, source: 'ai' })
    expect(model!.calls).toBe(1)
  })

  it('sends only the first part of a tricky-word tip to the model and adds the memory trick back', async () => {
    const asked: string[] = []
    const { tips } = await enabled({ reply: msgs => { asked.push(msgs.at(-1)!.content); return 'Watch the “ie” in “friend”.' } })
    const r = await tips.prepare(bank.words.get(wordId('friend'))!, 'freind')!.result
    expect(asked).toEqual(['Tip to reword: The tricky bit in "friend" is "ie".'])
    expect(r).toEqual({ text: 'Watch the “ie” in “friend”. Remember: a friend to the END.', source: 'ai' })
  })

  it('falls back to the plain tip when the reply fails a check', async () => {
    const { tips, repo } = await enabled({ reply: 'Great job! "here" means this place.' })
    const p = tips.prepare(here, 'hear')!
    expect(await p.result).toEqual({ text: p.mistake.template, source: 'plain' })
    expect((await repo.getErrors()).map(e => e.where)).toContain('tips')
  })

  it('falls back after the time limit and caches a good late reply', async () => {
    const { tips, repo } = await enabled({ reply: GOOD, delayMs: 120 })
    const p = tips.prepare(here, 'hear')!
    expect((await p.result).source).toBe('plain')
    await wait(150)
    expect((await repo.getTip(tipCacheKey(here, p.mistake)))?.text).toBe(GOOD)
  })

  it('uses plain tips for a word the grown-up switched to plain', async () => {
    const { tips, repo, model } = await enabled({ reply: GOOD })
    await repo.setPlainTips('w-here', true)
    expect((await tips.prepare(here, 'hear')!.result).source).toBe('plain')
    expect(model!.calls).toBe(0)
  })

  it('stops using the model after 3 errors in a row', async () => {
    const { tips, model } = await enabled({ fail: true })
    for (let i = 0; i < 3; i++) expect((await tips.prepare(here, 'hear')!.result).source).toBe('plain')
    expect(tips.status().kind).toBe('error')
    await tips.prepare(here, 'hear')!.result
    expect(model!.calls).toBe(3)
  })

  it('ignores cached tips from another model or prompt version', async () => {
    const { tips, repo, model } = await enabled({ reply: GOOD })
    await repo.putTip({ key: 'w-here|hear|old-model#p0', wordId: 'w-here', attempt: 'hear', text: 'Old tip about "here".', source: 'ai', at: 1 })
    expect(await tips.prepare(here, 'hear')!.result).toEqual({ text: GOOD, source: 'ai' })
    expect(model!.calls).toBe(1)
  })

  it('reuses a cached AI tip only while the plain tip has the same wording (review I2)', async () => {
    const { tips, repo, model } = await enabled({ reply: GOOD })
    const m = classifyMistake(here, 'hear', bank)!
    expect(tipCacheKey(here, m)).toContain(TIP_VERSION)
    expect(tipCacheKey(here, m)).not.toBe(tipCacheKey(here, { ...m, template: 'An older wording of the "here" tip.' }))
    // A tip cached under the key used before wording was part of it is not reused.
    await repo.putTip({ key: `w-here|hear|${TIP_VERSION}`, wordId: 'w-here', attempt: 'hear', text: 'Old: "here" means this place.', source: 'ai', at: 1 })
    expect(await tips.prepare(here, 'hear')!.result).toEqual({ text: GOOD, source: 'ai' })
    expect(model!.calls).toBe(1)
  })

  it('checks a cached AI tip again before reusing it (review I2)', async () => {
    const { tips, repo, model } = await enabled({ reply: GOOD })
    const m = classifyMistake(here, 'hear', bank)!
    await repo.putTip({ key: tipCacheKey(here, m), wordId: 'w-here', attempt: 'hear', text: 'Great job! "here" means this place.', source: 'ai', at: 1 })
    expect(await tips.prepare(here, 'hear')!.result).toEqual({ text: GOOD, source: 'ai' })
    expect(model!.calls).toBe(1)
  })

  it('enable(): stays off and says why on an unsupported computer', async () => {
    const { tips, repo } = setup({ unsupported: 'no WebGPU' })
    await tips.enable()
    expect(tips.status()).toEqual({ kind: 'unsupported', reason: 'no WebGPU' })
    expect((await repo.getSettings()).aiTipsOn).toBeFalsy()
  })

  it('enable(): stays off when the self-test reply is gibberish', async () => {
    const { tips, repo } = setup({ reply: "scorers''''''''" })
    await tips.enable()
    expect(tips.status()).toEqual({ kind: 'unsupported', reason: 'self-test failed' })
    expect((await repo.getSettings()).aiTipsOn).toBeFalsy()
  })

  it('enable(): reports a download failure and can be retried', async () => {
    const { tips, repo, model } = setup({ downloadFails: 'Failed to fetch' })
    await tips.enable()
    expect(tips.status()).toEqual({ kind: 'error', message: 'Failed to fetch' })
    model!.options.downloadFails = undefined
    await tips.enable()
    expect(tips.status().kind).toBe('ready')
    expect((await repo.getSettings()).aiTipsOn).toBe(true)
  })

  it('records a tip as shown only when the screen says it was shown, for the Words tab', async () => {
    const { tips, repo } = setup()
    const p = tips.prepare(here, 'hear')!
    const r = await p.result
    await wait(10)
    expect(await repo.lastTipFor('w-here')).toBeUndefined()
    await tips.recordShown(here, p.mistake, r)
    expect(await repo.lastTipFor('w-here')).toMatchObject({ text: p.mistake.template, source: 'plain' })
  })

  it('keeps the plain tip she saw as the last tip when a late AI tip is cached afterwards (review I1)', async () => {
    const { tips, repo } = await enabled({ reply: GOOD, delayMs: 120 })
    const p = tips.prepare(here, 'hear')!
    const r = await p.result
    await tips.recordShown(here, p.mistake, r)
    await wait(150)
    expect((await repo.getTip(tipCacheKey(here, p.mistake)))?.text).toBe(GOOD)
    expect(await repo.lastTipFor('w-here')).toMatchObject({ text: p.mistake.template, source: 'plain' })
  })
})
