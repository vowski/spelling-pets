import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { WeeklySpellings } from './WeeklySpellings'
import { Home } from './Home'
import { renderWithServices, makeTestServices } from '../test/render'

const T = '2026-10-15'
const ui = <MemoryRouter initialEntries={['/spellings']}><Routes><Route path="/spellings" element={<WeeklySpellings />} /><Route path="/" element={<p>home</p>} /></Routes></MemoryRouter>

// Weekly spellings (2026-11-03).
describe('WeeklySpellings', () => {
  it("lists this week's spellings with her best, and saves each finished practice", async () => {
    const services = makeTestServices()
    await services.repo.saveSchoolList({ id: 'c', name: 'Class spellings', createdAt: T, testDate: '2026-10-19', items: [{ text: 'said', wordId: 'w-said' }] }, [])
    await services.repo.saveSchoolList({ id: 'm', name: 'My spellings', createdAt: T, testDate: '2026-10-19', items: [{ text: 'was', wordId: 'w-was' }] }, [])
    await services.repo.saveSchoolList({ id: 'n', name: 'Class spellings', createdAt: T, testDate: '2026-10-26', items: [{ text: 'the', wordId: 'w-the' }] }, [])
    const user = userEvent.setup()
    renderWithServices(ui, services)
    expect(await screen.findByRole('heading', { name: 'Class spellings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My spellings' })).toBeInTheDocument()
    expect(screen.getAllByText('Test on Monday 19 October · 1 word')).toHaveLength(2) // next week's list waits
    expect(screen.getAllByText('Not practised yet')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Practise Class spellings' }))
    await user.type(await screen.findByLabelText('Your spelling'), 'sed{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Try the 1 you missed' }))
    await user.type(await screen.findByLabelText('Your spelling'), 'said{Enter}')
    expect(await screen.findByText(/It took you 2 goes/)).toBeInTheDocument()
    await waitFor(async () => expect(await services.repo.practiceBest('c')).toMatchObject({ goes: 2, firstScore: 0, total: 1, testDate: '2026-10-19' }))
    // A new word she misses stays new, so the adventure still teaches it; goes after seeing the answer don't move it.
    expect((await services.repo.attemptsForWord('w-said')).map(a => [a.role, a.correct])).toEqual([['pretest', false], ['placement', true]])
    expect((await services.repo.getAllProgress()).find(p => p.wordId === 'w-said')).toMatchObject({ box: 0, misspellings: { sed: 1 } })
    expect(await services.repo.balance()).toBe(0) // no first-go words right

    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(await screen.findByText('Best this week: 2 goes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Practise My spellings' }))
    await user.type(await screen.findByLabelText('Your spelling'), 'was{Enter}')
    expect(await screen.findByText('🐾 +3 for this practice')).toBeInTheDocument() // coins once a day for each list
    await user.click(screen.getByRole('button', { name: 'Have another go' }))
    await user.type(await screen.findByLabelText('Your spelling'), 'was{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Finish' }))
    expect(await screen.findByText('Best this week: all right first go! 🏆')).toBeInTheDocument()
    expect(await services.repo.balance()).toBe(3)
  })

  it('cannot start a list whose words are not in the app any more', async () => {
    const services = makeTestServices()
    await services.repo.saveSchoolList({ id: 'c', name: 'Class spellings', createdAt: T, testDate: '2026-10-19', items: [{ text: 'zorbix', wordId: 'w-zorbix' }] }, [])
    renderWithServices(ui, services)
    expect(await screen.findByRole('button', { name: 'Practise Class spellings' })).toBeDisabled()
    expect(screen.getByText('Ask a grown-up to add this list again.')).toBeInTheDocument()
  })

  it('asks for a grown-up when there is no list to practise', async () => {
    renderWithServices(ui, makeTestServices())
    expect(await screen.findByText("There are no spellings to practise yet. Ask a grown-up to add this week's list.")).toBeInTheDocument()
  })

  it("is on Home only while a test is still to come", async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true, petName: 'Biscuit', petSpecies: 'puppy' })
    const home = renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByRole('button', { name: /adventure/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "📝 This week's spellings" })).not.toBeInTheDocument()
    home.unmount()
    await services.repo.saveSchoolList({ id: 'c', createdAt: T, testDate: T, items: [{ text: 'said', wordId: 'w-said' }] }, [])
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByRole('button', { name: "📝 This week's spellings" })).toBeInTheDocument()
  })
})
