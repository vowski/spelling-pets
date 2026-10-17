export interface VoiceLike {
  name: string
  lang: string
  voiceURI: string
  localService: boolean
}

function score(v: VoiceLike): number {
  const gb = /^en[-_]GB$/i.test(v.lang)
  if (gb && /natural/i.test(v.name)) return 0
  if (gb && v.localService) return 1
  if (gb) return 2
  if (/^en/i.test(v.lang)) return 3
  return 9
}

export function rankVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  return voices.filter(v => score(v) < 9).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
}

export function chooseVoice<V extends VoiceLike>(voices: readonly V[], preferredURI: string | null): V | null {
  if (preferredURI) {
    const preferred = voices.find(v => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  return rankVoices(voices)[0] ?? null
}

export interface Speaker {
  ready(): Promise<void>
  available(): boolean
  voices(): VoiceLike[]
  currentVoice(): VoiceLike | null
  speak(text: string): Promise<void>
  cancel(): void
  configure(o: { voiceURI?: string | null; rate?: number }): void
}

// Every speak() or cancel() starts a new turn on its speaker, so a running sayWord can tell that something else
// was said (e.g. "Hear it again" or a 🔊 button) and stop instead of carrying on over it.
const turns = new WeakMap<Speaker, number>()
const nextTurn = (s: Speaker) => { turns.set(s, (turns.get(s) ?? 0) + 1) }
const turnOf = (s: Speaker) => turns.get(s) ?? 0

export interface SpeakerOptions {
  voiceURI: string | null
  rate: number
  makeUtterance?: (text: string) => SpeechSynthesisUtterance
  voicesTimeoutMs?: number
}

export function createSpeaker(synth: SpeechSynthesis | undefined, opts: SpeakerOptions): Speaker {
  let voiceURI = opts.voiceURI
  let rate = opts.rate
  const make = opts.makeUtterance ?? ((t: string) => new SpeechSynthesisUtterance(t))
  const list = (): SpeechSynthesisVoice[] => synth?.getVoices() ?? []
  const readyPromise = new Promise<void>(resolve => {
    if (!synth || list().length) return resolve()
    const done = () => {
      synth.removeEventListener('voiceschanged', done)
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(done, opts.voicesTimeoutMs ?? 2000)
    synth.addEventListener('voiceschanged', done)
  })
  // Voices that errored (e.g. an online voice while offline) are skipped from then on.
  const failed = new Set<string>()
  const current = (): SpeechSynthesisVoice | null => chooseVoice(list().filter(v => !failed.has(v.voiceURI)), voiceURI)

  /** Resolves true when the voice spoke (or timed out), false when it reported a real failure. */
  const sayWith = (text: string, voice: SpeechSynthesisVoice) => new Promise<boolean>(resolve => {
    const u = make(text)
    u.voice = voice
    u.lang = voice.lang || 'en-GB'
    u.rate = rate
    let finished = false
    const finish = (ok: boolean) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve(ok)
    }
    // Slower speech takes longer, so the safety timeout must not cut a long sentence short at a slow rate.
    const timer = setTimeout(() => finish(true), 1500 + (120 * text.length) / rate)
    u.onend = () => finish(true)
    u.onerror = e => finish(e.error === 'interrupted' || e.error === 'canceled')
    synth!.speak(u)
  })

  const speaker: Speaker = {
    ready: () => readyPromise,
    available: () => !!synth && current() !== null,
    voices: () => rankVoices(list()),
    currentVoice: () => current(),
    configure: o => {
      if (o.voiceURI !== undefined) voiceURI = o.voiceURI
      if (o.rate !== undefined) rate = o.rate
    },
    cancel: () => { nextTurn(speaker); synth?.cancel() },
    speak: async text => {
      nextTurn(speaker)
      await readyPromise
      for (let voice = current(); synth && voice; voice = current()) {
        synth.cancel()
        if (await sayWith(text, voice)) return
        failed.add(voice.voiceURI) // try the next best voice; with none left, available() turns false
      }
    },
  }
  return speaker
}

export function createStubSpeaker(log: string[] = [], available = true): Speaker {
  const speaker: Speaker = {
    ready: async () => {},
    available: () => available,
    voices: () => [],
    currentVoice: () => null,
    configure: () => {},
    cancel: () => nextTurn(speaker),
    speak: async text => {
      nextTurn(speaker)
      if (available) log.push(text)
    },
  }
  return speaker
}

export const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Word, sentence, word. Stops early if anything else is spoken (or speech is cancelled) part-way through. */
export async function sayWord(speaker: Speaker, word: { text: string; sentence: string }, gapMs = 450): Promise<void> {
  const steps = word.sentence ? [word.text, word.sentence, word.text] : [word.text, word.text]
  let mine = 0
  for (const [k, text] of steps.entries()) {
    if (k > 0) {
      await pause(gapMs)
      if (turnOf(speaker) !== mine) return
    }
    const spoken = speaker.speak(text)
    mine = turnOf(speaker)
    await spoken
    if (turnOf(speaker) !== mine) return
  }
}
