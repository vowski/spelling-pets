import { useEffect, useState } from 'react'

export function usePersisted(): boolean | null {
  const [p, setP] = useState<boolean | null>(null)
  useEffect(() => { void navigator.storage?.persisted?.().then(setP).catch(() => setP(null)) }, [])
  return p
}
