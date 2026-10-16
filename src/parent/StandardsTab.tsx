import { useLiveQuery } from 'dexie-react-hooks'
import { useServices } from '../app/services'
import { STANDARDS, type Band } from '../content/standards'
import { evaluateStandard, gridBand, type GridBand } from '../engine/standards-eval'
import { computeStats } from '../engine/stats'

const BAND_LABEL: Record<GridBand, string> = { notYet: 'Not yet', towards: 'Working towards', at: 'Working at', greaterDepth: 'Greater depth' }
const BANDS: Band[] = ['towards', 'at', 'greaterDepth']

export function StandardsTab() {
  const { repo, bank } = useServices()
  const stats = useLiveQuery(async () => {
    const [progress, units, story] = await Promise.all([repo.getAllProgress(), repo.getUnits(), repo.recentStoryResults(50)])
    return computeStats(bank, new Map(progress.map(p => [p.wordId, p])), new Map(units.map(u => [u.unitId, u])), story)
  }, [repo, bank])
  if (!stats) return <p>Loading…</p>
  return (
    <section>
      {([3, 2, 1] as const).map(grid => {
        const band = gridBand(STANDARDS, stats, grid)
        return (
          <section key={grid} className="panel" aria-label={`Year ${grid} writing grid`}>
            <h2>Year {grid} writing grid <span className={`chip ${band === 'notYet' ? 'warn' : 'good'}`}>{BAND_LABEL[band]}</span></h2>
            {BANDS.map(b => (
              <div key={b}>
                <h3>{BAND_LABEL[b]}</h3>
                <table><tbody>
                  {STANDARDS.filter(r => r.grid === grid && r.band === b).map(r => {
                    const res = evaluateStandard(r, stats)
                    return (
                      <tr key={r.id}>
                        <td style={{ width: '45%' }}>{r.text}</td>
                        <td style={{ width: '20%' }}>{res.met ? <span className="chip good">✓ Met</span> : <div className="bar" aria-label={`${Math.round(res.progress * 100)}% of the way`}><span style={{ width: `${res.progress * 100}%` }} /></div>}</td>
                        <td className="muted">{res.evidence}</td>
                      </tr>
                    )
                  })}
                </tbody></table>
              </div>
            ))}
          </section>
        )
      })}
      <p className="muted">Statements paraphrased from the school's writing assessment grids. "Secure" means spelt correctly from memory on 3 separate days over at least a week.</p>
    </section>
  )
}
