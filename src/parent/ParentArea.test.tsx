import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ParentRelock, useParentLock } from './ParentArea'

describe('ParentRelock', () => {
  it('locks the dashboard again whenever she is anywhere outside it (e.g. after the browser back button)', () => {
    useParentLock.getState().set(true)
    render(<MemoryRouter initialEntries={['/parent/settings']}><ParentRelock /></MemoryRouter>)
    expect(useParentLock.getState().unlocked).toBe(true)
    render(<MemoryRouter initialEntries={['/']}><ParentRelock /></MemoryRouter>)
    expect(useParentLock.getState().unlocked).toBe(false)
  })
})
