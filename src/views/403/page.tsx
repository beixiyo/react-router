/**
 * Forbidden 页面
 *
 * 无权限时展示的 403 页面。
 */
export default function Forbidden() {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">403 Forbidden</h2>
      <p className="text-sm text-neutral-400">您没有访问该页面的权限</p>
    </div>
  )
}
