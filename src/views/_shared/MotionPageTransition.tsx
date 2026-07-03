import type { ReactNode } from 'react'
import type { NavigationDirection } from '../../router'
import { motion } from 'motion/react'
import { useRouteTransition } from '../../router'
import { TRANSITION_DURATION_MS } from './PageTransition'

/** 前进 / 后退横向滑动的位移量（像素）；motion 的 spring 观感下适合比 CSS 版稍大 */
const SLIDE_OFFSET_PX = 24

/**
 * 按方向与进出场计算目标位移：
 * forward / back 走横向（进出方向相反），replace 无栈方向语义走竖直；
 * x / y 恒同时给出，避免方向切换时残留上一轴的旧值
 */
function offsetFor(kind: 'enter' | 'exit', direction: NavigationDirection): { x: number, y: number } {
  const enter = direction === 'back'
    ? -SLIDE_OFFSET_PX
    : SLIDE_OFFSET_PX
  const value = kind === 'enter'
    ? enter
    : -enter

  return direction === 'replace'
    ? { x: 0, y: value }
    : { x: value, y: 0 }
}

/**
 * motion/react 接入演示：JS 动画库不走 `bind`（transitionend 协议），
 * 而是用 phase / direction 驱动 `animate`，在 `onAnimationComplete` 里调用
 * finishExit / finishEnter 原语通知路由过渡完成
 *
 * demo 中 /push-replace 路由使用本组件（见 src/routes/file-routes.tsx），其余为 CSS 版
 */
export function MotionPageTransition({ children }: { children: ReactNode }) {
  const transition = useRouteTransition()

  /** 未开启过渡（全局未配或路由级 false）：正常渲染即可 */
  if (!transition)
    return <>{ children }</>

  const { phase, direction } = transition
  const isExiting = phase === 'exiting'

  return (
    <motion.div
      /** 仅在真正的进场窗口做入场动画；已稳定展示（entered）时不重播 */
      initial={phase === 'entering'
        ? { opacity: 0, ...offsetFor('enter', direction) }
        : false}
      animate={isExiting
        ? { opacity: 0, ...offsetFor('exit', direction) }
        : { opacity: 1, x: 0, y: 0 }}
      transition={{ duration: TRANSITION_DURATION_MS / 1000, ease: 'easeOut' }}
      onAnimationComplete={() => {
        if (transition.phase === 'exiting')
          transition.finishExit()
        else if (transition.phase === 'entering')
          transition.finishEnter()
      }}
    >
      { children }
    </motion.div>
  )
}
