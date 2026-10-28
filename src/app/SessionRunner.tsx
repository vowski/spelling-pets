import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { GAME_META, type Activity } from '../engine/planner'
import { GAME_COMPONENTS } from '../games/registry'
import type { GameAttempt, GameSummary } from '../games/types'
import type { SessionRow } from '../storage/db'
import { Button } from '../ui/Button'
import { ProgressDots } from '../ui/ProgressDots'
import { SpeakButton } from '../ui/SpeakButton'
import { Celebration } from './Celebration'
import { ErrorBoundary } from './ErrorBoundary'
import { useServices, useToday } from './services'
import { completeActivity, finishSession, nextActivity, recordGameAttempt, startOrResumeSession, type SessionOutcome } from './sessionLogic'

type Phase = 'loading' | 'intro' | 'playing' | 'finished'
let runs = 0

export function SessionRunner({ kind }: { kind: 'main' | 'extra' }) {
  const svc = useServices()
  const { repo, bank, clock, sfx } = svc
  const today = useToday()
  const navigate = useNavigate()
  const [row, setRow] = useState<SessionRow | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [earned, setEarned] = useState(0)
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const completing = useRef<string | null>(null)
  const completed = useRef<Promise<SessionRow> | null>(null)
  const advancing = useRef<string | null>(null)
  const now = () => clock.now().getTime()
  // Each time the runner opens is a new go at the current activity, so answers replayed after a pause earn no coins.
  const [run] = useState(() => `${now()}-${++runs}`)

  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.current.then(fn)
    chain.current = p.catch(e => repo.logError('session', e instanceof Error ? e.message : String(e), now()))
    return p
  }

  const advance = async (r: SessionRow) => {
    let current = r
    let next = await nextActivity(svc, current)
    while (next && !GAME_COMPONENTS[next.gameType]) {
      current = await repo.markActivityDone(current.id, next.id)
      next = await nextActivity(svc, current)
    }
    setRow(current)
    if (!next) {
      const o = await finishSession(svc, current, today, now())
      setEarned(e => e + o.coins)
      setOutcome(o)
      setPhase('finished')
      return
    }
    setActivity(next)
    setPhase('intro')
  }

  useEffect(() => {
    svc.tips?.warmUp() // load the AI model in the background so the first tip isn't slow
    let live = true
    void enqueue(async () => {
      const r = await startOrResumeSession(svc, kind, today, now())
      if (!live) return
      if (r.complete) { navigate('/'); return }
      await advance(r)
    })
    return () => { live = false }
    // run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onAttempt = (a: GameAttempt) => {
    if (!row || !activity) return
    void enqueue(() => recordGameAttempt(svc, row, activity, a, today, now(), run)).then(c => {
      if (c) { setEarned(e => e + c); sfx.coin() }
    })
  }
  // Each activity is saved as done once (onComplete, or onDone if the game has no last screen) and moved on from once.
  const complete = (s?: GameSummary): Promise<SessionRow> | null => {
    if (!row || !activity) return null
    if (completing.current !== activity.id) {
      completing.current = activity.id
      completed.current = enqueue(() => completeActivity(svc, row, activity, s, today, now()))
    }
    return completed.current
  }
  const onComplete = (s?: GameSummary) => void complete(s)
  const onDone = (s?: GameSummary) => {
    if (!activity || advancing.current === activity.id) return // a game may call onDone twice
    const saved = complete(s)
    if (!saved) return
    advancing.current = activity.id
    void enqueue(async () => advance(await saved))
  }
  const skip = () => onDone()

  if (phase === 'loading' || !row) return <main className="screen"><p>Getting your adventure ready…</p></main>

  if (phase === 'finished') return <main className="screen"><Celebration outcome={outcome!} earned={earned} onHome={() => navigate('/')} /></main>

  const visible = row.plan.activities.filter(a => GAME_COMPONENTS[a.gameType])
  const doneCount = visible.filter(a => row.doneActivityIds.includes(a.id)).length
  const meta = GAME_META[activity!.gameType]
  const Game = GAME_COMPONENTS[activity!.gameType]!
  const words = activity!.wordIds.map(id => bank.words.get(id)).filter(w => w !== undefined)

  return (
    <main className="screen">
      <header className="row no-print" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>⏸ Pause</Button>
        <ProgressDots done={doneCount} total={visible.length} />
        <span aria-label={`${earned} coins this session`}>🐾 {earned}</span>
      </header>
      {phase === 'intro' ? (
        <section className="card">
          <h2>{meta.emoji} {activity!.finale ? 'Last one: a word you know!' : meta.label}</h2>
          <p>{meta.intro}</p>
          <SpeakButton text={meta.intro} />
          <Button size="big" onClick={() => setPhase('playing')}>Let's go!</Button>
        </section>
      ) : (
        <ErrorBoundary
          key={activity!.id}
          onError={e => void repo.logError(activity!.gameType, e.message, now())}
          fallback={<section className="card"><p>Oops, that game tripped over! Let's try another.</p><Button onClick={skip}>Next</Button></section>}>
          <Game activity={activity!} words={words} onAttempt={onAttempt} onDone={onDone} onComplete={onComplete} />
        </ErrorBoundary>
      )}
    </main>
  )
}
