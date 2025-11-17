import type { AnchorHTMLAttributes } from 'react'
import { useRouter } from '../hooks/use-router'

/**
 * 链接组件
 * @param to 目标路径
 * @param children 子元素
 */
export function Link({
  to,
  children,
  onClick,
  ...rest
}: {
  to: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const router = useRouter()
  return (
    <a
      href={ to }
      { ...rest }
      onClick={ (e) => {
        e.preventDefault()
        router?.navigate(to)
        onClick?.(e)
      } }
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
  onClick,
  ...rest
}: {
  to: string
  activeClassName?: string
  inactiveClassName?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
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
      href={ to }
      className={ cls }
      { ...rest }
      onClick={ (e) => {
        e.preventDefault()
        router?.navigate(to)
        onClick?.(e)
      } }
    >
      { children }
      { isActive && !activeClassName && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      ) }
    </a>
  )
}
