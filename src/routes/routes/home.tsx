import type { RouteObject } from '../../router/types'
import Home from '../../views'

function RootPage({ children }: any) {
  return (
    <div>
      <h1>layoutComponent 包装</h1>
      { children }
    </div>
  )
}

export const homeRoutes: RouteObject[] = [
  { path: '/', component: Home, layoutComponent: RootPage },
]
