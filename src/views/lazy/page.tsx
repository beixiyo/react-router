import { useNavigate } from '../../router'

/**
 * 懒加载页面示例
 *
 * 这个页面使用懒加载，只有在访问时才会加载
 */
export default function LazyPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        懒加载页面
      </h2>
      <div className="space-y-4">
        <p className="text-neutral-400">
          这是一个使用懒加载的路由页面。只有在访问这个路由时，这个组件才会被加载。
        </p>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-lg font-medium text-white mb-2">懒加载的优势：</h3>
          <ul className="list-disc list-inside space-y-1 text-neutral-300 text-sm">
            <li>减少初始包大小，提高首屏加载速度</li>
            <li>按需加载，只加载用户访问的页面</li>
            <li>更好的代码分割和性能优化</li>
            <li>
              <button className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-300 px-4 py-2" onClick={() => navigate('/lazy-direct')}>
                跳转到懒加载页面（直接导入）
              </button>
              <button className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-300 px-4 py-2" onClick={() => navigate('/lazy-custom')}>
                跳转到懒加载页面（自定义加载）
              </button>
              <button className="bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-300 px-4 py-2" onClick={() => navigate('/lazy')}>
                跳转到懒加载页面（使用 React.lazy）
              </button>
            </li>
          </ul>
        </div>
        <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <p className="text-sm text-cyan-300">
            💡 提示：打开浏览器开发者工具的 Network 标签，刷新页面后访问这个路由，
            可以看到组件代码被动态加载。
          </p>
        </div>
      </div>
    </div>
  )
}
