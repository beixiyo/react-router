/**
 * 无参数路由测试页面
 * 路由: /params
 */
import { Link, useParams } from '../../router'
import { PageTransition } from '../_shared/PageTransition'

export default function ParamsIndexPage() {
  const { params, query, hash } = useParams()

  return (
    <PageTransition>
      <div className="space-y-8">
        <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          参数路由索引页
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">当前参数：</h3>
            <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto">
              {JSON.stringify({ params, query, hash }, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <p className="text-sm text-cyan-300 mb-2">
              💡 路由路径：
              <code className="bg-black/30 px-2 py-1 rounded">/params</code>
            </p>
            <p className="text-sm text-neutral-300">
              这是参数路由的索引页，没有参数。访问
              {' '}
              <code className="bg-black/30 px-1 rounded">/params/:id</code>
              {' '}
              可以查看带参数的路由。
            </p>
          </div>

          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <h3 className="text-lg font-medium text-white mb-3">测试链接：</h3>
            <div className="flex gap-2 flex-wrap">
              <Link to="/params" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
                当前页面（无参数）
              </Link>
              <Link to="/params/123" className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors">
                带参数: /params/123
              </Link>
              <Link to="/params/456" className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors">
                带参数: /params/456
              </Link>
              <Link to="/params/abc" className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors">
                带参数: /params/abc
              </Link>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <h3 className="text-lg font-medium text-white mb-2">路由说明：</h3>
            <ul className="text-sm text-neutral-300 space-y-2 list-disc list-inside">
              <li>
                <code className="bg-black/30 px-1 rounded">/params</code>
                {' '}
                - 当前页面（无参数）
              </li>
              <li>
                <code className="bg-black/30 px-1 rounded">/params/:id</code>
                {' '}
                - 必选参数路由
              </li>
              <li>
                <code className="bg-black/30 px-1 rounded">/params-opt/:id?</code>
                {' '}
                - 可选参数路由
              </li>
              <li>
                <code className="bg-black/30 px-1 rounded">/params-multi/:userId/posts/:postId</code>
                {' '}
                - 多级参数路由
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
