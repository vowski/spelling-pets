import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { FreePlay, FreePlayGame } from './FreePlay'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'

describe('FreePlay', () => {
  it('lists games and plays one as a free session', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-said', { box: 2, due: '2026-10-15' })])
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter initialEntries={['/play']}><Routes><Route path="/play" element={<FreePlay />} /><Route path="/play/:game" element={<FreePlayGame />} /></Routes></MemoryRouter>, services)
    expect(await screen.findByRole('button', { name: /Pup Post/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Sort the Pen/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Pup Post/ }))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    expect(await screen.findByText(/Great playing!/)).toBeInTheDocument()
    const sessions = await services.repo.allSessions()
    expect(sessions).toEqual([expect.objectContaining({ kind: 'free', complete: true })])
    expect(await services.repo.completeSessionDates()).toEqual([])
  })
})
