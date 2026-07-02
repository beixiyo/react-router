/**
 * 多级参数测试页面
 * 路由: /params-multi/:userId/posts/:postId
 */
import { Link, useParams } from '@/router'

export default function ParamsMultiPage() {
  const { params } = useParams()

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        多级参数测试
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
            <code className="bg-black/30 px-2 py-1 rounded">/params-multi/:userId/posts/:postId</code>
          </p>
          <p className="text-sm text-neutral-300">
            这是一个多级参数路由，包含 userId 和 postId 两个必选参数。
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/params-multi/1/posts/10" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
            用户 1 - 文章 10
          </Link>
          <Link to="/params-multi/2/posts/20" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
            用户 2 - 文章 20
          </Link>
          <Link to="/params-multi/alice/posts/my-first-post" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
            用户 alice - 文章 my-first-post
          </Link>
        </div>
      </div>
    </div>
  )
}
