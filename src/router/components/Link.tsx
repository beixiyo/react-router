import type { ReactNode } from 'react'
import { useRouter } from '../hooks/use-router'

/**
 * 链接组件
 * @param to 目标路径
 * @param children 子元素
 * @param className 可选的 CSS 类名
 */
export function Link({ to, children, className }: { to: string, children: ReactNode, className?: string }) {
  const router = useRouter()
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        router?.navigate(to)
      }}
    >
      { children }
    </a>
  )
}

/**
 * 导航链接组件（带激活状态）
 * @param to 目标路径
 * @param children 子元素
 * @param className 基础 CSS 类名（始终应用）
 * @param activeClassName 激活状态时的 CSS 类名
 * @param inactiveClassName 非激活状态时的 CSS 类名（可选）
 */
export function NavLink({
  to,
  children,
  className,
  activeClassName,
  inactiveClassName,
}: {
  to: string
  children: ReactNode
  className?: string
  activeClassName?: string
  inactiveClassName?: string
}) {
  const router = useRouter()
  const isActive = router?.location.pathname === to

  // 如果外部提供了类名，使用外部类名；否则使用默认样式
  let cls: string = ''
  if (className || activeClassName || inactiveClassName) {
    const base = className || ''
    const active = activeClassName || ''
    const inactive = inactiveClassName || ''
    cls = `${base} ${isActive
      ? active
      : inactive}`.trim()
  }

  return (
    <a
      href={to}
      className={cls}
      onClick={(e) => {
        e.preventDefault()
        router?.navigate(to)
      }}
    >
      { children }
      { isActive && !activeClassName && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      ) }
    </a>
  )
}
