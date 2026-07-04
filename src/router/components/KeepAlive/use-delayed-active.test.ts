import type { NavigationDirection, RouteTransitionOptions } from './type'
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

  it('回归：skip 路径下 effectiveActive 每一帧都与 active 同步，不晚一帧（激活不闪空帧）', () => {
    /**
     * 逐帧记录 effectiveActive：修复前 effectiveActive = phase !== 'exited'，
     * 而 skip 路径的 phase 只在 passive effect 里 setPhase，导致 active 翻转当帧
     * effectiveActive 仍是旧值——激活时先渲染一帧 exited（Suspense 空白）才 reveal。
     * 稳态断言（其它用例）用 act 冲掉 effect 后只看终态，抓不到这一帧，故单列本用例
     */
    const seen: Array<{ active: boolean, effectiveActive: boolean }> = []
    const { rerender } = renderHook(
      ({ active }) => {
        const state = useDelayedActive(active)
        seen.push({ active, effectiveActive: state.effectiveActive })
        return state
      },
      { initialProps: { active: true } },
    )

    rerender({ active: false })
    rerender({ active: true }) // 复活：修复前此处会先记录一帧 { active: true, effectiveActive: false }
    rerender({ active: false })
    rerender({ active: true })

    // skip 路径下任何一帧都应 effectiveActive === active；出现不等即为一帧滞后回归
    const lagged = seen.filter(s => s.active !== s.effectiveActive)
    expect(lagged).toEqual([])
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

  it('挂载即失活（active=false 初挂）：直接落在 exited，不走退场窗口、不假触发 onExited', () => {
    const onExited = vi.fn()
    const transition: RouteTransitionOptions = { exitTimeout: 300 }
    const { result } = renderHook(() => useDelayedActive(false, transition, onExited))

    expect(result.current.phase).toBe('exited')
    expect(result.current.effectiveActive).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onExited).not.toHaveBeenCalled()
  })

  it('未传 direction 时默认为 replace', () => {
    const { result } = renderHook(() => useDelayedActive(true))
    expect(result.current.direction).toBe('replace')
  })

  it('捕获 active 切换瞬间的 direction 快照', () => {
    const transition: RouteTransitionOptions = { exitTimeout: 1000, enterTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active, direction }: { active: boolean, direction: NavigationDirection }) => useDelayedActive(active, transition, undefined, direction),
      { initialProps: { active: false, direction: 'replace' } },
    )
    expect(result.current.direction).toBe('replace')

    rerender({ active: true, direction: 'forward' })
    expect(result.current.phase).toBe('entering')
    expect(result.current.direction).toBe('forward')
  })

  it('direction 变化但 active 未变化时不重新捕获，避免动画播放中途方向突变', () => {
    const transition: RouteTransitionOptions = { exitTimeout: 1000, enterTimeout: 1000 }
    const { result, rerender } = renderHook(
      ({ active, direction }: { active: boolean, direction: NavigationDirection }) => useDelayedActive(active, transition, undefined, direction),
      { initialProps: { active: true, direction: 'forward' } },
    )
    expect(result.current.direction).toBe('forward')

    // active 未变化，仅全局方向后续又变了：不应影响本次已在播放的过渡
    rerender({ active: true, direction: 'back' })
    expect(result.current.direction).toBe('forward')

    // active 变化（真正开始退场）才会重新捕获此刻的 direction
    rerender({ active: false, direction: 'back' })
    expect(result.current.direction).toBe('back')
  })
})
