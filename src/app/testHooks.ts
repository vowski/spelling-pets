import { createSpeaker, createStubSpeaker, type Speaker } from '../speech/voice'
import { fixedClock, systemClock, type Clock } from './clock'

declare global {
  interface Window {
    __SPELLING_TEST__?: { now?: string; speechLog?: string[]; noSpeech?: boolean; fast?: boolean }
    __SPELLING_REPO__?: import('../storage/repo').Repo
  }
}

export function testHooks(): Window['__SPELLING_TEST__'] {
  return typeof window === 'undefined' ? undefined : window.__SPELLING_TEST__
}

export function appClock(): Clock {
  const now = testHooks()?.now
  return now ? fixedClock(now) : systemClock
}

export function appSpeaker(voiceURI: string | null, rate: number): Speaker {
  const hooks = testHooks()
  if (hooks?.noSpeech) return createStubSpeaker([], false)
  if (hooks?.speechLog) return createStubSpeaker(hooks.speechLog)
  return createSpeaker(typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis, { voiceURI, rate })
}
