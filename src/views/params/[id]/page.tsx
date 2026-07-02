/**
 * 必选参数测试页面
 * 路由: /params/:id
 */
import { Link, useNavigate, useParams } from '../../../router'
import { PageTransition } from '../../_shared/PageTransition'

export default function ParamsPage() {
  const { params, query, hash } = useParams()
  const navigate = useNavigate()
  console.log({ params, query, hash })

  return (
    <PageTransition>
      <div className="space-y-8">
        <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          必选参数测试
        </h2>
        <div className="space-y-4">
          {/* 路由参数 (params) */ }
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">路由参数 (params)：</h3>
            <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto">
              { JSON.stringify(params, null, 2) }
            </pre>
          </div>

          {/* 查询参数 (query) */ }
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h3 className="text-lg font-medium text-white mb-2">查询参数 (query)：</h3>
            <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto">
              { JSON.stringify(query, null, 2) }
            </pre>
            { Object.keys(query).length === 0 && (
              <p className="text-xs text-neutral-400 mt-2">💡 尝试在 URL 后添加查询参数，如：?name=test&age=20</p>
            ) }
          </div>

          {/* Hash 参数 */ }
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <h3 className="text-lg font-medium text-white mb-2">Hash 参数 (hash)：</h3>
            <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto">
              { JSON.stringify(hash, null, 2) }
            </pre>
            { Object.keys(hash).length === 0 && (
              <p className="text-xs text-neutral-400 mt-2">💡 尝试在 URL 后添加 hash 参数，如：#section=intro&tab=details</p>
            ) }
          </div>

          <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <p className="text-sm text-cyan-300 mb-2">
              💡 路由路径：
              <code className="bg-black/30 px-2 py-1 rounded">/params/:id</code>
            </p>
            <p className="text-sm text-neutral-300">
              这是一个必选参数路由，访问时必须提供 id 参数。现在 useParams 可以同时获取 params、query 和 hash。
            </p>
          </div>

          {/* 测试链接 */ }
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">基础测试（仅路由参数）：</h4>
              <div className="flex gap-2 flex-wrap">
                <Link to="/params/123" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
                  测试 ID: 123
                </Link>
                <Link to="/params/456" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
                  测试 ID: 456
                </Link>
                <Link to="/params/abc" className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
                  测试 ID: abc
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">查询参数测试（params + query）：</h4>
              <div className="flex gap-2 flex-wrap">
                <Link to="/params/123?name=张三&age=25" className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors">
                  ID: 123, ?name=张三&age=25
                </Link>
                <Link to="/params/456?category=tech&tags=react&tags=router" className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors">
                  ID: 456, ?category=tech&tags=react&tags=router
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">Hash 参数测试（params + hash）：</h4>
              <div className="flex gap-2 flex-wrap">
                <Link to="/params/789#section=intro&tab=overview" className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-white transition-colors">
                  ID: 789, #section=intro&tab=overview
                </Link>
                <Link to="/params/999#view=details&highlight=true" className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-white transition-colors">
                  ID: 999, #view=details&highlight=true
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">完整测试（params + query + hash）：</h4>
              <div className="flex gap-2 flex-wrap">
                <Link to="/params/100?name=测试&page=1#section=content&scroll=true" className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-white transition-colors">
                  完整示例
                </Link>
              </div>
            </div>
          </div>

          {/* useNavigate 测试区域 */}
          <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <h3 className="text-lg font-medium text-white mb-4">🚀 useNavigate API 测试</h3>
            <p className="text-sm text-neutral-300 mb-4">
              使用
              {' '}
              <code className="bg-black/30 px-2 py-1 rounded">useNavigate</code>
              {' '}
              进行编程式导航。
              <br />
              <span className="text-yellow-400">💡 提示：</span>
              {' '}
              对于路径参数，推荐直接写完整路径（如
              <code className="bg-black/30 px-1 rounded">navigate('/params/123')</code>
              ），
              这是 React Router 和 Vue Router 的标准用法。路径模板 + params 的方式作为高级用法保留。
            </p>

            <div className="space-y-4">
              {/* 标准用法：直接写完整路径 */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  ✅ 标准用法（推荐）：直接写完整路径
                </h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/params/123')}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                  >
                    {`navigate('/params/123')`}
                  </button>
                  <button
                    onClick={() => navigate('/params/456')}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                  >
                    {`navigate('/params/456')`}
                  </button>
                </div>
              </div>

              {/* 高级用法：路径模板 + params */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  🔧 高级用法：路径模板 + params 对象
                </h4>
                <p className="text-xs text-neutral-400 mb-2">
                  这种方式需要同时提供路径模板和 params，适用于动态构建路径的场景
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/params/:id', { params: { id: 'navigate-123' } })}
                    className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors text-xs"
                  >
                    {`navigate('/params/:id', { params: { id: 'navigate-123' } })`}
                  </button>
                  <button
                    onClick={() => navigate('/params/:id', { params: { id: 999 } })}
                    className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors text-xs"
                  >
                    {`navigate('/params/:id', { params: { id: 999 } }) (数字)`}
                  </button>
                </div>
              </div>

              {/* 查询参数测试 */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">查询参数测试（query）：</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/params/200', { query: { name: 'useNavigate', type: 'test' } })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    {`query: { name: "useNavigate", type: "test" }`}
                  </button>
                  <button
                    onClick={() => navigate('/params/201', { query: { tags: ['react', 'router', 'test'], page: 1 } })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    {`query: { tags: ["react", "router"], page: 1 }`}
                  </button>
                </div>
              </div>

              {/* Hash 参数测试 */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Hash 参数测试（hash）：</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/params/300', { hash: { section: 'navigate', tab: 'api' } })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    {`hash: { section: "navigate", tab: "api" }`}
                  </button>
                  <button
                    onClick={() => navigate('/params/301', { hash: '#custom-hash' })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    {`hash: '#custom-hash' (字符串)`}
                  </button>
                </div>
              </div>

              {/* 组合测试 */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">组合测试（params + query + hash）：</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate('/params/888', {
                      query: { name: '完整测试', page: 2, tags: ['test', 'navigate'] },
                      hash: { section: 'content', scroll: 'true' },
                    })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    完整配置示例（标准用法）
                  </button>
                  <button
                    onClick={() => navigate('/params/999', {
                      query: { category: 'tech', sort: 'desc' },
                      hash: '#top',
                      replace: true,
                    })}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors text-xs"
                  >
                    完整配置 + replace
                  </button>
                </div>
              </div>

              {/* 相对导航测试 */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">相对导航测试：</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                  >
                    navigate(-1) 返回上一页
                  </button>
                  <button
                    onClick={() => navigate(1)}
                    className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                  >
                    navigate(1) 前进一页
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
