import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { WHEEL_ANCHORS } from '../content/wheel'
import { freePlayOptions, planFreePlay, type FreePlayOption } from '../engine/freeplay'
import { GAME_META, type Activity } from '../engine/planner'
import type { GameType } from '../engine/types'
import { GAME_COMPONENTS } from '../games/registry'
import type { GameAttempt, GameSummary } from '../games/types'
import type { SessionRow } from '../storage/db'
import { Button } from '../ui/Button'
import { ErrorBoundary } from './ErrorBoundary'
import { useServices, useToday } from './services'
import { completeActivity, recordGameAttempt } from './sessionLogic'

export function FreePlay() {
  const { repo, bank } = useServices()
  const today = useToday()
  const navigate = useNavigate()
  const [options, setOptions] = useState<FreePlayOption[] | null>(null)
  useEffect(() => { void repo.loadLearnerState(today).then(s => setOptions(freePlayOptions(bank, s, WHEEL_ANCHORS))) }, [repo, bank, today])
  if (!options) return <main className="screen"><p>Loading…</p></main>
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
        <h1>🎮 Free Play</h1>
        <span />
      </header>
      <div className="row">
        {options.filter(o => GAME_COMPONENTS[o.game]).map(o => (
          <button key={o.game} type="button" className="btn secondary" disabled={!o.available} title={o.reason}
            onClick={() => navigate(`/play/${o.game}`)} style={{ width: 240, fontSize: 24 }}>
            {GAME_META[o.game].emoji} {GAME_META[o.game].label}
            {!o.available && <div style={{ fontSize: 16 }}>{o.reason}</div>}
          </button>
        ))}
      </div>
    </main>
  )
}

export function FreePlayGame() {
  const svc = useServices()
  const { repo, bank, clock } = svc
  const today = useToday()
  const navigate = useNavigate()
  const { game } = useParams()
  const [row, setRow] = useState<SessionRow | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [earned, setEarned] = useState(0)
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const finished = useRef<string | null>(null)
  const now = () => clock.now().getTime()

  useEffect(() => { svc.tips?.warmUp() }, [svc.tips])

  useEffect(() => {
    let live = true
    void (async () => {
      const state = await repo.loadLearnerState(today)
      const a = planFreePlay(bank, state, game as GameType, { seed: now() + round, wheelAnchors: WHEEL_ANCHORS })
      if (!live) return
      if (!a) { navigate('/play'); return }
      const r: SessionRow = { id: `${today}-free-${now()}`, date: today, kind: 'free', startedAt: now(), endedAt: null, plan: { kind: 'extra', activities: [a], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: false, coins: 0 }
      await repo.saveSession(r)
      setRow(r); setActivity(a); setDone(false); setEarned(0)
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, round])

  if (!row || !activity) return <main className="screen"><p>Loading…</p></main>
  const Game = GAME_COMPONENTS[activity.gameType]
  if (!Game) return null
  const words = activity.wordIds.map(id => bank.words.get(id)).filter(w => w !== undefined)
  const onAttempt = (a: GameAttempt) => {
    const p = chain.current.then(() => recordGameAttempt(svc, row, activity, a, today, now()))
    chain.current = p.then(c => setEarned(e => e + c))
  }
  const onDone = (s?: GameSummary) => {
    const key = `${activity.id}-${round}`
    if (finished.current === key) return // a game may call onDone twice; finish each round once
    finished.current = key
    chain.current = chain.current.then(async () => {
      await completeActivity(svc, row, activity, s, today, now())
      await repo.completeSession(row.id, now())
      setDone(true)
    })
  }

  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/play')}>← Games</Button>
        <span>🐾 {earned}</span>
      </header>
      {done ? (
        <section className="card">
          <h2>Great playing! 🐾 +{earned}</h2>
          <div className="row">
            <Button onClick={() => setRound(r => r + 1)}>Play again</Button>
            <Button variant="secondary" onClick={() => navigate('/play')}>Back to games</Button>
          </div>
        </section>
      ) : (
        <ErrorBoundary key={`${activity.id}-${round}`} onError={e => void repo.logError(activity.gameType, e.message, now())}
          fallback={<section className="card"><p>Oops, that game tripped over! Let's try another.</p><Button onClick={() => navigate('/play')}>Back to games</Button></section>}>
          <Game activity={activity} words={words} onAttempt={onAttempt} onDone={onDone} />
        </ErrorBoundary>
      )}
    </main>
  )
}
