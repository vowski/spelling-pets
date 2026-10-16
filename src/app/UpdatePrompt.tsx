import { Button } from '../ui/Button'
import { useRegisterSW } from './pwaRegister'

export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
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
