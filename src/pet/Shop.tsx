import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useServices } from '../app/services'
import { SHOP_ITEMS, type ShopCategory, type ShopItem } from '../content/rewards'
import { Button } from '../ui/Button'

const TABS: { id: ShopCategory; label: string }[] = [
  { id: 'food', label: '🍎 Food' }, { id: 'toy', label: '🧸 Toys' }, { id: 'accessory', label: '🎀 Dress-up' }, { id: 'decoration', label: '🌈 Room' },
]

export function Shop() {
  const { repo, clock, sfx } = useServices()
  const navigate = useNavigate()
  const [tab, setTab] = useState<ShopCategory>('food')
  const [message, setMessage] = useState('')
  const settings = useLiveQuery(() => repo.getSettings(), [repo])
  const inventory = useLiveQuery(() => repo.getInventory(), [repo])
  if (!settings || !inventory) return <main className="screen"><p>Loading…</p></main>
  const owned = (id: string) => inventory.some(i => i.itemId === id)
  const shortOfCoins = SHOP_ITEMS.some(i => i.category === tab && settings.coins < i.price && (i.category === 'food' || !owned(i.id)))

  const buy = async (item: ShopItem) => {
    if (!(await repo.spendCoins(item.price, `Bought ${item.name}`, clock.now().getTime()))) { setMessage('Keep practising to earn more 🐾'); return }
    await repo.addItem(item.id)
    sfx.coin()
    if (item.category === 'accessory' && item.slot) {
      await repo.updateSettings({ equipped: { ...settings.equipped, [item.slot]: item.id } })
      setMessage(`${settings.petName} is wearing the ${item.name}!`)
    } else setMessage(`You bought ${item.emoji} ${item.name}!`)
  }

  return (
    <main className="screen">
      <header className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>← Home</Button>
        <h1>🛍️ Pet Shop</h1>
        <span aria-label={`${settings.coins} paw coins`}>🐾 {settings.coins}</span>
      </header>
      <div role="tablist" className="row">
        {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={`btn ${tab === t.id ? '' : 'ghost'}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <p className="nudge" aria-live="polite">{message || (shortOfCoins ? 'Keep practising to earn more 🐾' : '')}</p>
      <div className="row">
        {SHOP_ITEMS.filter(i => i.category === tab).map(item => {
          const isOwned = item.category !== 'food' && owned(item.id)
          return (
            <div key={item.id} className="card" style={{ width: 200 }}>
              <span style={{ fontSize: 56 }} aria-hidden="true">{item.emoji}</span>
              <strong>{item.name}</strong>
              {isOwned ? <span>Owned ✓</span> : (
                <Button aria-label={`Buy ${item.name} for ${item.price}`} disabled={settings.coins < item.price} onClick={() => void buy(item)}>🐾 {item.price}</Button>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
