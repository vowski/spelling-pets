import { useEffect } from 'react'
import { usePetMood } from '../app/petMood'

export function useIdleSleep(ms = 30_000) {
  const setMood = usePetMood(s => s.setMood)
  useEffect(() => {
    let timer = setTimeout(() => setMood('sleep'), ms)
    const wake = () => {
      clearTimeout(timer)
      if (usePetMood.getState().mood === 'sleep') setMood('idle')
      timer = setTimeout(() => setMood('sleep'), ms)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, wake))
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, wake)) }
  }, [ms, setMood])
}
