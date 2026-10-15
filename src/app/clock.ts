export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

/** Starts at `iso` and then advances in real time (so timestamps still increase). */
export function fixedClock(iso: string): Clock {
  const start = new Date(iso).getTime()
  const t0 = Date.now()
  return { now: () => new Date(start + (Date.now() - t0)) }
}
