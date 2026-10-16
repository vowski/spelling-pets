import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Shop } from './Shop'
import { renderWithServices, makeTestServices } from '../test/render'

describe('Shop', () => {
  it('buys food repeatedly and wears a new accessory', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ petName: 'Biscuit', firstRunDone: true })
    await services.repo.addCoins(70, 'test', 1)
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><Shop /></MemoryRouter>, services)
    await user.click(await screen.findByRole('button', { name: 'Buy Apple for 5' }))
    await user.click(screen.getByRole('button', { name: 'Buy Apple for 5' }))
    expect(await services.repo.balance()).toBe(60)
    expect(await services.repo.getInventory()).toEqual([{ itemId: 'apple', count: 2 }])
    await user.click(screen.getByRole('tab', { name: /Dress-up/ }))
    await user.click(screen.getByRole('button', { name: 'Buy Party hat for 50' }))
    expect(await screen.findByText('Biscuit is wearing the Party hat!')).toBeInTheDocument()
    expect((await services.repo.getSettings()).equipped).toEqual({ hat: 'party-hat' })
    expect(screen.getByText('Owned ✓')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy Crown for 150' })).toBeDisabled()
  })
})
