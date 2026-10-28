import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionRunner } from './SessionRunner'
import { renderWithServices, makeTestServices } from '../test/render'
import { servicesWithTips } from '../test/fakeTipModel'
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

  it('does not pay again for words answered before a pause', async () => {
    const services = makeTestServices()
    await services.repo.saveSession({ id: 's1', date: '2026-10-15', kind: 'main', startedAt: 1, endedAt: null, doneActivityIds: [], complete: false, coins: 0,
      plan: { kind: 'normal', newMaterial: { kind: 'none' }, activities: [
        { id: 'a1', gameType: 'pupPost', wordIds: ['w-said', 'w-was'] },
        { id: 'a2', gameType: 'pupPost', wordIds: ['w-the'] },
      ] } })
    const user = userEvent.setup()
    const ui = <MemoryRouter initialEntries={['/session']}><Routes><Route path="/session" element={<SessionRunner kind="main" />} /><Route path="/" element={<p>home</p>} /></Routes></MemoryRouter>
    const first = renderWithServices(ui, services)
    await user.click(await screen.findByRole('button', { name: "Let's go!" }))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    await waitFor(async () => expect(await services.repo.balance()).toBe(3))
    await user.click(screen.getByRole('button', { name: '⏸ Pause' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
    first.unmount()

    renderWithServices(ui, services)
    await user.click(await screen.findByRole('button', { name: "Let's go!" }))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    await user.type(await screen.findByLabelText('Your spelling'), 'was{Enter}')
    expect(await screen.findByRole('button', { name: "Let's go!" })).toBeInTheDocument()
    expect(await services.repo.attemptsForWord('w-said')).toHaveLength(2)
    expect(await services.repo.balance()).toBe(6)
  })

  it('saves the Treasure Hunt as done when her answers appear, so pausing there does not replay it', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    const ui = <MemoryRouter initialEntries={['/session']}><Routes><Route path="/session" element={<SessionRunner kind="main" />} /><Route path="/" element={<p>home</p>} /></Routes></MemoryRouter>
    const first = renderWithServices(ui, services)
    expect(await screen.findByRole('heading', { name: /Treasure Hunt/ })).toBeInTheDocument()
    const [session] = await services.repo.allSessions()
    const hunt = session.plan.activities[0]
    await user.click(screen.getByRole('button', { name: "Let's go!" }))
    for (const id of hunt.wordIds) await user.type(await screen.findByLabelText('Your spelling'), `${services.bank.words.get(id)!.text}{Enter}`)
    expect(await screen.findByRole('heading', { name: 'Your Treasure Hunt answers' })).toBeInTheDocument()
    await waitFor(async () => expect((await services.repo.getSession(session.id))?.doneActivityIds).toContain(hunt.id))
    await user.click(screen.getByRole('button', { name: '⏸ Pause' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
    first.unmount()
    renderWithServices(ui, services)
    expect(await screen.findByRole('button', { name: "Let's go!" })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Treasure Hunt/ })).not.toBeInTheDocument()
  }, 30_000)

  it('warms the AI model up when the adventure starts', async () => {
    const services = await servicesWithTips(makeTestServices())
    const warmUp = vi.spyOn(services.tips, 'warmUp')
    renderWithServices(<MemoryRouter initialEntries={['/session']}><Routes><Route path="/session" element={<SessionRunner kind="main" />} /><Route path="/" element={<p>home</p>} /></Routes></MemoryRouter>, services)
    await waitFor(() => expect(warmUp).toHaveBeenCalledOnce())
  })
})
