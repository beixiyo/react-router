import type { Router } from '../types'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouterCtx } from '../context'
import { useRouter } from './use-router'

describe('useRouter', () => {
  it('应该返回 router context 的值', () => {
    const mockRouter: Router = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }

    const { result } = renderHook(() => useRouter(), {
      wrapper: ({ children }) => (
        <RouterCtx.Provider value={mockRouter}>
          {children}
        </RouterCtx.Provider>
      ),
    })

    expect(result.current).toBe(mockRouter)
  })

  it('应该在 context 为 null 时返回 null', () => {
    const { result } = renderHook(() => useRouter(), {
      wrapper: ({ children }) => (
        <RouterCtx.Provider value={null}>
          {children}
        </RouterCtx.Provider>
      ),
    })

    expect(result.current).toBeNull()
  })
})
