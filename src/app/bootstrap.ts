import { BUILTIN_BANK } from '../content'
import { Repo } from '../storage/repo'
import { DEFAULT_DELAYS, type Services } from './services'
import { createSfx } from './sfx'
import { appClock, appSpeaker } from './testHooks'

export function createAppServices(): Services {
  return {
    repo: Repo.open(),
    bank: BUILTIN_BANK,
    speaker: appSpeaker(null, 0.85),
    clock: appClock(),
    sfx: createSfx(true),
    delays: DEFAULT_DELAYS,
  }
}
