import { useServices } from '../app/services'

/** Calls fn after the feedback delay (immediately when the delay is 0, as in tests). */
export function useLater() {
  const { delays } = useServices()
  return (fn: () => void) => (delays.feedback > 0 ? void setTimeout(fn, delays.feedback) : fn())
}
