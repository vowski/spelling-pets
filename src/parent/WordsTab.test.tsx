import { describe, it, expect, vi } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WordsTab } from './WordsTab'
import { servicesWithTips } from '../test/fakeTipModel'
import { renderWithServices, makeTestServices } from '../test/render'
import { prog } from '../engine/testing'
import { catchCsvDownload } from '../test/csvDownload'

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

  it('lists the Years 5–6 words as their own word set', async () => {
    renderWithServices(<WordsTab />, makeTestServices())
    await userEvent.setup().selectOptions(await screen.findByLabelText('Word set'), 'Year 5/6 list')
    expect(screen.getByRole('cell', { name: 'accommodate' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'said' })).not.toBeInTheDocument()
  })

  // CSV downloads (2026-11-09): the words the filters show, all of them, not only the first page.
  it('downloads the words it is showing as a CSV file', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-said', { box: 2, seen: 4, correct: 3, misspellings: { sed: 1, '=sed': 1 } })])
    const saved = catchCsvDownload()
    const user = userEvent.setup()
    renderWithServices(<WordsTab />, services)
    await user.selectOptions(await screen.findByLabelText('Word set'), 'y1cew')
    await user.click(screen.getByRole('button', { name: 'Download these words (CSV)' }))
    await waitFor(async () => expect((await saved()).name).toBe('spelling-pets-words-2026-10-15.csv'))
    const lines = (await saved()).text.split('\r\n')
    expect(lines[0]).toBe('Word,Word sets,Status,Times asked,Right first time,Accuracy (%),Last seen,Next check,Secure since,Focus,Her misspellings')
    expect(lines).toHaveLength(1 + 45) // every Year 1 tricky word
    // A spelling she typed that starts with "=" is kept as text, never run as a spreadsheet formula.
    expect(lines.find(l => l.startsWith('said,'))).toBe("said,Year 1 tricky words; High-frequency,Practising,4,3,75,,,,,'=sed (1); sed (1)")
  })

  it('calls a word one check away from Secure "Nearly secure"', async () => {
    const services = makeTestServices()
    await services.repo.putProgress([prog('w-was', { box: 3, due: '2026-10-20' })])
    renderWithServices(<WordsTab />, services)
    await userEvent.setup().selectOptions(await screen.findByLabelText('Word set'), 'y1cew')
    expect(within(screen.getByRole('cell', { name: 'was' }).closest('tr')!).getByText('Nearly secure')).toBeInTheDocument()
  })

  it('shows the last tip for a word and lets the grown-up switch it to plain tips', async () => {
    const services = await servicesWithTips(makeTestServices())
    await services.repo.putTip({ key: 'w-here|hear|shown', wordId: 'w-here', attempt: 'hear', text: 'T', source: 'ai', at: 5 })
    const user = userEvent.setup()
    renderWithServices(<WordsTab />, services)
    await user.type(await screen.findByLabelText('Search'), 'here')
    const row = screen.getByRole('cell', { name: 'here' }).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'History' }))
    expect(await screen.findByText('Last tip (AI): T')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Use plain tips for this word' }))
    await waitFor(async () => expect((await services.repo.getSettings()).plainTipWordIds).toEqual(['w-here']))
    expect(await within(row).findByRole('button', { name: 'Allow AI tips for this word' })).toBeInTheDocument()
  })
})
