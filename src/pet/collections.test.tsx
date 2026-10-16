import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { StickerAlbum } from './StickerAlbum'
import { PetPark } from './PetPark'
import { Trophies } from './Trophies'
import { RewardPath } from './RewardPath'
import { renderWithServices, makeTestServices } from '../test/render'

async function seeded() {
  const s = makeTestServices()
  await s.repo.addAwards([{ kind: 'sticker', id: 'farm-cow' }, { kind: 'badge', id: 'secure-1' }, { kind: 'friend', id: 'friend-days' }], 1)
  await s.repo.saveRealReward({ id: 'r1', title: 'Park trip', emoji: '🛝', goal: { type: 'sessions', target: 5, countFrom: 'allTime' }, status: 'active', createdAt: '2026-10-01' })
  await s.repo.saveRealReward({ id: 'r2', title: 'New book', emoji: '📚', goal: { type: 'sessions', target: 1, countFrom: 'allTime' }, status: 'earned', createdAt: '2026-10-01', earnedAt: '2026-10-10' })
  await s.repo.saveSession({ id: 's', date: '2026-10-15', kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal', activities: [], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: true, coins: 0 })
  return s
}

describe('collections', () => {
  it('shows owned and missing stickers', async () => {
    renderWithServices(<MemoryRouter><StickerAlbum /></MemoryRouter>, await seeded())
    expect(await screen.findByText('Farm 1/10')).toBeInTheDocument()
    expect(screen.getByText('Cow')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Missing sticker')).toHaveLength(59)
  })
  it('shows friends in the park', async () => {
    renderWithServices(<MemoryRouter><PetPark /></MemoryRouter>, await seeded())
    expect(await screen.findByText('Ollie the Owl')).toBeInTheDocument()
    expect(screen.getByText('Unlocks when: all Year 1 tricky words Secure')).toBeInTheDocument()
  })
  it('shows earned and locked badges', async () => {
    renderWithServices(<MemoryRouter><Trophies /></MemoryRouter>, await seeded())
    expect(await screen.findByText('First Word')).toBeInTheDocument()
    expect(screen.getByLabelText('Locked badge: Ten Words')).toBeInTheDocument()
  })
  it('shows reward progress and earned rewards', async () => {
    renderWithServices(<MemoryRouter><RewardPath /></MemoryRouter>, await seeded())
    expect(await screen.findByText('1 of 5')).toBeInTheDocument()
    expect(screen.getByText(/New book/)).toBeInTheDocument()
    expect(screen.getByText('Tell your grown-up! 🎉')).toBeInTheDocument()
  })
})
