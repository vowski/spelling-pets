import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { makeTestServices } from '../test/render'

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
})
