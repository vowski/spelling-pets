import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PetSpot } from './PetSpot'
import { usePetMood } from '../app/petMood'
import { DEFAULT_SETTINGS } from '../storage/db'

const settings = { ...DEFAULT_SETTINGS, petName: 'Pip', petSpecies: 'kitten' as const }

describe('PetSpot', () => {
  it('greets after days away and dozes off when idle', () => {
    vi.useFakeTimers()
    render(<PetSpot settings={settings} placementDone secureTotal={0} missedYou />)
    expect(screen.getByText('I missed you! 💛')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(30_001) })
    expect(usePetMood.getState().mood).toBe('sleep')
    act(() => { window.dispatchEvent(new MouseEvent('mousemove')) })
    expect(usePetMood.getState().mood).toBe('idle')
    vi.useRealTimers()
  })
})
