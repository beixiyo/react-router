import type { ReactNode } from 'react'
import { useRouteTransitionBindings } from '../../router'

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
 * 路由切换退场 / 进场演示：纯 CSS transition 做淡入淡出 + 位移，不依赖任何动画库
 *
 * 进场双帧节奏、transitionend 冒泡过滤、finishEnter / finishExit 接线
 * 均由 useRouteTransitionBindings 封装，这里只负责样式
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { isEntering, isExiting, direction, bind } = useRouteTransitionBindings()

  /**
   * 有明确前进 / 后退方向（push、浏览器原生前进后退）时走横向滑动，方向感知；
   * replace（守卫重定向、显式 replace）没有「栈方向」语义，退化为竖直淡入淡出
   */
  const axis = direction === 'replace'
    ? 'Y'
    : 'X'
  const enterOffset = direction === 'back'
    ? -SLIDE_OFFSET_PX
    : SLIDE_OFFSET_PX

  return (
    <div
      className="transition-all ease-out"
      style={{
        transitionDuration: `${TRANSITION_DURATION_MS}ms`,
        opacity: isExiting || isEntering
          ? 0
          : 1,
        transform: isExiting
          ? `translate${axis}(${-enterOffset}px)`
          : isEntering
            ? `translate${axis}(${enterOffset}px)`
            : `translate${axis}(0)`,
      }}
      {...bind}
    >
      { children }
    </div>
  )
}
