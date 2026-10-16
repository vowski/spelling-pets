import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Home } from './Home'
import { renderWithServices, makeTestServices } from '../test/render'

describe('Home', () => {
  it('greets by name and offers today’s adventure', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ childName: 'Amy', petName: 'Clover', petSpecies: 'bunny', firstRunDone: true, coins: 12 })
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByText("Amy's Spelling Pets")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start today’s adventure!' })).toBeInTheDocument()
    expect(screen.getByLabelText('12 paw coins')).toBeInTheDocument()
    expect(screen.getByLabelText('0 of 5 practice days this week')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grown-ups' })).toBeInTheDocument()
  })
  it('offers extra practice once today is done', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true })
    await services.repo.saveSession({ id: 's', date: '2026-10-15', kind: 'main', startedAt: 1, endedAt: 2, plan: { kind: 'normal', activities: [], newMaterial: { kind: 'none' } }, doneActivityIds: [], complete: true, coins: 0 })
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByRole('button', { name: 'Extra practice' })).toBeInTheDocument()
    expect(screen.getByText(/You finished today/)).toBeInTheDocument()
    expect(screen.getByLabelText('1 of 5 practice days this week')).toBeInTheDocument()
  })
  it('keeps a hatched pet hatched while a re-run Treasure Hunt is under way', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true, petName: 'Clover', petSpecies: 'bunny', hatched: true })
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByRole('img', { name: 'Clover the bunny' })).toBeInTheDocument()
    expect(screen.queryByText(/still in the egg/)).not.toBeInTheDocument()
  })
})
