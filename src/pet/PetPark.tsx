import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { useServices } from '../app/services'
import { FRIENDS } from '../content/rewards'
import { Button } from '../ui/Button'

export function PetPark() {
  const { repo } = useServices()
  const navigate = useNavigate()
  const owned = useLiveQuery(() => repo.getEarned(), [repo])
  if (!owned) return <main className="screen"><p>Loading…</p></main>
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}><Button variant="ghost" onClick={() => navigate('/')}>← Home</Button><h1>🌳 Pet Park</h1><span /></header>
      <section className="card" style={{ background: 'linear-gradient(#cdeffd 35%, #bfe7b0 35%)' }}>
        <div className="row">
          {FRIENDS.map((f, n) => owned.friends.has(f.id) ? (
            <motion.figure key={f.id} style={{ margin: 8, textAlign: 'center' }} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 + (n % 3) * 0.4 }}>
              <div style={{ fontSize: 64 }} aria-hidden="true">{f.emoji}</div><figcaption>{f.name}</figcaption>
            </motion.figure>
          ) : (
            <figure key={f.id} style={{ margin: 8, textAlign: 'center', width: 150 }}>
              <div style={{ fontSize: 48, color: '#9aa' }} aria-hidden="true">?</div><figcaption className="muted" style={{ fontSize: 16 }}>Unlocks when: {f.reason}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  )
}
