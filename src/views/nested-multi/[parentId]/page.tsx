/**
 * 嵌套路由多级参数 - 父路由页面
 * 路由: /nested-multi/:parentId
 */
import { Link, Outlet, useParams } from '../../../router'

export default function NestedParamsMultiPage() {
  const { params } = useParams()

  return (
    <div className="space-y-8">
      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <h2 className="text-2xl font-semibold text-purple-300 mb-2">
          父路由 - 多级参数
        </h2>
        <p className="text-sm text-neutral-300 mb-2">
          路由路径：
          <code className="bg-black/30 px-2 py-1 rounded">/nested-multi/:parentId</code>
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
        <Link to="/nested-multi/1/child/10/posts/100" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors text-sm">
          父: 1 - 子: 10 - 文章: 100
        </Link>
        <Link to="/nested-multi/2/child/20/posts/200" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors text-sm">
          父: 2 - 子: 20 - 文章: 200
        </Link>
        <Link to="/nested-multi/user1/child/child1/posts/post1" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors text-sm">
          父: user1 - 子: child1 - 文章: post1
        </Link>
      </div>
    </div>
  )
}
