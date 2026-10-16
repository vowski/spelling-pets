import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useServices } from '../app/services'
import { STICKERS, STICKER_SETS } from '../content/rewards'
import { Button } from '../ui/Button'

export function StickerAlbum() {
  const { repo } = useServices()
  const navigate = useNavigate()
  const owned = useLiveQuery(() => repo.getEarned(), [repo])
  if (!owned) return <main className="screen"><p>Loading…</p></main>
  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}><Button variant="ghost" onClick={() => navigate('/')}>← Home</Button><h1>📒 Sticker Album</h1><span /></header>
      {STICKER_SETS.map(set => {
        const items = STICKERS.filter(s => s.set === set.id)
        const have = items.filter(s => owned.stickers.has(s.id)).length
        return (
          <section key={set.id} className="card">
            <h2>{set.name} {have}/{items.length}</h2>
            {have === items.length && <p className="praise">Set complete! 📒</p>}
            <div className="row">
              {items.map(s => owned.stickers.has(s.id)
                ? <figure key={s.id} style={{ margin: 0, textAlign: 'center' }}><div style={{ fontSize: 64, filter: 'drop-shadow(0 0 0 #fff) drop-shadow(0 3px 0 #0001)' }} aria-hidden="true">{s.emoji}</div><figcaption>{s.name}</figcaption></figure>
                : <div key={s.id} aria-label="Missing sticker" style={{ width: 80, height: 96, borderRadius: 16, background: '#eee', display: 'grid', placeItems: 'center', fontSize: 36, color: '#bbb' }}>?</div>)}
            </div>
          </section>
        )
      })}
    </main>
  )
}
