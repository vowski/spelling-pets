import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useServices } from '../app/services'
import { useRewardStats } from '../app/useRewardStats'
import { rewardProgress } from '../engine/rewards'
import { Button } from '../ui/Button'

export function RewardPath() {
  const { repo } = useServices()
  const navigate = useNavigate()
  const rewards = useLiveQuery(() => repo.getRealRewards(), [repo])
  const stats = useRewardStats()
  if (!rewards || !stats) return <main className="screen"><p>Loading…</p></main>
  const active = rewards.filter(r => r.status === 'active')
  const earned = rewards.filter(r => r.status === 'earned')
  const given = rewards.filter(r => r.status === 'given')
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}><Button variant="ghost" onClick={() => navigate('/')}>← Home</Button><h1>🎁 Reward Path</h1><span /></header>
      {rewards.length === 0 && <p>Ask a grown-up to add a reward goal!</p>}
      {earned.map(r => <section key={r.id} className="card"><h2>{r.emoji} {r.title}</h2><p className="praise">Tell your grown-up! 🎉</p></section>)}
      {active.map(r => {
        const p = rewardProgress(r, stats)
        return (
          <section key={r.id} className="card">
            <h2>{r.emoji} {r.title}</h2>
            <div style={{ width: '100%', height: 24, background: 'var(--line)', borderRadius: 12 }}>
              <div style={{ width: `${Math.min(100, (p.current / p.target) * 100)}%`, height: '100%', background: 'var(--meadow)', borderRadius: 12 }} />
            </div>
            <p>{Math.min(p.current, p.target)} of {p.target}</p>
          </section>
        )
      })}
      {given.length > 0 && <section className="card"><h3>Already enjoyed</h3><p>{given.map(r => `${r.emoji} ${r.title}`).join(' · ')}</p></section>}
    </main>
  )
}
