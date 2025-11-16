/**
 * Dashboard 设置页面 - 嵌套路由示例的子路由
 */
export default function DashboardSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-white">设置</h3>
      <p className="text-neutral-400">
        这是 Dashboard 的设置页面，通过嵌套路由实现。
      </p>
      <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="text-sm text-neutral-300">
          访问路径：
          <code className="text-cyan-400">/dashboard/settings</code>
        </p>
      </div>
    </div>
  )
}
