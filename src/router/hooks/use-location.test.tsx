import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocationCtx } from '../context'
import { useLocation } from './use-location'

describe('useLocation', () => {
  it('应该返回 location context 的值', () => {
    const mockLocation = { pathname: '/dashboard', search: '?page=1', hash: '#section1' }

    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <LocationCtx.Provider value={mockLocation}>
          {children}
        </LocationCtx.Provider>
      ),
    })

    expect(result.current).toEqual(mockLocation)
  })

  it('应该在 context 为 null 时返回 null', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <LocationCtx.Provider value={null}>
          {children}
        </LocationCtx.Provider>
      ),
    })

    expect(result.current).toBeNull()
  })
})
