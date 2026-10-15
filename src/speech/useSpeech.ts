import { useEffect, useState } from 'react'
import { useServices } from '../app/services'

/** true/false once known; null while the browser is still loading voices. */
export function useSpeechAvailable(): boolean | null {
  const { speaker } = useServices()
  const [ok, setOk] = useState<boolean | null>(speaker.available() ? true : null)
  useEffect(() => {
    let live = true
    void speaker.ready().then(() => { if (live) setOk(speaker.available()) })
    return () => { live = false }
  }, [speaker])
  return ok
}
