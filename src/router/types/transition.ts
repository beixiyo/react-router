/**
 * 路由过渡与导航方向的核心类型
 *
 * 这些类型的生产者是路由核心（directionTracker、RouterOptions.transition），
 * KeepAlive 只是消费者之一，故定义在类型层而非组件目录，
 * 避免 types / utils 反向依赖 components
 */

/**
 * 导航方向：用于让过渡动画感知「前进 / 后退」，从而选择对应的滑动方向
 * - forward：push 新增历史记录，或浏览器原生前进按钮
 * - back：浏览器原生后退按钮，或 `navigate(-1)` / `back()`
 * - replace：替换当前历史记录（无栈方向语义），如显式 replace、守卫重定向
 */
export type NavigationDirection = 'forward' | 'back' | 'replace'

/**
 * 单个 KeepAlive 实例当前所处的过渡阶段
 * - entering：已激活但进场动画尚未确认结束
 * - entered：进场完成，稳定展示中
 * - exiting：逻辑上已失活，但仍保留挂载以播放退场动画
 * - exited：退场完成（即将真正被挂起 / 移出渲染树）
 */
export type RouteTransitionPhase = 'entering' | 'entered' | 'exiting' | 'exited'

/**
 * 路由过渡配置。不传（`undefined`）则完全不启用过渡，零行为差异
 */
export interface RouteTransitionOptions {
  /**
   * 进场兜底超时（毫秒）：超过该时长仍未调用 finishEnter 则自动判定为进场完成
   * @default 500
   */
  enterTimeout?: number
  /**
   * 退场兜底超时（毫秒）：超过该时长仍未调用 finishExit 则自动判定为退场完成
   * @default 500
   */
  exitTimeout?: number
  /**
   * 是否遵循 `prefers-reduced-motion: reduce`，命中时跳过过渡窗口、立即切换
   * @default true
   */
  respectReducedMotion?: boolean
}

/**
 * 通过 `useRouteTransition` 暴露给子树的过渡状态
 */
export interface RouteTransitionState {
  /** 当前所处阶段 */
  phase: RouteTransitionPhase
  /** 手动确认进场动画已结束；不调用时由 enterTimeout 兜底 */
  finishEnter: () => void
  /** 手动确认退场动画已结束；不调用时由 exitTimeout 兜底 */
  finishExit: () => void
  /**
   * 触发本次进场 / 退场的导航方向，在 active 切换的瞬间被捕获快照，
   * 之后即使全局方向再变化也不受影响（避免动画播放到一半方向突变）
   */
  direction: NavigationDirection
}
