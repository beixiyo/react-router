import type { NavigationDirection, RouteTransitionOptions } from '../../types/transition'

/** 过渡 / 方向类型定义在类型层（见 types/transition.ts），此处 re-export 供组件内部就近引用 */
export type { NavigationDirection, RouteTransitionOptions, RouteTransitionPhase, RouteTransitionState } from '../../types/transition'

export interface KeepAliveProps {
  children: React.ReactNode
  active: boolean
  /**
   * 是否在激活时强制刷新子组件（通过递增 renderKey 触发重新挂载）。
   * 用于解决 framer-motion 等动画库在 Suspense 恢复后状态不重置的问题。
   * @default false
   */
  forceRender?: boolean
  /**
   * 过渡配置：传入后 active 的切换不再立即生效，而是先经过 entering / exiting 窗口。
   * 不传时行为与未接入过渡前完全一致（立即切换）
   * @default undefined
   */
  transition?: RouteTransitionOptions
  /**
   * 退场彻底完成（phase 变为 exited）时触发一次
   * 供上层清理临时占位（如未缓存路由的退场槽位），缓存条目通常无需使用
   */
  onExited?: () => void
  /**
   * 触发本次 active 切换的导航方向，由 {@link Router.navigationDirection} 透传而来
   * @default 'replace'
   */
  direction?: NavigationDirection
}

/**
 * {@link useKeepAliveEffect} 的回调
 *
 * 激活时执行，可返回一个在「失活（隐藏）/ 卸载」时调用的 cleanup（同 {@link useEffect} 约定）。
 */
export type KeepAliveEffectCallback = () => void | (() => void)

export interface KeepAliveContextType {
  registerActiveEffect: (key: keyof any, effectCallback: Function) => void
  registerDeactiveEffect: (key: keyof any, effectCallback: Function) => void

  findEffect: (key?: keyof any) => {
    activeEffect: Function[]
    deactiveEffect: Function[]
  }

  /** 传 callback 则只移除该回调；不传 callback 删除整个 key；不传 key 清空全部 */
  delActiveEffect: (key?: keyof any, callback?: Function) => void
  delDeactiveEffect: (key?: keyof any, callback?: Function) => void
}
