import { beforeEach, describe, expect, it } from 'vitest'
import { createNavigationDirectionTracker, readNavigationPosition } from './nav-direction'

function pos(): number | undefined {
  return (window.history.state as { __routerPos?: number } | null)?.__routerPos
}

describe('createNavigationDirectionTracker', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('初始创建时若当前记录还没有位点，会打上位点 0', () => {
    createNavigationDirectionTracker()
    expect(pos()).toBe(0)
  })

  it('初始创建时若当前记录已有位点，直接复用而不清零', () => {
    window.history.replaceState({ __routerPos: 5 }, '', '/')
    const tracker = createNavigationDirectionTracker()
    expect(pos()).toBe(5)
    expect(tracker.current).toBe('replace')
  })

  it('markPush：位点递增，方向记为 forward', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    expect(tracker.current).toBe('forward')
    expect(pos()).toBe(1)

    tracker.markPush()
    expect(pos()).toBe(2)
  })

  it('markReplace：位点不变，方向记为 replace', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    tracker.markReplace()
    expect(tracker.current).toBe('replace')
    expect(pos()).toBe(1)
  })

  it('markPopState：传入的位点比当前小时推导为 back（模拟浏览器原生后退恢复了更早的位点）', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    tracker.markPush()
    window.history.replaceState({ __routerPos: 1 }, '', '/')
    tracker.markPopState(readNavigationPosition())
    expect(tracker.current).toBe('back')
  })

  it('markPopState：传入的位点比当前大时推导为 forward（模拟浏览器原生前进）', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    window.history.replaceState({ __routerPos: 0 }, '', '/')
    tracker.markPopState(readNavigationPosition())
    expect(tracker.current).toBe('back')

    window.history.replaceState({ __routerPos: 1 }, '', '/')
    tracker.markPopState(readNavigationPosition())
    expect(tracker.current).toBe('forward')
  })

  it('markPopState：位点缺失时无法判断，兜底为 replace', () => {
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    tracker.markPopState(undefined)
    expect(tracker.current).toBe('replace')
  })

  it('markPopState：位点与当前相同时视为自身操作触发的回声事件，维持原有方向不变', () => {
    // hash 路由下 location.hash 赋值会异步再派发一次 hashchange，此时位点还是我们自己刚打的、
    // 与已记录 position（此刻为 1）相同——不应把 markPush 刚设好的 forward 又冲回 replace
    const tracker = createNavigationDirectionTracker()
    tracker.markPush()
    expect(tracker.current).toBe('forward')

    tracker.markPopState(1)
    expect(tracker.current).toBe('forward')
  })

  it('readNavigationPosition：必须在 replaceURL 等覆盖 history.state 之前读取，否则拿到的是覆盖后的值', () => {
    window.history.replaceState({ __routerPos: 3 }, '', '/')
    const captured = readNavigationPosition()
    // 模拟紧随其后的 replaceURL 覆盖了 state（这正是生产代码里 markPopState 不自己读 state 的原因）
    window.history.replaceState(null, '', '/')
    expect(captured).toBe(3)
    expect(readNavigationPosition()).toBeUndefined()
  })
})
