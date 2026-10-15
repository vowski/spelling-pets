import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { fixedClock } from '../app/clock'
import { ServicesProvider, type Services } from '../app/services'
import { createSfx } from '../app/sfx'
import { BUILTIN_BANK } from '../content'
import { createStubSpeaker } from '../speech/voice'
import { Repo } from '../storage/repo'

export function makeTestServices(over: Partial<Services> = {}): Services & { speechLog: string[] } {
  const speechLog: string[] = []
  return {
    repo: Repo.open(`ui-${Math.random()}`),
    bank: BUILTIN_BANK,
    speaker: createStubSpeaker(speechLog),
    clock: fixedClock('2026-10-15T16:00:00'),
    sfx: createSfx(false),
    delays: { feedback: 0, peek: 30, gap: 0 },
    speechLog,
    ...over,
  }
}

export function renderWithServices(ui: ReactElement, over: Partial<Services> = {}): RenderResult & { services: Services & { speechLog: string[] } } {
  const services = makeTestServices(over)
  return { services, ...render(<ServicesProvider value={services}>{ui}</ServicesProvider>) }
}
