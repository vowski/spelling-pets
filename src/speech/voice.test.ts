import { describe, it, expect, vi, afterEach } from 'vitest'
import { rankVoices, chooseVoice, createSpeaker, createStubSpeaker, sayWord, type VoiceLike } from './voice'

const v = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, voiceURI: name, localService })
const VOICES = [v('Microsoft David - English (United States)', 'en-US'), v('Microsoft Hazel - English (United Kingdom)', 'en-GB'),
  v('Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB', false), v('Google français', 'fr-FR'), v('Some GB voice', 'en-GB', false)]

class FakeUtterance {
  text: string; voice: unknown = null; lang = ''; rate = 1
  onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null
  constructor(t: string) { this.text = t }
}
function fakeSynth(voices: VoiceLike[], autoEnd = true) {
  const spoken: FakeUtterance[] = []
  const listeners: (() => void)[] = []
  return {
    spoken, cancel: vi.fn(),
    getVoices: () => voices,
    speak: (u: FakeUtterance) => { spoken.push(u); if (autoEnd) setTimeout(() => u.onend?.(), 0) },
    addEventListener: (_: string, cb: () => void) => { listeners.push(cb) },
    removeEventListener: () => {},
    fire: () => listeners.forEach(l => l()),
  }
}
const make = (t: string) => new FakeUtterance(t) as unknown as SpeechSynthesisUtterance
afterEach(() => vi.useRealTimers())

describe('voices', () => {
  it('ranks British natural, then British local, then British, then other English', () => {
    expect(rankVoices(VOICES).map(x => x.name)).toEqual([
      'Microsoft Libby Online (Natural) - English (United Kingdom)', 'Microsoft Hazel - English (United Kingdom)',
      'Some GB voice', 'Microsoft David - English (United States)'])
  })
  it('honours a preferred voice and falls back sensibly', () => {
    expect(chooseVoice(VOICES, 'Some GB voice')?.name).toBe('Some GB voice')
    expect(chooseVoice(VOICES, 'missing')?.name).toContain('Libby')
    expect(chooseVoice([v('Google français', 'fr-FR')], null)).toBeNull()
  })
})

describe('createSpeaker', () => {
  it('speaks with the chosen voice, British lang and rate, resolving on end', async () => {
    const synth = fakeSynth(VOICES)
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 0.85, makeUtterance: make })
    await sp.speak('because')
    expect(synth.spoken[0]).toMatchObject({ text: 'because', lang: 'en-GB', rate: 0.85 })
    expect((synth.spoken[0].voice as VoiceLike).name).toContain('Libby')
    expect(synth.cancel).toHaveBeenCalled()
    expect(sp.available()).toBe(true)
  })
  // Review Focus #5: e.g. Edge's online "Natural" voice while the laptop is offline
  it('falls back to the next British voice when the chosen one fails', async () => {
    const synth = fakeSynth(VOICES)
    synth.speak = (u: FakeUtterance) => { synth.spoken.push(u); setTimeout(() => (/Natural/.test((u.voice as VoiceLike).name) ? u.onerror?.({ error: 'synthesis-failed' }) : u.onend?.()), 0) }
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make })
    await sp.speak('because')
    expect(synth.spoken.map(u => (u.voice as VoiceLike).name)).toEqual([VOICES[2].name, VOICES[1].name])
    expect(sp.currentVoice()?.name).toContain('Hazel')
    expect(sp.available()).toBe(true)
  })
  it('reports no voice once every voice has failed, so games switch to Look-and-Cover', async () => {
    const synth = fakeSynth([VOICES[2]])
    synth.speak = (u: FakeUtterance) => { synth.spoken.push(u); setTimeout(() => u.onerror?.({ error: 'network' }), 0) }
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make })
    await sp.speak('because')
    expect(sp.available()).toBe(false)
  })
  it('treats an interrupted utterance as finished, not as a broken voice', async () => {
    const synth = fakeSynth(VOICES)
    synth.speak = (u: FakeUtterance) => { synth.spoken.push(u); setTimeout(() => u.onerror?.({ error: 'interrupted' }), 0) }
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make })
    await sp.speak('because')
    expect(synth.spoken).toHaveLength(1)
    expect(sp.currentVoice()?.name).toContain('Libby')
  })
  it('still resolves when onend never fires (timeout)', async () => {
    vi.useFakeTimers()
    const synth = fakeSynth(VOICES, false)
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make })
    let done = false
    const p = sp.speak('hello').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(1500 + 120 * 5 + 10)
    await p
    expect(done).toBe(true)
  })
  it('waits for voices that arrive late, and gives up after the timeout', async () => {
    vi.useFakeTimers()
    const voices: VoiceLike[] = []
    const synth = fakeSynth(voices)
    const sp = createSpeaker(synth as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make, voicesTimeoutMs: 2000 })
    voices.push(v('Microsoft Hazel - English (United Kingdom)', 'en-GB'))
    synth.fire()
    await sp.ready()
    expect(sp.available()).toBe(true)

    const empty = fakeSynth([])
    const sp2 = createSpeaker(empty as unknown as SpeechSynthesis, { voiceURI: null, rate: 1, makeUtterance: make, voicesTimeoutMs: 2000 })
    const ready = sp2.ready()
    await vi.advanceTimersByTimeAsync(2001)
    await ready
    expect(sp2.available()).toBe(false)
    await sp2.speak('x') // resolves immediately with no voice
    expect(empty.spoken).toHaveLength(0)
  })
  it('handles a browser with no speech at all', async () => {
    const sp = createSpeaker(undefined, { voiceURI: null, rate: 1, makeUtterance: make })
    expect(sp.available()).toBe(false)
    await sp.speak('anything')
    expect(sp.voices()).toEqual([])
  })
})

describe('stub speaker and sayWord', () => {
  it('logs word, sentence, word', async () => {
    const log: string[] = []
    const sp = createStubSpeaker(log)
    await sayWord(sp, { text: 'said', sentence: 'Mum said hello.' }, 0)
    expect(log).toEqual(['said', 'Mum said hello.', 'said'])
    await sayWord(sp, { text: 'crocodile', sentence: '' }, 0)
    expect(log.slice(3)).toEqual(['crocodile', 'crocodile'])
  })
})
