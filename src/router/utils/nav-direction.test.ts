import { beforeEach, describe, expect, it } from 'vitest'
import { createNavigationDirectionTracker, NAV_POSITION_KEY, readNavigationPosition } from './nav-direction'

/**
 * tracker 是纯账本：mark 按「实际历史操作」推导方向并返回应随 URL 原子写入的位点 state，
 * 自身不写 history——写入由 URLAdapter 与 URL 同一次 pushState/replaceState 落盘
 */

describe('createNavigationDirectionTracker', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('初始方向为 replace；当前条目已有位点则复用不清零', () => {
    window.history.replaceState({ [NAV_POSITION_KEY]: 5 }, '', '/')
    const tracker = createNavigationDirectionTracker()
    expect(tracker.current).toBe('replace')
    expect(tracker.mark('push')[NAV_POSITION_KEY]).toBe(6)
  })

  it('mark(push)：位点递增、方向 forward，返回应原子写入的 state', () => {
    const tracker = createNavigationDirectionTracker()
    const stamp = tracker.mark('push')
    expect(tracker.current).toBe('forward')
    expect(stamp).toEqual({ [NAV_POSITION_KEY]: 1 })

    expect(tracker.mark('push')[NAV_POSITION_KEY]).toBe(2)
  })

  it('mark(replace)：位点不变、方向 replace', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')
    const stamp = tracker.mark('replace')
    expect(tracker.current).toBe('replace')
    expect(stamp[NAV_POSITION_KEY]).toBe(1)
  })

  it('mark({ pop })：目标位点小于当前推导为 back，账本同步、返回的位点会原样写回目标条目（不失点）', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')
    tracker.mark('push')

    const stamp = tracker.mark({ pop: 1 })
    expect(tracker.current).toBe('back')
    expect(stamp[NAV_POSITION_KEY]).toBe(1)
  })

  it('mark({ pop })：back 之后 forward 再 back，方向始终正确（位点不因被 pop 过而丢失）', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')

    tracker.mark({ pop: 0 })
    expect(tracker.current).toBe('back')

    tracker.mark({ pop: 1 })
    expect(tracker.current).toBe('forward')

    tracker.mark({ pop: 0 })
    expect(tracker.current).toBe('back')
  })

  it('mark({ pop: undefined })：落到未打点条目，方向兜底 replace、位点按新条目递增避免相邻同位点', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')

    const stamp = tracker.mark({ pop: undefined })
    expect(tracker.current).toBe('replace')
    expect(stamp[NAV_POSITION_KEY]).toBe(2)
  })

  it('mark({ pop: 当前位点 })：自身操作触发的回声事件，方向与位点均保持不动', () => {
    // hash 路由下 location.hash 赋值会异步再派发一次 hashchange，此时位点是刚打的、
    // 与账本相同——不应把 push 刚设好的 forward 冲回 replace
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')
    expect(tracker.current).toBe('forward')

    const stamp = tracker.mark({ pop: 1 })
    expect(tracker.current).toBe('forward')
    expect(stamp[NAV_POSITION_KEY]).toBe(1)
  })

  it('方向覆盖：重定向实际执行 push 时位点仍递增（相邻条目不同位点），方向记 replace', () => {
    const tracker = createNavigationDirectionTracker()
    const stamp = tracker.mark('push', 'replace')
    expect(tracker.current).toBe('replace')
    expect(stamp[NAV_POSITION_KEY]).toBe(1)

    // 之后从重定向页真实后退，位点 0 ≠ 1，不会被误判为回声
    tracker.mark({ pop: 0 })
    expect(tracker.current).toBe('back')
  })

  it('popstate 源被重定向：位点同步到浏览器恢复的条目、方向记 replace', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.mark('push')
    tracker.mark('push')

    const stamp = tracker.mark({ pop: 1 }, 'replace')
    expect(tracker.current).toBe('replace')
    expect(stamp[NAV_POSITION_KEY]).toBe(1)
  })

  it('readNavigationPosition：必须在覆写 history.state 之前读取，否则拿到的是覆写后的值', () => {
    window.history.replaceState({ [NAV_POSITION_KEY]: 3 }, '', '/')
    const captured = readNavigationPosition()

    window.history.replaceState(null, '', '/')
    expect(captured).toBe(3)
    expect(readNavigationPosition()).toBeUndefined()
  })
})
