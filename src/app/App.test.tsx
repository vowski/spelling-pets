import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('shows the app name', () => {
    render(<App />)
    expect(screen.getByText('Spelling Pets')).toBeInTheDocument()
  })
})
