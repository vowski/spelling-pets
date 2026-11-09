import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { catchCsvDownload } from '../test/csvDownload'
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
    // The same meaning of Secure as the Overview (design of 2026-10-28).
    expect(screen.getByText(/"Secure" means spelt right from memory on different days at least a week apart\./)).toBeInTheDocument()
  })

  // CSV downloads (2026-11-09).
  it('downloads the standards as a CSV file', async () => {
    const services = makeTestServices()
    await services.repo.putProgress(BUILTIN_BANK.setIds.days.map(id => prog(id, { box: 4 })))
    const saved = catchCsvDownload()
    renderWithServices(<StandardsTab />, services)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Download standards (CSV)' }))
    await waitFor(async () => expect((await saved()).name).toBe('spelling-pets-standards-2026-10-15.csv'))
    const { text } = await saved()
    expect(text.split('\r\n')[0]).toBe('Grid,Grid result,Band,Statement,Met,Progress (%),Evidence')
    expect(text).toContain('Year 1,Not yet,Working at,Spells the days of the week,Yes,100,7 of 7 Secure (aim: 6)')
  })
})
