import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PetView } from './PetView'
import { SPECIES_ORDER } from './species'

describe('PetView', () => {
  it('renders every species at every stage', () => {
    for (const species of SPECIES_ORDER) for (const stage of ['baby', 'young', 'grown', 'super', 'sparkly'] as const) {
      const { unmount } = render(<PetView species={species} stage={stage} name="Pip" />)
      expect(screen.getByRole('img', { name: `Pip the ${species}` })).toBeInTheDocument()
      unmount()
    }
  })
  it('shows mood and accessories', () => {
    const { container } = render(<PetView species="puppy" stage="grown" name="Pip" mood="happy" equipped={{ hat: 'crown', face: 'glasses', neck: 'scarf' }} />)
    expect(screen.getByRole('img', { name: 'Pip the puppy' })).toHaveAttribute('data-mood', 'happy')
    expect(container.querySelector('[data-accessory="crown"]')).not.toBeNull()
    expect(container.querySelector('[data-accessory="glasses"]')).not.toBeNull()
    expect(container.querySelector('[data-accessory="scarf"]')).not.toBeNull()
  })
  it('shows sparkles only at the sparkly stage', () => {
    const { container, rerender } = render(<PetView species="fox" stage="grown" name="Pip" />)
    expect(container.querySelectorAll('[data-sparkle]')).toHaveLength(0)
    rerender(<PetView species="fox" stage="sparkly" name="Pip" />)
    expect(container.querySelectorAll('[data-sparkle]')).toHaveLength(4)
  })
})
