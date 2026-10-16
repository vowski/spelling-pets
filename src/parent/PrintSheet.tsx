import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router'
import { useServices } from '../app/services'
import { Button } from '../ui/Button'

export function PrintSheet() {
  const { repo, bank } = useServices()
  const listId = useParams()['*'] || undefined // route is print/* so the list id is the splat
  const words = useLiveQuery(async () => {
    if (listId) return (await repo.getSchoolLists()).find(l => l.id === listId)?.items.map(i => i.text) ?? []
    const progress = await repo.getAllProgress()
    return progress.filter(p => p.box >= 1 && p.box <= 3).sort((a, b) => (b.introducedOn ?? '').localeCompare(a.introducedOn ?? '')).slice(0, 12).map(p => bank.words.get(p.wordId)?.text).filter((t): t is string => !!t)
  }, [repo, bank, listId])
  if (!words) return <p>Loading…</p>
  return (
    <section className="panel">
      <h2>Look, Say, Cover, Write, Check</h2>
      <Button className="no-print" onClick={() => window.print()}>Print</Button>
      <table style={{ marginTop: 12, fontSize: 22 }}>
        <thead><tr><th>Look and say</th>{[1, 2, 3].map(n => [<th key={`w${n}`}>Write</th>, <th key={`c${n}`}>Check</th>])}</tr></thead>
        <tbody>{words.map(w => (
          <tr key={w} style={{ height: 56 }}><td style={{ fontFamily: 'Andika, sans-serif', fontSize: 28 }}>{w}</td>{[1, 2, 3].map(n => [<td key={`w${n}`} style={{ borderBottom: '2px solid #999', minWidth: 140 }} />, <td key={`c${n}`} style={{ width: 40 }}>☐</td>])}</tr>
        ))}</tbody>
      </table>
    </section>
  )
}
