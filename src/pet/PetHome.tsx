import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { usePetMood } from '../app/petMood'
import { useServices } from '../app/services'
import { SHOP_ITEMS } from '../content/rewards'
import { isPlacementDone } from '../engine/placement'
import { petStage } from '../engine/rewards'
import { Button } from '../ui/Button'
import { Egg } from './Egg'
import { PetView } from './PetView'

export function PetHome() {
  const { repo } = useServices()
  const navigate = useNavigate()
  const setMood = usePetMood(s => s.setMood)
  const [message, setMessage] = useState('')
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const inventory = useLiveQuery(() => repo.getInventory(), [repo])
  const placement = useLiveQuery(() => repo.getPlacement(), [repo])
  const secure = useLiveQuery(() => repo.db.progress.where('box').aboveOrEqual(4).count(), [repo])
  if (!settings || !inventory || !placement || secure === undefined) return <main className="screen"><p>Loading…</p></main>
  const stage = petStage(secure, settings.hatched || isPlacementDone(placement)) // a re-run Treasure Hunt never turns her pet back into an egg
  const items = (cat: string) => inventory.map(i => ({ ...i, item: SHOP_ITEMS.find(s => s.id === i.itemId)! })).filter(x => x.item?.category === cat)

  const feed = async (id: string, name: string) => {
    if (!(await repo.useItem(id))) return
    setMood('eat', 2500)
    setMessage(`Yum! ${settings.petName} loved the ${name}.`)
  }
  const toggle = async (id: string) => {
    const item = SHOP_ITEMS.find(s => s.id === id)!
    const wearing = settings.equipped[item.slot!] === id
    const equipped = { ...settings.equipped }
    if (wearing) delete equipped[item.slot!]
    else equipped[item.slot!] = id
    await repo.updateSettings({ equipped })
  }

  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
        <h1>🏠 {settings.petName}'s room</h1>
        <span />
      </header>
      <div className="card" style={{ position: 'relative', height: 360, background: 'linear-gradient(#e8f6ff 60%, #f3e3c3 60%)' }}>
        {items('decoration').map(({ item }) => (
          <span key={item.id} aria-label={`${item.name} decoration`} style={{ position: 'absolute', left: `${item.position!.x}%`, top: `${item.position!.y}%`, fontSize: 48, transform: 'translate(-50%, -50%)' }}>{item.emoji}</span>
        ))}
        <div style={{ position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)' }}>
          {stage === 'egg' ? <Egg species={settings.petSpecies} wobble /> : <PetView species={settings.petSpecies} stage={stage} name={settings.petName} equipped={settings.equipped} live />}
        </div>
      </div>
      <p className="nudge" aria-live="polite">{message}</p>
      <section className="row">
        <div className="card" style={{ width: 280 }}>
          <h3>🍽️ Food</h3>
          {items('food').length === 0 && <p className="muted">Buy treats in the shop!</p>}
          <div className="row">{items('food').map(({ itemId, count, item }) => <Button key={itemId} variant="ghost" aria-label={`Feed ${item.name} (${count})`} onClick={() => void feed(itemId, item.name)}>{item.emoji} ×{count}</Button>)}</div>
        </div>
        <div className="card" style={{ width: 280 }}>
          <h3>🧸 Toys</h3>
          <div className="row">{items('toy').map(({ itemId, item }) => <Button key={itemId} variant="ghost" aria-label={`Play with ${item.name}`} onClick={() => setMood('happy', 2000)}>{item.emoji}</Button>)}</div>
        </div>
        <div className="card" style={{ width: 280 }}>
          <h3>👗 Wardrobe</h3>
          <div className="row">{items('accessory').map(({ itemId, item }) => {
            const wearing = settings.equipped[item.slot!] === itemId
            return <Button key={itemId} variant={wearing ? 'primary' : 'ghost'} aria-label={`${wearing ? 'Take off' : 'Wear'} ${item.name}`} onClick={() => void toggle(itemId)}>{item.emoji}</Button>
          })}</div>
        </div>
      </section>
    </main>
  )
}
