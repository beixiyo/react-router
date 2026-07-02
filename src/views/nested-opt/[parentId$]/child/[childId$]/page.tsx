/**
 * 嵌套路由可选参数 - 子路由页面
 * 路由: /nested-opt/:parentId?/child/:childId?
 */
import { useParams } from '@/router'

export default function NestedParamsOptChildPage() {
  const { params } = useParams()

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <h3 className="text-xl font-semibold text-blue-300 mb-2">
          子路由 - 可选参数
        </h3>
        <p className="text-sm text-neutral-300 mb-2">
          路由路径：
          <code className="bg-black/30 px-2 py-1 rounded">/nested-opt/:parentId?/child/:childId?</code>
        </p>
        <div className="mt-3">
          <h4 className="text-sm font-medium text-white mb-1">所有参数（包含父路由和子路由）：</h4>
          <pre className="text-xs text-neutral-300 bg-black/30 p-2 rounded overflow-x-auto">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          ⚠️ 注意：嵌套路由的可选参数会合并在一起。如果某个参数未提供，它可能不在 params 中。
        </p>
      </div>
    </div>
  )
}
