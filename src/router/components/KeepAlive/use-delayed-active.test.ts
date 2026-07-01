import type { RouteTransitionOptions } from './type'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedActive } from './use-delayed-active'

/**
 * useDelayedActive：过渡状态机
 * - 未传 transition：立即切换，零行为差异
 * - 传入 transition：失活先进 exiting 窗口，激活先进 entering 窗口，
 *   由 finish* 手动确认或超时兜底转入终态
 */

describe('useDelayedActive', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('未传 transition 时立即切换，effectiveActive 与 phase 与 active 同步', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active),
      { initialProps: { active: true } },
    )
    expect(result.current.effectiveActive).toBe(true)
    expect(result.current.phase).toBe('entered')

    rerender({ active: false })
    expect(result.current.effectiveActive).toBe(false)
    expect(result.current.phase).toBe('exited')
  })

  it('失活时先进入 exiting 窗口，effectiveActive 仍为 true，调用 finishExit 后才真正失活', () => {
    const transition: RouteTransitionOptions = { exitTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    expect(result.current.phase).toBe('exiting')
    expect(result.current.effectiveActive).toBe(true)

    act(() => {
      result.current.finishExit()
    })
    expect(result.current.phase).toBe('exited')
    expect(result.current.effectiveActive).toBe(false)
  })

  it('退场超时兜底：未调用 finishExit，超过 exitTimeout 后自动完成退场', () => {
    const transition: RouteTransitionOptions = { exitTimeout: 300 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    expect(result.current.effectiveActive).toBe(true)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current.effectiveActive).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.effectiveActive).toBe(false)
    expect(result.current.phase).toBe('exited')
  })

  it('激活时先进入 entering，effectiveActive 立即为 true，调用 finishEnter 后转为 entered', () => {
    const transition: RouteTransitionOptions = { enterTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: false } },
    )

    rerender({ active: true })
    expect(result.current.effectiveActive).toBe(true)
    expect(result.current.phase).toBe('entering')

    act(() => {
      result.current.finishEnter()
    })
    expect(result.current.phase).toBe('entered')
  })

  it('打断：退场窗口内重新激活，应放弃退场并转回 entering，不会被过期的退场超时打断', () => {
    const transition: RouteTransitionOptions = { exitTimeout: 300, enterTimeout: 300 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    expect(result.current.phase).toBe('exiting')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ active: true })
    expect(result.current.phase).toBe('entering')
    expect(result.current.effectiveActive).toBe(true)

    // 原本失活超时（300ms 后）不应再把已经重新激活的实例打回失活
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.effectiveActive).toBe(true)
    expect(result.current.phase).toBe('entered')
  })

  it('finishExit 触发 onExited 回调一次', () => {
    const onExited = vi.fn()
    const transition: RouteTransitionOptions = { exitTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition, onExited),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    act(() => {
      result.current.finishExit()
    })
    expect(onExited).toHaveBeenCalledTimes(1)
  })

  it('prefers-reduced-motion: reduce 命中时跳过过渡窗口，立即切换（默认遵循）', () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMediaMock)

    const transition: RouteTransitionOptions = { exitTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    expect(result.current.effectiveActive).toBe(false)
    expect(result.current.phase).toBe('exited')

    vi.unstubAllGlobals()
  })

  it('respectReducedMotion: false 时忽略系统偏好，仍走过渡窗口', () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMediaMock)

    const transition: RouteTransitionOptions = { exitTimeout: 1000, respectReducedMotion: false }
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedActive(active, transition),
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    expect(result.current.effectiveActive).toBe(true)
    expect(result.current.phase).toBe('exiting')

    vi.unstubAllGlobals()
  })
})
