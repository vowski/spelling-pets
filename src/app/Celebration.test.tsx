import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Celebration } from './Celebration'
import { renderWithServices, makeTestServices } from '../test/render'

describe('Celebration', () => {
  it('hatches the pet first, then lists every reward', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ petName: 'Biscuit', petSpecies: 'puppy' })
    const onHome = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<Celebration earned={23} onHome={onHome} outcome={{
      coins: 20, weeklyGoalJustMet: true, hatched: true, stageBefore: 'egg', stageAfter: 'baby',
      awards: [{ kind: 'sticker', id: 'woodland-fox' }, { kind: 'badge', id: 'secure-1' }, { kind: 'friend', id: 'friend-days' }, { kind: 'coins', amount: 10, reason: 'Your sticker album is full!' }],
      earnedRewards: [{ id: 'r', title: 'Trip to the park', emoji: '🛝', goal: { type: 'sessions', target: 1, countFrom: 'allTime' }, status: 'earned', createdAt: '2026-10-01', earnedAt: '2026-10-15' }],
    }} />, services)
    expect(await screen.findByText(/Biscuit is hatching/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Say hello!' }))
    expect(await screen.findByText('Adventure complete! 🎉')).toBeInTheDocument()
    expect(screen.getByText('You earned 🐾 23')).toBeInTheDocument()
    expect(screen.getByText(/weekly goal/)).toBeInTheDocument()
    expect(screen.getByText('New sticker: 🦊 Fox!')).toBeInTheDocument()
    expect(screen.getByText('New badge: 🌱 First Word')).toBeInTheDocument()
    expect(screen.getByText('A new friend moved into your Pet Park: 🦉 Ollie the Owl!')).toBeInTheDocument()
    expect(screen.getByText('+10 🐾: Your sticker album is full!')).toBeInTheDocument()
    expect(screen.getByText("You've earned: 🛝 Trip to the park! Tell your grown-up 🎉")).toBeInTheDocument()
    expect((await services.repo.getSettings()).hatched).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Back home' }))
    expect(onHome).toHaveBeenCalled()
  })
  it('only says the pet grew when it reached a bigger stage', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ petName: 'Biscuit', petSpecies: 'puppy', hatched: true })
    renderWithServices(<Celebration earned={20} onHome={() => {}} outcome={{ coins: 20, weeklyGoalJustMet: false, hatched: false, stageBefore: 'young', stageAfter: 'baby', awards: [], earnedRewards: [] }} />, services)
    expect(await screen.findByText('Adventure complete! 🎉')).toBeInTheDocument()
    expect(screen.queryByText(/grew bigger/)).not.toBeInTheDocument()
  })
})
