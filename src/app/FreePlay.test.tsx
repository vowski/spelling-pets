import { describe, it, expect, afterEach, vi } from 'vitest'
import { useEffect } from 'react'
import { GAME_COMPONENTS } from '../games/registry'
import type { GameProps } from '../games/types'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { FreePlay, FreePlayGame } from './FreePlay'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'

const realPupPost = GAME_COMPONENTS.pupPost
afterEach(() => { GAME_COMPONENTS.pupPost = realPupPost })
const playPupPost = async (services: ReturnType<typeof makeTestServices>) => {
  await services.repo.putProgress([prog('w-said', { box: 2, due: '2026-10-15' })])
  renderWithServices(<MemoryRouter initialEntries={['/play/pupPost']}><Routes><Route path="/play" element={<p>Games list</p>} /><Route path="/play/:game" element={<FreePlayGame />} /></Routes></MemoryRouter>, services)
}

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
  it('catches a game that trips over, with a way back to the games', async () => {
    GAME_COMPONENTS.pupPost = () => { throw new Error('boom') }
    const services = makeTestServices()
    await playPupPost(services)
    expect(await screen.findByText(/Oops, that game tripped over!/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to games' }))
    expect(await screen.findByText('Games list')).toBeInTheDocument()
    expect((await services.repo.getErrors()).map(e => e.message)).toContain('boom')
  })

  it('finishes a game once even if it reports finishing twice', async () => {
    GAME_COMPONENTS.pupPost = function Twice({ onDone }: GameProps) {
      useEffect(() => { onDone(); onDone() }, [onDone])
      return null
    }
    const services = makeTestServices()
    const markDone = vi.spyOn(services.repo, 'markActivityDone')
    await playPupPost(services)
    expect(await screen.findByText(/Great playing!/)).toBeInTheDocument()
    expect(markDone).toHaveBeenCalledOnce()
  })
})
