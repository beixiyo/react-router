import type { RouteTransitionState } from './type'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteTransitionContext } from './context'
import { useRouteTransitionBindings } from './hooks'

/**
 * useRouteTransitionBindings：useRouteTransition 的开箱即用封装，
 * 验证它收进库里的三个协议细节——进场双帧节奏、transitionend 冒泡过滤、phase 分发
 */

function Probe() {
  const { transition, direction, isEntering, isExiting, bind } = useRouteTransitionBindings()
  return (
    <div data-testid="box" {...bind}>
      <span data-testid="meta">
        {`${transition
          ? 'on'
          : 'off'}|${direction}|${isEntering
          ? 'entering'
          : ''}|${isExiting
          ? 'exiting'
          : ''}`}
      </span>
      <button type="button" data-testid="child">child</button>
    </div>
  )
}

function mockState(phase: RouteTransitionState['phase']): RouteTransitionState {
  return {
    phase,
    direction: 'forward',
    finishEnter: vi.fn(),
    finishExit: vi.fn(),
  }
}

/** 等待一帧，让 hook 内部的 requestAnimationFrame 翻转 revealed */
async function nextFrame() {
  await act(async () => {
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  })
}

describe('useRouteTransitionBindings', () => {
  it('未开启过渡时：transition 为 null、direction 兜底 replace、bind 为无害 no-op', () => {
    render(<Probe />)
    expect(screen.getByTestId('meta').textContent).toBe('off|replace||')

    // 触发事件不抛错、无副作用
    fireEvent.transitionEnd(screen.getByTestId('box'))
  })

  it('exiting：自身 transitionend 触发 finishExit；子元素冒泡上来的不触发', () => {
    const state = mockState('exiting')
    render(
      <RouteTransitionContext.Provider value={state}>
        <Probe />
      </RouteTransitionContext.Provider>,
    )
    expect(screen.getByTestId('meta').textContent).toBe('on|forward||exiting')

    fireEvent.transitionEnd(screen.getByTestId('child'))
    expect(state.finishExit).not.toHaveBeenCalled()

    fireEvent.transitionEnd(screen.getByTestId('box'))
    expect(state.finishExit).toHaveBeenCalledTimes(1)
    expect(state.finishEnter).not.toHaveBeenCalled()
  })

  it('entering：首帧 isEntering 为 true（起始态），一帧后翻转；翻转前的 transitionend 不算数', async () => {
    const state = mockState('entering')
    render(
      <RouteTransitionContext.Provider value={state}>
        <Probe />
      </RouteTransitionContext.Provider>,
    )

    // 双帧节奏：首帧保持起始态，动画结束事件此时不应完成进场（还没开始播）
    fireEvent.transitionEnd(screen.getByTestId('box'))
    expect(state.finishEnter).not.toHaveBeenCalled()

    await nextFrame()
    expect(screen.getByTestId('meta').textContent).toBe('on|forward||')

    fireEvent.transitionEnd(screen.getByTestId('box'))
    expect(state.finishEnter).toHaveBeenCalledTimes(1)
    expect(state.finishExit).not.toHaveBeenCalled()
  })

  it('animationend 与 transitionend 同协议（CSS animation 用户同样免接线）', () => {
    const state = mockState('exiting')
    render(
      <RouteTransitionContext.Provider value={state}>
        <Probe />
      </RouteTransitionContext.Provider>,
    )

    fireEvent.animationEnd(screen.getByTestId('box'))
    expect(state.finishExit).toHaveBeenCalledTimes(1)
  })

  it('bind 引用跨渲染（含 phase 变化）恒定，不击穿使用方的 memo / deps', async () => {
    const binds: unknown[] = []
    function IdentityProbe() {
      const { bind } = useRouteTransitionBindings()
      binds.push(bind)
      return <div {...bind} />
    }

    const { rerender } = render(
      <RouteTransitionContext.Provider value={mockState('entering')}>
        <IdentityProbe />
      </RouteTransitionContext.Provider>,
    )
    await nextFrame()

    rerender(
      <RouteTransitionContext.Provider value={mockState('exiting')}>
        <IdentityProbe />
      </RouteTransitionContext.Provider>,
    )

    expect(binds.length).toBeGreaterThan(1)
    expect(new Set(binds).size).toBe(1)
  })
})
