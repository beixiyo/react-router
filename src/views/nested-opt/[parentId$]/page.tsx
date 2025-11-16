/**
 * 嵌套路由可选参数 - 父路由页面
 * 路由: /nested-opt/:parentId?
 */
import { Link, Outlet, useParams } from '../../../router'

export default function NestedParamsOptPage() {
  const { params } = useParams()

  return (
    <div className="space-y-8">
      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <h2 className="text-2xl font-semibold text-purple-300 mb-2">
          父路由 - 可选参数
        </h2>
        <p className="text-sm text-neutral-300 mb-2">
          路由路径：
          <code className="bg-black/30 px-2 py-1 rounded">/nested-opt/:parentId?</code>
        </p>
        <div className="mt-3">
          <h3 className="text-sm font-medium text-white mb-1">父路由参数：</h3>
          <pre className="text-xs text-neutral-300 bg-black/30 p-2 rounded overflow-x-auto">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
      </div>

      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <h3 className="text-lg font-medium text-white mb-3">子路由内容：</h3>
        <div className="border-l-2 border-purple-500/30 pl-4">
          <Outlet />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link to="/nested-opt" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
          无父参数
        </Link>
        <Link to="/nested-opt/parent1" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
          父 ID: parent1
        </Link>
        <Link to="/nested-opt/parent1/child" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
          父 ID: parent1 - 无子参数
        </Link>
        <Link to="/nested-opt/parent1/child/child1" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
          父 ID: parent1 - 子 ID: child1
        </Link>
      </div>
    </div>
  )
}
