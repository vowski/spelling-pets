import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionRunner } from './SessionRunner'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'

describe('SessionRunner', () => {
  it('introduces each activity, runs it and celebrates at the end', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-said', { box: 1, due: '2026-10-15' })])
    await services.repo.saveSession({ id: 's1', date: '2026-10-15', kind: 'main', startedAt: 1, endedAt: null, doneActivityIds: [], complete: false, coins: 0,
      plan: { kind: 'normal', newMaterial: { kind: 'none' }, activities: [
        { id: 'a1', gameType: 'pupPost', wordIds: ['w-said'] },
      ] } })
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter initialEntries={['/session']}><Routes><Route path="/session" element={<SessionRunner kind="main" />} /><Route path="/" element={<p>home</p>} /></Routes></MemoryRouter>, services)
    expect(await screen.findByRole('heading', { name: /Pup Post/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Let's go!" }))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    expect(await screen.findByText('Adventure complete! 🎉')).toBeInTheDocument()
    expect(screen.getByText(/You earned 🐾 23/)).toBeInTheDocument()
    expect((await services.repo.getSession('s1'))?.complete).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Back home' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })
})
