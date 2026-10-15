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
  const current = (): SpeechSynthesisVoice | null => chooseVoice(list(), voiceURI)

  return {
    ready: () => readyPromise,
    available: () => !!synth && current() !== null,
    voices: () => rankVoices(list()),
    currentVoice: () => current(),
    configure: o => {
      if (o.voiceURI !== undefined) voiceURI = o.voiceURI
      if (o.rate !== undefined) rate = o.rate
    },
    cancel: () => synth?.cancel(),
    speak: async text => {
      await readyPromise
      const voice = current()
      if (!synth || !voice) return
      synth.cancel()
      const u = make(text)
      u.voice = voice
      u.lang = voice.lang || 'en-GB'
      u.rate = rate
      await new Promise<void>(resolve => {
        let finished = false
        const finish = () => {
          if (finished) return
          finished = true
          clearTimeout(timer)
          resolve()
        }
        const timer = setTimeout(finish, 1500 + 120 * text.length)
        u.onend = finish
        u.onerror = finish
        synth.speak(u)
      })
    },
  }
}

export function createStubSpeaker(log: string[] = [], available = true): Speaker {
  return {
    ready: async () => {},
    available: () => available,
    voices: () => [],
    currentVoice: () => null,
    configure: () => {},
    cancel: () => {},
    speak: async text => {
      if (available) log.push(text)
    },
  }
}

export const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function sayWord(speaker: Speaker, word: { text: string; sentence: string }, gapMs = 450): Promise<void> {
  await speaker.speak(word.text)
  await pause(gapMs)
  if (word.sentence) {
    await speaker.speak(word.sentence)
    await pause(gapMs)
  }
  await speaker.speak(word.text)
}
