import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useServices, useToday } from '../app/services'
import { computeStats } from '../engine/stats'
import { usePersisted } from '../app/usePersisted'
import { useSpeechAvailable } from '../speech/useSpeech'
import { BarChart } from './charts/BarChart'
import { LineChart } from './charts/LineChart'
import { levelBars, secureTimeline, troubleSpots, weekSummary, weeklyAccuracy } from './overviewData'

const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function Overview() {
  const { repo, bank, clock } = useServices()
  const today = useToday()
  const canSpeak = useSpeechAvailable()
  const persisted = usePersisted()
  const data = useLiveQuery(async () => {
    const [settings, progress, units, sessions, attempts] = await Promise.all([repo.getSettings(), repo.getAllProgress(), repo.getUnits(), repo.allSessions(), repo.db.attempts.toArray()])
    return { settings, progress, units, sessions, attempts }
  }, [repo])
  if (!data) return <p>Loading…</p>
  const { settings, progress, units, sessions, attempts } = data
  const stats = computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(units.map(u => [u.unitId, u])), [])
  const week = weekSummary(sessions, attempts, today, settings.weeklyGoalDays)
  const autoStopped = settings.lastAutoBackup === 'needs-permission' || settings.lastAutoBackup === 'error'
  const stale = !autoStopped && (!settings.lastBackupAt || clock.now().getTime() - settings.lastBackupAt > 7 * 86_400_000)

  return (
    <section>
      {canSpeak === false && <p className="panel chip warn" style={{ display: 'block' }}>No British voice was found on this laptop, so spelling games show each word briefly instead of saying it. Check Settings → Voice.</p>}
      {persisted === false && <p className="panel">This browser may clear saved progress if the laptop runs low on space. Turn on automatic backup in the Data tab.</p>}
      {autoStopped && <p className="panel chip warn" style={{ display: 'block' }}>Automatic backup has stopped{settings.lastAutoBackup === 'needs-permission' ? ': this browser needs permission for the backup folder again' : ': the last one failed'}. <Link to="/parent/data">Open the Data tab and choose Reconnect backup folder.</Link></p>}
      {stale && <p className="panel chip warn" style={{ display: 'block' }}>Your progress hasn't been backed up recently. <Link to="/parent/data">Set up auto-backup in the Data tab.</Link></p>}
      <div className="panel">
        <h2>This week</h2>
        <p>Practised on <strong>{week.daysPractised}</strong> of {week.goalDays} goal days · <strong>{week.minutes}</strong> minutes · <strong>{week.wordsPractised}</strong> words · accuracy <strong>{week.accuracy === null ? '–' : `${Math.round(week.accuracy * 100)}%`}</strong></p>
      </div>
      <div className="panel">
        <h2>Progress</h2>
        {levelBars(stats).map(b => (
          <div key={b.label} style={{ margin: '10px 0' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>{b.label}</span><span>{b.secure} / {b.total}</span></div>
            <div className="bar" aria-label={`${b.label}: ${b.secure} of ${b.total}`}>
              <span style={{ width: `${(b.secure / Math.max(1, b.total)) * 100}%` }} />
              {b.markers?.map(m => <i key={m} className="marker" style={{ left: `${(m / b.total) * 100}%` }} title={m === 50 ? 'Year 3 expected (50)' : 'Greater depth (70)'} />)}
            </div>
            {b.markers && <small className="muted">Markers: 50 = Year 3 expected, 70 = greater depth</small>}
          </div>
        ))}
      </div>
      <div className="panel row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 480px' }}><LineChart title="Secure words over time" points={secureTimeline(progress, today).map(p => ({ label: short(p.weekStart), value: p.secure }))} /></div>
        <div style={{ flex: '1 1 480px' }}><BarChart title="First-try accuracy by week" points={weeklyAccuracy(attempts, today).map(p => ({ label: short(p.weekStart), value: p.accuracy, detail: `${p.attempts} answers` }))} /></div>
      </div>
      <div className="panel">
        <h2>Trouble spots</h2>
        {troubleSpots(bank, progress).length === 0 ? <p className="muted">Nothing tricky yet.</p> : (
          <table>
            <thead><tr><th>Word</th><th>Her spellings</th><th>Home tip</th></tr></thead>
            <tbody>{troubleSpots(bank, progress).map(s => (
              <tr key={s.wordId}><td><strong>{s.text}</strong></td><td>{s.misspellings.map(m => <span key={m} className="chip" style={{ marginRight: 4 }}>{m}</span>)}</td><td>{s.tip}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </section>
  )
}
