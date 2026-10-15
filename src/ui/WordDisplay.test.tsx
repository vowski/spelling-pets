import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WordDisplay } from './WordDisplay'

describe('WordDisplay', () => {
  it('highlights the tricky bit and marks syllables', () => {
    const { container } = render(<WordDisplay word={{ text: 'February', syllables: ['Feb', 'ru', 'ar', 'y'], tricky: [[3, 5]] }} syllables />)
    expect(screen.getByRole('img', { name: 'February' })).toBeInTheDocument()
    expect([...container.querySelectorAll('.tricky')].map(e => e.textContent).join('')).toBe('ru')
    expect(container.querySelectorAll('.syllable-dot')).toHaveLength(3)
  })
})
