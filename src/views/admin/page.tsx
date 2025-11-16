/**
 * Admin 页面
 *
 * 需要管理员权限的受保护页面。
 */
export default function Admin() {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Admin</h2>
      <p className="text-sm text-neutral-400">管理员控制台</p>
    </div>
  )
}
