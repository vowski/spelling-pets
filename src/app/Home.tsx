import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { diffDays } from '../engine/dates'
import { huntProgress, isPlacementDone } from '../engine/placement'
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
  // Today's unfinished Treasure Hunt counts as one hunt, however few of its words are left.
  const openHunt = main && !main.complete ? main.plan.activities.filter(a => a.gameType === 'treasureHunt').flatMap(a => a.wordIds) : []
  const hatch = { ...huntProgress(placement, openHunt), todayDone: done }
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <h1>{settings.childName ? `${settings.childName}'s Spelling Pets` : 'Spelling Pets'}</h1>
        <div className="row">
          <span aria-label={`${settings.coins} paw coins`} style={{ fontWeight: 700 }}>🐾 {settings.coins}</span>
          {/* Labelled, so the practice-day dots aren't mistaken for the egg's progress; kept on one line together. */}
          <span style={{ whiteSpace: 'nowrap' }}>
            <span className="muted" aria-hidden="true">This week </span>
            <span aria-label={`${week.daysPractised} of ${week.goalDays} practice days this week`}>
              {Array.from({ length: week.goalDays }, (_, i) => (i < week.daysPractised ? '🟢' : '⚪')).join(' ')}
            </span>
          </span>
        </div>
      </header>
      <PetSpot settings={settings} placementDone={settings.hatched || isPlacementDone(placement)} secureTotal={secure} missedYou={missedYou} hatch={hatch} />
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
