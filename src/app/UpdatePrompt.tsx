import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { useRegisterSW } from './pwaRegister'

const onHome = () => ['', '#', '#/'].includes(window.location.hash)

/** Lives outside the router so the service worker registers once; it only shows on Home, never mid-session. */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [home, setHome] = useState(onHome)
  useEffect(() => {
    const update = () => setHome(onHome())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  if (!needRefresh || !home) return null
  return (
    <div className="card no-print" role="status" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 'auto', zIndex: 10 }}>
      <span>New things to discover! 🐾</span>
      <div className="row">
        <Button onClick={() => void updateServiceWorker(true)}>Update now</Button>
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>Later</Button>
      </div>
    </div>
  )
}
