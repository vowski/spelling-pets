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
  const now = () => clock.now().getTime()

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
    void enqueue(() => recordGameAttempt(svc, row, activity, a, today, now())).then(c => {
      if (c) { setEarned(e => e + c); sfx.coin() }
    })
  }
  const onDone = (s?: GameSummary) => {
    if (!row || !activity || completing.current === activity.id) return // a game may call onDone twice; finish each activity once
    completing.current = activity.id
    void enqueue(async () => advance(await completeActivity(svc, row, activity, s, today, now())))
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
          <Game activity={activity!} words={words} onAttempt={onAttempt} onDone={onDone} />
        </ErrorBoundary>
      )}
    </main>
  )
}
