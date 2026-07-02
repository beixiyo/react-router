import type { NavigationDirection } from '../types/transition'

/**
 * history.state 上存放导航位点的键
 *
 * 该键会驻留在宿主应用每个历史条目的 state 中，属于对外可见的暴露面，
 * 使用方如需自行读写 history.state，应保留（展开合并）该字段
 */
export const NAV_POSITION_KEY = '__routerPos'

/** 打在历史条目 state 上的路由位点形状 */
export type RouterHistoryState = {
  [K in typeof NAV_POSITION_KEY]?: number
}

/**
 * 读取当前历史记录条目上打的位点，未打点则为 undefined
 *
 * popstate / hashchange 触发时必须在事件回调的第一时间调用——
 * 后续导航流程会用新 state 覆写当前条目，届时再读为时已晚
 */
export function readNavigationPosition(): number | undefined {
  if (typeof window === 'undefined')
    return undefined

  return (window.history.state as RouterHistoryState | null)?.[NAV_POSITION_KEY]
}

/**
 * 本次导航对历史栈的实际操作
 * - push：新增历史条目（pushState / `location.hash =`）
 * - replace：替换当前条目（replaceState）
 * - { pop }：浏览器原生前进 / 后退已完成的条目切换，携带事件第一时间捕获的目标条目位点
 */
export type NavigationOp = 'push' | 'replace' | { pop: number | undefined }

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

  return {
    /** 当前导航方向快照 */
    get current(): NavigationDirection {
      return direction
    },

    /**
     * 在写入 URL 之前调用：按实际历史操作推导方向、更新位点账本，
     * 并返回应随本次 pushState / replaceState **一并原子写入**的 state。
     * 位点与 URL 同一次写入落盘——杜绝「先写 URL 再补打点」在写入间隙
     * 被回声 / 后续覆写抹掉的窗口
     *
     * @param op 实际历史操作；方向语义与之解耦：重定向可能实际执行 push（新增条目、
     *   位点必须递增），但方向仍记 replace，由 directionOverride 表达
     * @param directionOverride 方向语义覆盖：守卫 / 中间件重定向无「栈方向」语义，一律记 replace
     */
    mark(op: NavigationOp, directionOverride?: NavigationDirection): RouterHistoryState {
      if (op === 'push') {
        position += 1
        direction = 'forward'
      }
      else if (op === 'replace') {
        direction = 'replace'
      }
      else {
        const incoming = op.pop

        if (typeof incoming !== 'number') {
          /**
           * 落到没打过点的条目（如手动改地址栏产生的新条目）：方向无从判断兜底 replace；
           * 位点按「新条目」递增，保证与相邻条目可比较、不产生同位点
           */
          direction = 'replace'
          position += 1
        }
        else if (incoming !== position) {
          direction = incoming < position
            ? 'back'
            : 'forward'
          position = incoming
        }
        /**
         * incoming === position：这不是真正的浏览器前进 / 后退，而是「自身操作触发的回声事件」——
         * hash 路由下 `location.hash =` 赋值本身就会异步再派发一次 hashchange。
         * 方向与位点均保持不动；返回值会把同一位点原样写回，条目不失点
         */
      }

      if (directionOverride)
        direction = directionOverride

      return { [NAV_POSITION_KEY]: position }
    },
  }
}
