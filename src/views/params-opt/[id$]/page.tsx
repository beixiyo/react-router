/**
 * 可选参数测试页面
 * 路由: /params-opt/:id?
 */
import { Link, useParams } from '../../../router'
import { PageTransition } from '../../_shared/PageTransition'

export default function ParamsOptPage() {
  const { params } = useParams()

  return (
    <PageTransition>
      <div className="space-y-8">
        <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          可选参数测试
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">当前参数：</h3>
            <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>
          <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <p className="text-sm text-cyan-300 mb-2">
              💡 路由路径：
              <code className="bg-black/30 px-2 py-1 rounded">/params-opt/:id?</code>
            </p>
            <p className="text-sm text-neutral-300">
              这是一个可选参数路由，id 参数可以省略。如果不提供，params 中可能没有 id 字段。
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/params-opt" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
              无参数
            </Link>
            <Link to="/params-opt/123" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
              有参数: 123
            </Link>
            <Link to="/params-opt/xyz" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
              有参数: xyz
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
