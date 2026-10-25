import { createWorkerTipModel } from '../ai/workerTipModel'
import { BUILTIN_BANK } from '../content'
import { isBlockedWord } from '../content/dictionary'
import { Repo } from '../storage/repo'
import { DEFAULT_DELAYS, type Services } from './services'
import { createSfx } from './sfx'
import { appClock, appSpeaker, testHooks } from './testHooks'
import { createTipService } from './tips'

export function createAppServices(): Services {
  const repo = Repo.open()
  const hooks = testHooks()
  if (hooks) window.__SPELLING_REPO__ = repo
  const clock = appClock()
  const tips = import.meta.env.VITE_TIPS === 'on'
    ? createTipService({ repo, bank: BUILTIN_BANK, model: createWorkerTipModel(), clock, timeoutMs: 6000, isBlocked: isBlockedWord })
    : undefined
  return {
    repo, bank: BUILTIN_BANK, speaker: appSpeaker(null, 0.85), clock, sfx: createSfx(!hooks),
    delays: hooks?.fast ? { feedback: 60, peek: 300, gap: 0 } : DEFAULT_DELAYS,
    ...(tips ? { tips } : {}),
  }
}
