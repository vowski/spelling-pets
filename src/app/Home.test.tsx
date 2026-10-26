import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Home } from './Home'
import { renderWithServices, makeTestServices } from '../test/render'
import { buildPlacementPlan, nextPlacementChunk, recordPlacementAnswer } from '../engine/placement'
import type { PlacementLevelState } from '../engine/types'

/** A Treasure Hunt plan with whole hunts of 12 answered. */
function huntPlan(services: ReturnType<typeof makeTestServices>, hunts: number): PlacementLevelState[] {
  let plan = buildPlacementPlan(services.bank, 1)
  for (let h = 0; h < hunts; h++) for (const id of nextPlacementChunk(plan)) plan = recordPlacementAnswer(plan, id, true)
  return plan
}
const egg = (services: ReturnType<typeof makeTestServices>) => services.repo.updateSettings({ firstRunDone: true, petName: 'Biscuit', petSpecies: 'puppy' })
const session = (complete: boolean, wordIds: string[] = []) => ({
  id: 's', date: '2026-10-15', kind: 'main' as const, startedAt: 1, endedAt: complete ? 2 : null, doneActivityIds: [], complete, coins: 0,
  plan: { kind: 'placement' as const, activities: wordIds.length ? [{ id: 'a1', gameType: 'treasureHunt' as const, wordIds }] : [], newMaterial: { kind: 'none' as const } },
})

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
  // The egg: how long is left to hatch, and what she needs to do.
  it('shows how far the Treasure Hunt has got and how many hunts are left before the egg hatches', async () => {
    const services = makeTestServices()
    await egg(services)
    await services.repo.savePlacement(huntPlan(services, 1))
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByText('4 more Treasure Hunts and Biscuit will hatch!')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Treasure Hunt: 12 of 52 words' })).toHaveAttribute('aria-valuenow', '12')
    expect(screen.getByText('There is one Treasure Hunt in each adventure.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Read it to me' })).toBeInTheDocument()
  })

  it('tells her to finish the last Treasure Hunt once she has started it', async () => {
    const services = makeTestServices()
    await egg(services)
    let plan = huntPlan(services, 4)
    const last = nextPlacementChunk(plan)
    for (const id of last.slice(0, 2)) plan = recordPlacementAnswer(plan, id, true)
    await services.repo.savePlacement(plan)
    await services.repo.saveSession(session(false, last))
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByText('Finish this Treasure Hunt and Biscuit will hatch!')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Treasure Hunt: 50 of 52 words' })).toBeInTheDocument()
  })

  it('after today’s adventure, says how to do another Treasure Hunt today', async () => {
    const services = makeTestServices()
    await egg(services)
    await services.repo.savePlacement(huntPlan(services, 2))
    await services.repo.saveSession(session(true))
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByText('3 more Treasure Hunts and Biscuit will hatch!')).toBeInTheDocument()
    expect(screen.getByText('Press Extra practice to do another Treasure Hunt today.')).toBeInTheDocument()
  })

  it('labels the practice-day dots, so they are not mistaken for the egg', async () => {
    const services = makeTestServices()
    await egg(services)
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByText('This week')).toBeInTheDocument()
    expect(screen.getByText('5 more Treasure Hunts and Biscuit will hatch!')).toBeInTheDocument()
  })

  it('keeps Free Play open even before today’s adventure', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true })
    renderWithServices(<MemoryRouter><Home /></MemoryRouter>, services)
    expect(await screen.findByRole('link', { name: /Free Play/ })).toHaveAttribute('href', '/play')
    expect(screen.queryByText(/🔒/)).not.toBeInTheDocument()
  })
})
