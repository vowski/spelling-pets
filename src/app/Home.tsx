import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { diffDays } from '../engine/dates'
import { isPlacementDone } from '../engine/placement'
import { weekProgress } from '../engine/weekly'
import { PetSpot } from '../pet/PetSpot'
import { Button } from '../ui/Button'
import { HOME_LINKS } from './homeLinks'
import { useServices, useToday } from './services'

export function Home() {
  const { repo, sfx } = useServices()
  const today = useToday()
  const navigate = useNavigate()
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const main = useLiveQuery(() => repo.getSessionForDay(today, 'main'), [repo, today])
  const dates = useLiveQuery(() => repo.completeSessionDates(), [repo])
  const placement = useLiveQuery(() => repo.getPlacement(), [repo])
  const secure = useLiveQuery(() => repo.everSecureCount(), [repo])
  useEffect(() => {
    if (settings?.musicOn) { sfx.startMusic(); return () => sfx.stopMusic() }
  }, [settings?.musicOn, sfx])
  if (!settings || !dates || !placement || secure === undefined) return <main className="screen"><p>Loading…</p></main>

  const week = weekProgress(dates, today, settings.weeklyGoalDays)
  const done = main?.complete === true
  const lastDay = dates.at(-1)
  const missedYou = lastDay !== undefined && diffDays(lastDay, today) >= 3
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <h1>{settings.childName ? `${settings.childName}'s Spelling Pets` : 'Spelling Pets'}</h1>
        <div className="row">
          <span aria-label={`${settings.coins} paw coins`} style={{ fontWeight: 700 }}>🐾 {settings.coins}</span>
          <span aria-label={`${week.daysPractised} of ${week.goalDays} practice days this week`}>
            {Array.from({ length: week.goalDays }, (_, i) => (i < week.daysPractised ? '🟢' : '⚪')).join(' ')}
          </span>
        </div>
      </header>
      <PetSpot settings={settings} placementDone={settings.hatched || isPlacementDone(placement)} secureTotal={secure} missedYou={missedYou} />
      {!done ? (
        <Button size="big" onClick={() => navigate('/session')}>{main ? 'Carry on with today’s adventure!' : 'Start today’s adventure!'}</Button>
      ) : (
        <>
          <p className="praise">You finished today's adventure! 🎉</p>
          <Button onClick={() => navigate('/extra')}>Extra practice</Button>
        </>
      )}
      <nav className="row">
        {HOME_LINKS.map(l => <Link key={l.to} className="btn secondary" to={l.to}>{l.emoji} {l.label}</Link>)}
      </nav>
      <Link className="btn ghost grown-ups no-print" to="/parent">Grown-ups</Link>
    </main>
  )
}
