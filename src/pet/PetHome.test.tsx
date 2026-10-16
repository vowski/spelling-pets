import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { PetHome } from './PetHome'
import { renderWithServices, makeTestServices } from '../test/render'
import { buildPlacementPlan } from '../engine/placement'
import { BUILTIN_BANK } from '../content'

describe('PetHome', () => {
  it('feeds the pet and changes clothes', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ petName: 'Biscuit', petSpecies: 'puppy', hatched: true, firstRunDone: true })
    await services.repo.savePlacement(buildPlacementPlan(BUILTIN_BANK, 1).map(l => ({ ...l, status: 'done' as const })))
    await services.repo.addItem('apple')
    await services.repo.addItem('crown')
    await services.repo.addItem('plant')
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><PetHome /></MemoryRouter>, services)
    expect(await screen.findByRole('img', { name: 'Biscuit the puppy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Plant decoration')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Feed Apple (1)' }))
    expect(await screen.findByText('Yum! Biscuit loved the Apple.')).toBeInTheDocument()
    expect(await services.repo.getInventory()).not.toContainEqual(expect.objectContaining({ itemId: 'apple' }))
    await user.click(screen.getByRole('button', { name: 'Wear Crown' }))
    expect((await services.repo.getSettings()).equipped).toEqual({ hat: 'crown' })
    await user.click(await screen.findByRole('button', { name: 'Take off Crown' }))
    expect((await services.repo.getSettings()).equipped).toEqual({})
  })
})
