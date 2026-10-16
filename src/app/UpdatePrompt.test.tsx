import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const update = vi.fn()
vi.mock('./pwaRegister', () => ({ useRegisterSW: () => ({ needRefresh: [true, () => {}], offlineReady: [false, () => {}], updateServiceWorker: update }) }))
const { UpdatePrompt } = await import('./UpdatePrompt')

describe('UpdatePrompt', () => {
  it('offers the update when one is waiting', async () => {
    render(<UpdatePrompt />)
    expect(screen.getByText('New things to discover! 🐾')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(update).toHaveBeenCalledWith(true)
  })
})
