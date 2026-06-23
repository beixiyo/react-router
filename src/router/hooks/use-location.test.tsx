import type { LocationLike, Router } from '../types'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocationCtx, RouterCtx } from '../context'
import { useLocation } from './use-location'

describe('useLocation', () => {
  it('默认应该返回 router context 中的全局当前 location', () => {
    const currentLocation = { pathname: '/cards/1', search: '?from=list', hash: '#summary' }
    const cachedLocation = { pathname: '/cards', search: '', hash: '' }
    const mockRouter: Router = {
      navigate: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      location: currentLocation,
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
      clearCache: vi.fn(),
      deleteCache: vi.fn(),
      subscribeCache: vi.fn(),
      subscribe: vi.fn(),
    }

    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <RouterCtx.Provider value={mockRouter}>
          <LocationCtx.Provider value={cachedLocation}>
            {children}
          </LocationCtx.Provider>
        </RouterCtx.Provider>
      ),
    })

    expect(result.current).toEqual(currentLocation)
  })

  it('无 router context 时应该回退到 location context 的值', () => {
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

  it('应该在 context 为 null 时返回空 location', () => {
    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <LocationCtx.Provider value={null}>
          {children}
        </LocationCtx.Provider>
      ),
    })

    expect(result.current).toEqual({ pathname: '', search: '', hash: '' })
  })

  it('应该在 scope=cache 时返回缓存 entry 的 location', () => {
    const currentLocation = { pathname: '/cards/1', search: '?from=list', hash: '#summary' }
    const cachedLocation = { pathname: '/cards', search: '', hash: '' }
    const mockRouter: Router = {
      navigate: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      location: currentLocation,
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
      clearCache: vi.fn(),
      deleteCache: vi.fn(),
      subscribeCache: vi.fn(),
      subscribe: vi.fn(),
    }

    const { result } = renderHook(() => useLocation({ scope: 'cache' }), {
      wrapper: ({ children }) => (
        <RouterCtx.Provider value={mockRouter}>
          <LocationCtx.Provider value={cachedLocation}>
            {children}
          </LocationCtx.Provider>
        </RouterCtx.Provider>
      ),
    })

    expect(result.current).toEqual(cachedLocation)
  })

  it('默认应该响应 router.subscribe 推送的全局 location 变化', () => {
    const initialLocation = { pathname: '/cards', search: '', hash: '' }
    const nextLocation = { pathname: '/cards/1', search: '?from=list', hash: '#summary' }
    const subscribers = new Set<(location: LocationLike) => void>()
    const mockRouter: Router = {
      navigate: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      location: initialLocation,
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
      clearCache: vi.fn(),
      deleteCache: vi.fn(),
      subscribeCache: vi.fn(),
      subscribe: vi.fn((listener) => {
        subscribers.add(listener)
        return () => subscribers.delete(listener)
      }),
    }

    const { result } = renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <RouterCtx.Provider value={mockRouter}>
          {children}
        </RouterCtx.Provider>
      ),
    })

    act(() => {
      mockRouter.location = nextLocation
      subscribers.forEach(listener => listener(nextLocation))
    })

    expect(result.current).toEqual(nextLocation)
  })
})
