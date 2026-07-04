import type { AnchorHTMLAttributes } from 'react'
import { useLocation } from '../hooks/use-location'
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
      href={to}
      {...rest}
      onClick={(e) => {
        e.preventDefault()
        router?.navigate(to)
        onClick?.(e)
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
  end = false,
  onClick,
  ...rest
}: {
  to: string
  activeClassName?: string
  inactiveClassName?: string
  /**
   * 是否精确匹配。
   * - `false`（默认）：前缀匹配，父路径在子路由下仍激活（`/users` 命中 `/users/1`）；
   *   按路径段边界匹配，`/users` 不会误命中 `/users-admin`，根路径 `/` 也仅在自身激活
   * - `true`：仅当路径完全相等才激活
   * @default false
   */
  end?: boolean
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const router = useRouter()
  /**
   * 激活态必须走 useLocation（响应式订阅）：RouterCtx 下发的是稳定实例、
   * 不随导航重渲染，读 router.location 虽值新鲜但不会触发本组件刷新
   */
  const { pathname } = useLocation()
  const isActive = isPathActive(pathname, to, end)

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
      {...rest}
      onClick={(e) => {
        e.preventDefault()
        router?.navigate(to)
        onClick?.(e)
      }}
    >
      { children }
      { isActive && !activeClassName && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
      ) }
    </a>
  )
}

/**
 * NavLink 激活匹配
 * - `end`（精确）：路径完全相等
 * - 非 `end`（前缀）：`to` 作为**路径段**前缀命中——`pathname` 以 `to` 打头且其后紧跟 `/`，
 *   故 `/users` 命中 `/users/1` 但不命中 `/users-admin`；根路径 `/` 只精确命中、不点亮所有路由
 *
 * 匹配前会：剥掉 `to` 的 query / hash（`pathname` 本就不含），并对两侧尾斜杠归一（根路径除外），
 * 使 `/users?tab=1`、`/users#a`、`/users/` 与 `/users` 判定一致；`to` 为空则视为不匹配
 */
function isPathActive(pathname: string, to: string, end: boolean): boolean {
  const target = normalizePath(stripQueryHash(to))
  if (!target)
    return false

  const current = normalizePath(pathname)
  if (current === target)
    return true
  if (end)
    return false

  return current.startsWith(target)
    && current.charAt(target.length) === '/'
}

/** 只取 `to` 的 pathname 部分（去掉 query / hash）：激活匹配不看查询与锚点 */
function stripQueryHash(to: string): string {
  return to.split(/[?#]/)[0]
}

/** 归一尾部斜杠（根路径 `/` 除外），使 `to` 与 `pathname` 对称比较、`/users//` 收敛到 `/users` */
function normalizePath(path: string): string {
  return path !== '/'
    ? path.replace(/\/+$/, '')
    : path
}
