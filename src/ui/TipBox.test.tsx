import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServicesProvider } from '../app/services'
import { BUILTIN_BANK, getWord } from '../content'
import { makeTestServices, renderWithServices } from '../test/render'
import { servicesWithTips } from '../test/fakeTipModel'
import { TipBox } from './TipBox'

const here = getWord(BUILTIN_BANK, 'w-here')
const there = getWord(BUILTIN_BANK, 'w-there')
const GOOD = '“Hear” is what you do with your ears; “here” means this place.'
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('TipBox', () => {
  it('shows the thinking box straight away, then the tip', async () => {
    const services = await servicesWithTips(makeTestServices(), { reply: GOOD, delayMs: 20 })
    renderWithServices(<TipBox word={here} typed="hear" />, services)
    expect(await screen.findByText('💡 Thinking of a tip…')).toBeInTheDocument()
    expect(await screen.findByText(/what you do with your ears/)).toBeInTheDocument()
    expect(screen.queryByText('💡 Thinking of a tip…')).not.toBeInTheDocument()
  })

  it('shows nothing without the tips feature', async () => {
    const { container } = renderWithServices(<TipBox word={here} typed="hear" />)
    await wait(20)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows nothing when the mistake is unclassifiable', async () => {
    const services = await servicesWithTips(makeTestServices(), { reply: GOOD })
    const { container } = renderWithServices(<TipBox word={here} typed="xqzt" />, services)
    await wait(20)
    expect(container).toBeEmptyDOMElement()
  })

  it('reads the tip aloud only when asked', async () => {
    const services = await servicesWithTips(makeTestServices(), { reply: GOOD })
    renderWithServices(<TipBox word={here} typed="hear" />, services)
    await screen.findByText(/what you do with your ears/)
    expect(services.speechLog).toEqual([])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Read the tip' }))
    expect(services.speechLog).toEqual([GOOD])
  })

  // Review Focus #1: she moves on before the tip arrives
  it('never shows a late tip on the next word', async () => {
    const services = await servicesWithTips(makeTestServices(), { delayMs: 80 }) // echoes each word's own template
    const { rerender } = render(<ServicesProvider value={services}><TipBox word={here} typed="hear" /></ServicesProvider>)
    rerender(<ServicesProvider value={services}><TipBox word={there} typed="their" /></ServicesProvider>)
    expect(await screen.findByText(/This word is "there"/)).toBeInTheDocument()
    await wait(150)
    expect(screen.queryByText(/This word is "here"/)).not.toBeInTheDocument()
  })

  it('records a tip as shown when it appears, but not one that arrives after she moved on (review I1)', async () => {
    const services = await servicesWithTips(makeTestServices(), { delayMs: 80 })
    const { rerender } = render(<ServicesProvider value={services}><TipBox word={here} typed="hear" /></ServicesProvider>)
    rerender(<ServicesProvider value={services}><TipBox word={there} typed="their" /></ServicesProvider>)
    await screen.findByText(/This word is "there"/)
    await wait(150)
    expect(await services.repo.lastTipFor('w-here')).toBeUndefined()
    expect(await services.repo.lastTipFor('w-there')).toMatchObject({ source: 'ai' })
  })
})
