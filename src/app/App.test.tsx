import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { makeTestServices } from '../test/render'

// App imports UpdatePrompt, whose service-worker module only exists in a Vite build.
vi.mock('./pwaRegister', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

describe('App', () => {
  it('starts with first-run setup', async () => {
    render(<App services={makeTestServices()} />)
    expect(await screen.findByText(/Welcome to Spelling Pets/)).toBeInTheDocument()
  })
  it('shows Home once set up', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true, childName: 'Amy' })
    render(<App services={services} />)
    expect(await screen.findByText("Amy's Spelling Pets")).toBeInTheDocument()
  })
  it('shows a friendly message instead of a blank screen when something breaks', async () => {
    const services = makeTestServices()
    await services.repo.updateSettings({ firstRunDone: true })
    services.repo.getSettings = () => Promise.reject(new Error('storage broke'))
    render(<App services={services} />)
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start again' })).toBeInTheDocument()
  })
})
