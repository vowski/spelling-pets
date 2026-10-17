import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SchoolWordsTab } from './SchoolWordsTab'
import { renderWithServices, makeTestServices } from '../test/render'

describe('SchoolWordsTab', () => {
  it('adds a weekly list with a new word and its sentence', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.type(await screen.findByLabelText("Paste or type this week's words"), '1. because{enter}2. crocodile{enter}3. monday')
    expect(screen.getByLabelText('Test date')).toHaveValue('2026-10-16')
    await user.click(screen.getByRole('button', { name: 'Check words' }))
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getAllByText('✓ in our word bank')).toHaveLength(2)
    await user.type(screen.getByLabelText('Example sentence for crocodile'), 'The crocodile swam away.')
    await user.click(screen.getByRole('button', { name: 'Save list' }))
    await waitFor(async () => expect(await services.repo.getSchoolLists()).toHaveLength(1))
    const [list] = await services.repo.getSchoolLists()
    expect(list).toMatchObject({ testDate: '2026-10-16', createdAt: '2026-10-15' })
    expect(list.items.map(i => i.wordId)).toEqual(['w-because', 'w-crocodile', 'w-monday'])
    expect(await services.repo.getCustomWords()).toEqual([{ wordId: 'w-crocodile', text: 'crocodile', sentence: 'The crocodile swam away.' }])
    expect(await screen.findByText('Upcoming tests')).toBeInTheDocument()
  })

  it('saves pasted capitals as lowercase unless the grown-up ticks that the word needs one', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.type(await screen.findByLabelText("Paste or type this week's words"), 'Crocodile{enter}London')
    await user.click(screen.getByRole('button', { name: 'Check words' }))
    await user.click(screen.getByLabelText('london needs a capital letter (a name)'))
    await user.click(screen.getByRole('button', { name: 'Save list' }))
    await waitFor(async () => expect(await services.repo.getSchoolLists()).toHaveLength(1))
    expect((await services.repo.getCustomWords()).map(c => c.text)).toEqual(['crocodile', 'London'])
  })
})
