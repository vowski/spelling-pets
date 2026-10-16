import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useServices } from '../app/services'
import { BADGES } from '../content/rewards'
import { Button } from '../ui/Button'

export function Trophies() {
  const { repo } = useServices()
  const navigate = useNavigate()
  const owned = useLiveQuery(() => repo.getEarned(), [repo])
  if (!owned) return <main className="screen"><p>Loading…</p></main>
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}><Button variant="ghost" onClick={() => navigate('/')}>← Home</Button><h1>🏆 Trophy Shelf</h1><span /></header>
      <div className="row">
        {BADGES.map(b => owned.badges.has(b.id) ? (
          <div key={b.id} className="card" style={{ width: 220 }}><span style={{ fontSize: 56 }} aria-hidden="true">{b.emoji}</span><strong>{b.name}</strong><span className="muted" style={{ fontSize: 16 }}>{b.description}</span></div>
        ) : (
          <div key={b.id} className="card" aria-label={`Locked badge: ${b.name}`} style={{ width: 220, opacity: 0.35, filter: 'grayscale(1)' }}><span style={{ fontSize: 56 }} aria-hidden="true">{b.emoji}</span><span style={{ fontSize: 16 }}>{b.description}</span></div>
        ))}
      </div>
    </main>
  )
}
