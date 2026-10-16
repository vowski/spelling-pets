import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RewardsTab } from './RewardsTab'
import { renderWithServices, makeTestServices } from '../test/render'

describe('RewardsTab', () => {
  it('sets the weekly goal, adds a reward and marks an earned one as given', async () => {
    const services = makeTestServices()
    await services.repo.saveRealReward({ id: 'old', title: 'Book', emoji: '📚', goal: { type: 'sessions', target: 1, countFrom: 'allTime' }, status: 'earned', createdAt: '2026-10-01', earnedAt: '2026-10-10' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWithServices(<RewardsTab />, services)
    await user.selectOptions(await screen.findByLabelText('Weekly goal (days)'), '4')
    await waitFor(async () => expect((await services.repo.getSettings()).weeklyGoalDays).toBe(4))
    await user.type(screen.getByLabelText('Reward'), 'Trip to the park')
    await user.selectOptions(screen.getByLabelText('Goal'), 'sessions')
    await user.clear(screen.getByLabelText('Target'))
    await user.type(screen.getByLabelText('Target'), '3')
    await user.click(screen.getByRole('button', { name: 'Add reward' }))
    expect(await screen.findByText('Trip to the park')).toBeInTheDocument()
    expect(screen.getByText('0 of 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark as given' }))
    await waitFor(async () => expect((await services.repo.getRealRewards()).find(r => r.id === 'old')).toMatchObject({ status: 'given', givenAt: '2026-10-15' }))
  })
})
