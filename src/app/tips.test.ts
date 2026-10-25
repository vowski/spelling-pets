import { describe, it, expect } from 'vitest'
import { BUILTIN_BANK as bank } from '../content'
import { isBlockedWord } from '../content/dictionary'
import { wordId } from '../content/parse'
import { TIP_VERSION } from '../ai/tipModel'
import { fixedClock } from './clock'
import { createTipService } from './tips'
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
    expect((await repo.getTip(`w-here|hear|${TIP_VERSION}`))?.text).toBe(GOOD)
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

  it('records the last tip shown, for the Words tab', async () => {
    const { tips, repo } = setup()
    const p = tips.prepare(here, 'hear')!
    await p.result
    await wait(10)
    expect(await repo.lastTipFor('w-here')).toMatchObject({ text: p.mistake.template, source: 'plain' })
  })
})
