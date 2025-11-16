import type { LocationLike } from '../types'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocationCtx, ParamsContext } from '../context'
import { useParams } from './use-params'

describe('useParams', () => {
  it('应该返回路由参数、查询参数和 hash', () => {
    const mockParams = { id: '123', userId: '456' }
    const mockLocation: LocationLike = {
      pathname: '/users/123',
      search: '?name=John&age=30',
      hash: '#section=intro&tab=details',
    }

    const { result } = renderHook(() => useParams(), {
      wrapper: ({ children }) => (
        <ParamsContext.Provider value={mockParams}>
          <LocationCtx.Provider value={mockLocation}>
            {children}
          </LocationCtx.Provider>
        </ParamsContext.Provider>
      ),
    })

    expect(result.current.params).toEqual(mockParams)
    expect(result.current.query).toEqual({ name: 'John', age: '30' })
    expect(result.current.hash).toEqual({ section: 'intro', tab: 'details' })
  })

  it('应该处理多值查询参数', () => {
    const mockParams = {}
    const mockLocation: LocationLike = {
      pathname: '/users',
      search: '?tag=react&tag=vue',
      hash: '',
    }

    const { result } = renderHook(() => useParams(), {
      wrapper: ({ children }) => (
        <ParamsContext.Provider value={mockParams}>
          <LocationCtx.Provider value={mockLocation}>
            {children}
          </LocationCtx.Provider>
        </ParamsContext.Provider>
      ),
    })

    expect(result.current.query).toEqual({ tag: ['react', 'vue'] })
  })

  it('应该在 location 为 null 时返回空对象', () => {
    const mockParams = { id: '123' }

    const { result } = renderHook(() => useParams(), {
      wrapper: ({ children }) => (
        <ParamsContext.Provider value={mockParams}>
          <LocationCtx.Provider value={null}>
            {children}
          </LocationCtx.Provider>
        </ParamsContext.Provider>
      ),
    })

    expect(result.current.params).toEqual(mockParams)
    expect(result.current.query).toEqual({})
    expect(result.current.hash).toEqual({})
  })

  it('应该处理空的查询参数和 hash', () => {
    const mockParams = {}
    const mockLocation: LocationLike = {
      pathname: '/users',
      search: '',
      hash: '',
    }

    const { result } = renderHook(() => useParams(), {
      wrapper: ({ children }) => (
        <ParamsContext.Provider value={mockParams}>
          <LocationCtx.Provider value={mockLocation}>
            {children}
          </LocationCtx.Provider>
        </ParamsContext.Provider>
      ),
    })

    expect(result.current.query).toEqual({})
    expect(result.current.hash).toEqual({})
  })
})
