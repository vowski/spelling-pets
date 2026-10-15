import { describe, it, expect } from 'vitest'
import { STICKERS, STICKER_SETS, BADGES, FRIENDS, SHOP_ITEMS } from './rewards'

describe('reward content', () => {
  it('has 60 unique stickers, 10 in each of 6 sets', () => {
    expect(STICKERS).toHaveLength(60)
    expect(new Set(STICKERS.map(s => s.id)).size).toBe(60)
    expect(new Set(STICKERS.map(s => s.emoji)).size).toBe(60)
    for (const set of STICKER_SETS) expect(STICKERS.filter(s => s.set === set.id)).toHaveLength(10)
  })
  it('has an album badge per sticker set and metric badges with thresholds', () => {
    for (const set of STICKER_SETS) expect(BADGES.find(b => b.id === `album-${set.id}`)).toBeDefined()
    BADGES.filter(b => b.metric).forEach(b => expect(b.atLeast).toBeGreaterThan(0))
    expect(new Set(BADGES.map(b => b.id)).size).toBe(BADGES.length)
  })
  it('has friends for every level and every 5 units', () => {
    expect(FRIENDS.filter(f => f.condition.kind === 'units').map(f => (f.condition as { count: number }).count)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
    expect(new Set(FRIENDS.map(f => f.id)).size).toBe(FRIENDS.length)
  })
  it('prices shop items in the spec ranges', () => {
    const range = { food: [5, 15], toy: [30, 60], accessory: [50, 150], decoration: [40, 200] } as const
    for (const item of SHOP_ITEMS) {
      const [lo, hi] = range[item.category]
      expect(item.price, item.id).toBeGreaterThanOrEqual(lo)
      expect(item.price, item.id).toBeLessThanOrEqual(hi)
      if (item.category === 'accessory') expect(item.slot).toBeDefined()
      if (item.category === 'decoration') expect(item.position).toBeDefined()
    }
    expect(new Set(SHOP_ITEMS.map(i => i.id)).size).toBe(SHOP_ITEMS.length)
  })
})
