import { createContext, useContext, type ReactNode } from 'react'
import type { Bank } from '../content'
import { toDateStr, type DateStr } from '../engine/dates'
import type { Speaker } from '../speech/voice'
import type { Repo } from '../storage/repo'
import type { Clock } from './clock'
import type { Sfx } from './sfx'

export interface Delays { feedback: number; peek: number; gap: number }
export interface Services { repo: Repo; bank: Bank; speaker: Speaker; clock: Clock; sfx: Sfx; delays: Delays }
export const DEFAULT_DELAYS: Delays = { feedback: 900, peek: 3000, gap: 450 }

const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const s = useContext(ServicesContext)
  if (!s) throw new Error('ServicesProvider is missing')
  return s
}

export function useToday(): DateStr {
  return toDateStr(useServices().clock.now())
}
