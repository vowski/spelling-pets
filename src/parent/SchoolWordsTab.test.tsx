import { describe, it, expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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

  it('tells the grown-up which pieces it left out', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.type(await screen.findByLabelText("Paste or type this week's words"), 'because{enter}naïve')
    await user.click(screen.getByRole('button', { name: 'Check words' }))
    expect(screen.getByText(/Left out: naïve/)).toBeInTheDocument()
  })

  it('will not save a list without a test date', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.type(await screen.findByLabelText("Paste or type this week's words"), 'because')
    fireEvent.change(screen.getByLabelText('Test date'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Check words' }))
    await user.click(screen.getByRole('button', { name: 'Save list' }))
    expect(await screen.findByText('Choose the test date first.')).toBeInTheDocument()
    expect(await services.repo.getSchoolLists()).toEqual([])
  })

  it('keeps a saved score when Save score is pressed without changing it', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    await services.repo.saveSchoolList({ id: 'l1', createdAt: '2026-10-05', testDate: '2026-10-09', items: [{ text: 'because', wordId: 'w-because' }], score: 1, outOf: 1 }, [])
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.click(await screen.findByRole('button', { name: 'Save score' }))
    const [list] = await services.repo.getSchoolLists()
    expect(list).toMatchObject({ score: 1, outOf: 1 })
  })

  it('asks for a score instead of saving a blank one', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    await services.repo.saveSchoolList({ id: 'l1', createdAt: '2026-10-05', testDate: '2026-10-09', items: [{ text: 'because', wordId: 'w-because' }, { text: 'friend', wordId: 'w-friend' }] }, [])
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    await user.click(await screen.findByRole('button', { name: 'Save score' }))
    expect(await screen.findByText('Type a score from 0 to 2.')).toBeInTheDocument()
    const [list] = await services.repo.getSchoolLists()
    expect(list.score).toBeUndefined()
    await user.type(screen.getByLabelText('Score for 2026-10-09'), '2')
    await user.click(screen.getByRole('button', { name: 'Save score' }))
    await waitFor(async () => expect((await services.repo.getSchoolLists())[0]).toMatchObject({ score: 2, outOf: 2 }))
  })
  // Weekly spellings (2026-11-03): a whole term pasted at once, with two named lists.
  it('adds a whole term of named lists from one paste, and replaces a list pasted again', async () => {
    const services = makeTestServices()
    const user = userEvent.setup()
    renderWithServices(<MemoryRouter><SchoolWordsTab /></MemoryRouter>, services)
    const box = await screen.findByLabelText('Paste a whole term of lists')
    fireEvent.change(box, { target: { value: 'Class list\n19/10/26: because, crocodile\n26/10/26: said, was\n\nMy words\n19/10/26: the, d0g\n31/2/26: hen\n12/10/25: old' } })
    await user.click(screen.getByRole('button', { name: 'Check lists' }))
    expect(screen.getByText('Class list: test on Monday 19 October 2026, 2 words')).toBeInTheDocument()
    expect(screen.getByText('My words: test on Monday 19 October 2026, 1 word')).toBeInTheDocument()
    expect(screen.getByText(/Left out: d0g/)).toBeInTheDocument()
    expect(screen.getByText('31/2/26 is not a real date.')).toBeInTheDocument()
    expect(screen.getByText('12/10/25 is in the past. Check the year.')).toBeInTheDocument()
    await user.dblClick(screen.getByRole('button', { name: 'Save all 3 lists' })) // a double click saves once
    await waitFor(async () => expect(await services.repo.getSchoolLists()).toHaveLength(3))
    // Ids keep the pasted order, so lists sharing a date always show in the same order (list-…-002 before list-…-010).
    expect((await services.repo.getSchoolLists()).every(l => /^list-\d+-\d{3}$/.test(l.id))).toBe(true)
    const summary = async () => (await services.repo.getSchoolLists()).map(l => [l.name, l.testDate, l.items.map(i => i.wordId)])
    expect(await summary()).toEqual(expect.arrayContaining([
      ['Class list', '2026-10-19', ['w-because', 'w-crocodile']], ['My words', '2026-10-19', ['w-the']], ['Class list', '2026-10-26', ['w-said', 'w-was']],
    ]))
    expect(await services.repo.getCustomWords()).toEqual([{ wordId: 'w-crocodile', text: 'crocodile' }])
    expect(await screen.findByText(/My words: test on Monday 19 October/, { selector: 'h3' })).toBeInTheDocument()

    fireEvent.change(box, { target: { value: 'My words\n19/10/26: the, a' } })
    await user.click(screen.getByRole('button', { name: 'Check lists' }))
    await user.click(screen.getByRole('button', { name: 'Save 1 list' }))
    await waitFor(async () => expect(await summary()).toContainEqual(['My words', '2026-10-19', ['w-the', 'w-a']]))
    expect(await services.repo.getSchoolLists()).toHaveLength(3)
  })
})
