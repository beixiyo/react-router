import { NavLink, Outlet, RouterProvider } from './router'
import * as router from './router/utils/navigate'
import { manusRoutes, routerOptions } from './routes'
import './App.css'

function AppNavLink({ to, children }: {
  to: string
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className="relative px-4 py-2 rounded-full transition-colors border"
      activeClassName="border-white/20 bg-white/10 text-white"
      inactiveClassName="border-white/10 bg-white/5 text-white hover:bg-white/10"
    >
      { children }
    </NavLink>
  )
}

/**
 * 应用根组件
 *
 * 集成配置式路由与 Activity 缓存视图。
 */
export default function App() {
  return (
    <RouterProvider routes={manusRoutes} options={routerOptions}>
      <GlobalRouter />

      <header className="sticky top-0 z-10 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-2">
            <AppNavLink to="/">Home</AppNavLink>
            <AppNavLink to="/profile">Profile</AppNavLink>
            <AppNavLink to="/dashboard">Dashboard</AppNavLink>
            <AppNavLink to="/admin">Admin</AppNavLink>
            <AppNavLink to="/lazy">Lazy</AppNavLink>
            <AppNavLink to="/params">Params</AppNavLink>
            <AppNavLink to="/params/1">Params/:id</AppNavLink>
            <AppNavLink to="/nested/1">Nested</AppNavLink>
            <AppNavLink to="/nested-opt/1">NestedOpt</AppNavLink>
            <AppNavLink to="/nested-multi/1">NestedMulti</AppNavLink>
            <AppNavLink to="/login">Login</AppNavLink>
            <AppNavLink to="/guards-example">Guards</AppNavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Outlet />
      </main>
    </RouterProvider>
  )
}

function GlobalRouter() {
  (window as any).$router = router
  return null
}
