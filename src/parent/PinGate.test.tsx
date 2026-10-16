import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinGate } from './PinGate'
import { renderWithServices, makeTestServices } from '../test/render'
import { hashPin, checkPin } from '../app/pin'

async function withPin(pin = '1357') {
  const s = makeTestServices()
  await s.repo.updateSettings({ pinSalt: 'salt', pinHash: await hashPin(pin, 'salt') })
  return s
}

describe('PinGate', () => {
  it('rejects a wrong PIN and unlocks with the right one', async () => {
    const onUnlock = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<PinGate onUnlock={onUnlock} />, await withPin())
    await user.type(screen.getByLabelText('Grown-up PIN'), '1111{Enter}')
    expect(await screen.findByText("That PIN isn't right.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Grown-up PIN'))
    await user.type(screen.getByLabelText('Grown-up PIN'), '1357{Enter}')
    await waitFor(() => expect(onUnlock).toHaveBeenCalled())
  })
  it('resets a forgotten PIN after a multiplication question', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // A = 11, B = 11
    const services = await withPin()
    const onUnlock = vi.fn()
    const user = userEvent.setup()
    renderWithServices(<PinGate onUnlock={onUnlock} />, services)
    await user.click(screen.getByRole('button', { name: 'Forgot PIN?' }))
    expect(screen.getByText('What is 11 × 11?')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Answer'), '121{Enter}')
    await user.type(await screen.findByLabelText('New PIN'), '2468')
    await user.type(screen.getByLabelText('Type the PIN again'), '2468')
    await user.click(screen.getByRole('button', { name: 'Set a new PIN' }))
    await waitFor(() => expect(onUnlock).toHaveBeenCalled())
    expect(await checkPin('2468', await services.repo.getSettings())).toBe(true)
  })
})
