import { describe, it, expect, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WordsTab } from './WordsTab'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'

describe('WordsTab', () => {
  it('filters, focuses and marks words as known', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-said', { box: 2, seen: 4, correct: 3, misspellings: { sed: 1 } })])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderWithServices(<WordsTab />, services)
    await user.selectOptions(await screen.findByLabelText('Word set'), 'y1cew')
    expect(screen.getByRole('cell', { name: 'said' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'February' })).not.toBeInTheDocument()
    const row = screen.getByRole('cell', { name: 'said' }).closest('tr')!
    expect(within(row).getByText('Practising')).toBeInTheDocument()
    expect(within(row).getByText('3/4')).toBeInTheDocument()
    expect(within(row).getByText('sed')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: '⭐ Focus' }))
    await waitFor(async () => expect((await services.repo.getAllProgress()).find(p => p.wordId === 'w-said')?.focus).toBe(true))
    await user.click(within(row).getByRole('button', { name: 'She knows this' }))
    await waitFor(async () => expect((await services.repo.getAllProgress()).find(p => p.wordId === 'w-said')?.box).toBe(4))
    await user.selectOptions(screen.getByLabelText('Status'), 'Secure')
    expect(screen.getByRole('cell', { name: /^said/ })).toBeInTheDocument() // the cell reads 'said ⭐' while focused
  })
})
