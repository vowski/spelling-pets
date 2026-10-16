import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { StandardsTab } from './StandardsTab'
import { renderWithServices, makeTestServices } from '../test/render'
import { BUILTIN_BANK } from '../content'
import { prog } from '../engine/testing'

describe('StandardsTab', () => {
  it('shows each grid with band and evidence', async () => {
    const services = makeTestServices()
    await services.repo.putProgress(BUILTIN_BANK.setIds.days.map(id => prog(id, { box: 4 })))
    renderWithServices(<StandardsTab />, services)
    const y1 = await screen.findByRole('region', { name: 'Year 1 writing grid' })
    expect(within(y1).getByText('Not yet')).toBeInTheDocument()
    const daysRow = within(y1).getByText('Spells the days of the week').closest('tr')!
    expect(within(daysRow).getByText('✓ Met')).toBeInTheDocument()
    expect(within(daysRow).getByText('7 of 7 Secure (aim: 6)')).toBeInTheDocument()
    const y3 = screen.getByRole('region', { name: 'Year 3 writing grid' })
    expect(within(y3).getByText('0 of 100 Secure (aim: 50)')).toBeInTheDocument()
  })
})
