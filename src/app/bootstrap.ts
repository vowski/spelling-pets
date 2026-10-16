import { BUILTIN_BANK } from '../content'
import { Repo } from '../storage/repo'
import { DEFAULT_DELAYS, type Services } from './services'
import { createSfx } from './sfx'
import { appClock, appSpeaker, testHooks } from './testHooks'

export function createAppServices(): Services {
  const repo = Repo.open()
  const hooks = testHooks()
  if (hooks) window.__SPELLING_REPO__ = repo
  return {
    repo, bank: BUILTIN_BANK, speaker: appSpeaker(null, 0.85), clock: appClock(), sfx: createSfx(!hooks),
    delays: hooks?.fast ? { feedback: 60, peek: 300, gap: 0 } : DEFAULT_DELAYS,
  }
}
