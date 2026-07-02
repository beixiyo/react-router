import type { NavigationDirection } from '../components/KeepAlive/type'

interface RouterHistoryState {
  __routerPos?: number
}

/** 读取当前历史记录条目上打的位点，未打点则为 undefined */
export function readNavigationPosition(): number | undefined {
  if (typeof window === 'undefined')
    return undefined

  return (window.history.state as RouterHistoryState | null)?.__routerPos
}

function stampPosition(position: number) {
  const state = { ...(window.history.state as object ?? {}), __routerPos: position }
  window.history.replaceState(state, '', window.location.href)
}

/**
 * 追踪导航方向（forward / back / replace），供路由过渡动画感知滑动方向
 *
 * 原理：给每个历史记录条目打「位点」（存在 `history.state.__routerPos`），
 * push 时位点递增，replace 时位点不变；浏览器原生前进 / 后退触发 popstate 时，
 * 读回目标条目已打好的位点与当前记录比较，小于则是后退、大于则是前进
 */
export function createNavigationDirectionTracker() {
  let position = readNavigationPosition() ?? 0
  let direction: NavigationDirection = 'replace'

  if (typeof window !== 'undefined' && readNavigationPosition() === undefined)
    stampPosition(position)

  return {
    /** 当前导航方向快照 */
    get current(): NavigationDirection {
      return direction
    },
    /** 程序化 push（新增历史记录）后调用 */
    markPush() {
      position += 1
      stampPosition(position)
      direction = 'forward'
    },
    /** 程序化 replace（替换当前记录）后调用，位点不变 */
    markReplace() {
      stampPosition(position)
      direction = 'replace'
    },
    /**
     * 浏览器原生前进 / 后退（popstate / hashchange）后调用，比对位点推导方向
     * @param incomingPosition 必须在事件触发的第一时间、任何 replaceURL/pushState 调用之前
     *   用 {@link readNavigationPosition} 读取——本函数自身不会再读 `history.state`，
     *   因为紧随其后的 replaceURL 会把它覆盖成 null，届时再读为时已晚
     *
     * 位点缺失：无法判断，兜底为 replace（如手动改地址栏落到了没打过点的记录）；
     * 位点等于当前值：这不是真正的浏览器前进 / 后退，而是「自身操作触发的回声事件」——
     * hash 路由下 `location.hash =` 赋值本身就会异步再派发一次 hashchange，
     * 此时位点是我们自己刚打上去的、和已记录的 position 相同，维持原 direction 不变，
     * 避免把 markPush/markReplace 刚设好的方向又冲掉
     */
    markPopState(incomingPosition: number | undefined) {
      if (typeof incomingPosition !== 'number') {
        direction = 'replace'
        return
      }
      if (incomingPosition !== position) {
        direction = incomingPosition < position
          ? 'back'
          : 'forward'
        position = incomingPosition
      }
    },
  }
}
