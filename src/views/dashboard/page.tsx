/**
 * Dashboard 页面 - 嵌套路由示例的父路由
 */
import { Link, Outlet } from '../../router'

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        Dashboard
      </h2>
      <p className="text-neutral-400">这是 Dashboard 页面，下面会渲染子路由内容</p>

      <nav className="flex gap-4 pb-4 border-b border-white/10">
        <Link to="/dashboard/index" className="text-cyan-400 hover:text-cyan-300">
          概览
        </Link>
        <Link to="/dashboard/settings" className="text-cyan-400 hover:text-cyan-300">
          设置
        </Link>
        <Link to="/dashboard/profile" className="text-cyan-400 hover:text-cyan-300">
          个人资料
        </Link>
      </nav>

      {/* Outlet 会在这里渲染子路由 */}
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  )
}
