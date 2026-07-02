import type { ReactNode } from 'react'
import { useLayoutEffect, useState } from 'react'
import { useRouteTransition } from '../../router'

/**
 * CSS 过渡时长（毫秒）
 *
 * RouterOptions.transition 的 enterTimeout / exitTimeout 兜底超时必须比它稍大
 * （见 src/routes/index.tsx，由本常量派生），否则动画会被兜底超时腰斩
 */
export const TRANSITION_DURATION_MS = 300

/** 前进 / 后退横向滑动的位移量（像素） */
const SLIDE_OFFSET_PX = 12

/**
 * 路由切换退场 / 进场演示：读 useRouteTransition() 的 phase，用纯 CSS transition 做淡入淡出 + 位移
 * 不依赖任何动画库；退场 / 进场动画结束后回调 finishExit / finishEnter，通知路由完成过渡
 *
 * 与 keep-alive 缓存无关——无论页面是否被缓存，只要 RouterOptions.transition 开启，都会走到这里
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const transition = useRouteTransition()
  const [revealed, setRevealed] = useState(false)
  const phase = transition?.phase

  /**
   * 进场先以「未展示」状态提交一帧，下一帧再切到展示态，CSS transition 才能捕捉到属性变化
   *
   * 必须用 useLayoutEffect 在 paint 之前复位：缓存页复活时组件 state 仍留有上一轮的
   * revealed=true，若等 paint 后才复位，首帧会以终态闪现一下、消失、再重播进场动画
   */
  useLayoutEffect(() => {
    if (phase !== 'entering')
      return

    setRevealed(false)
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const isExiting = phase === 'exiting'
  const isEntering = phase === 'entering' && !revealed

  /**
   * 有明确前进 / 后退方向（push、浏览器原生前进后退）时走横向滑动，方向感知；
   * replace（守卫重定向、显式 replace）没有「栈方向」语义，退化为竖直淡入淡出
   */
  const direction = transition?.direction ?? 'replace'
  const axis = direction === 'replace'
    ? 'Y'
    : 'X'
  const enterOffset = direction === 'back'
    ? -SLIDE_OFFSET_PX
    : SLIDE_OFFSET_PX
  const exitOffset = -enterOffset

  return (
    <div
      className="transition-all ease-out"
      style={{
        transitionDuration: `${TRANSITION_DURATION_MS}ms`,
        opacity: isExiting || isEntering
          ? 0
          : 1,
        transform: isExiting
          ? `translate${axis}(${exitOffset}px)`
          : isEntering
            ? `translate${axis}(${enterOffset}px)`
            : `translate${axis}(0)`,
      }}
      onTransitionEnd={(e) => {
        /** 只认自身的过渡结束；子元素（如 hover 变色）的 transitionend 会冒泡上来，不能当页面动画完成信号 */
        if (e.target !== e.currentTarget)
          return

        if (transition?.phase === 'exiting')
          transition.finishExit()
        else if (transition?.phase === 'entering' && revealed)
          transition.finishEnter()
      }}
    >
      { children }
    </div>
  )
}
