/**
 * Push/Replace 方法测试页面
 * 路由: /push-replace
 */
import { push, replace, useParams } from '../../router'

export default function PushReplacePage() {
  const { params, query, hash } = useParams()
  console.log({ params, query, hash })

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
        Push/Replace 方法测试
      </h2>

      <div className="space-y-4">
        {/* 当前参数显示 */ }
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-lg font-medium text-white mb-2">当前路由参数：</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-neutral-400">Params:</span>
              <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto mt-1">
                { JSON.stringify(params, null, 2) }
              </pre>
            </div>
            <div>
              <span className="text-sm text-neutral-400">Query:</span>
              <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto mt-1">
                { JSON.stringify(query, null, 2) }
              </pre>
            </div>
            <div>
              <span className="text-sm text-neutral-400">Hash:</span>
              <pre className="text-sm text-neutral-300 bg-black/30 p-3 rounded overflow-x-auto mt-1">
                { JSON.stringify(hash, null, 2) }
              </pre>
            </div>
          </div>
        </div>

        {/* Push 方法测试 */ }
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <h3 className="text-lg font-medium text-white mb-3">Push 方法测试（添加历史记录）</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">1. 合并 Query 参数</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    push({ query: { page: 1 } })
                  }}
                  className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors"
                >
                  合并 page=1
                </button>
                <button
                  onClick={() => {
                    push({ query: { page: 2, sort: 'desc' } })
                  }}
                  className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors"
                >
                  合并 page=2, sort=desc
                </button>
                <button
                  onClick={() => {
                    push({ query: { filter: 'active', status: 'published' } })
                  }}
                  className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white transition-colors"
                >
                  合并 filter=active, status=published
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">2. 覆盖 Query 参数</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    push({ query: { page: 1 }, replaceQuery: true })
                  }}
                  className="px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-white transition-colors"
                >
                  覆盖为 page=1
                </button>
                <button
                  onClick={() => {
                    push({ query: { tab: 'settings' }, replaceQuery: true })
                  }}
                  className="px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-white transition-colors"
                >
                  覆盖为 tab=settings
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">3. 指定路径并合并 Query</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    push('/params/123', { query: { name: 'test' } })
                  }}
                  className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                >
                  导航到 /params/123?name=test
                </button>
                <button
                  onClick={() => {
                    push('/params/456', { query: { category: 'tech', tags: ['react', 'router'] } })
                  }}
                  className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                >
                  导航到 /params/456?category=tech&tags=react&tags=router
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">4. 合并 Params（使用当前路径）</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    push({ params: { id: '999' } })
                  }}
                  className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-white transition-colors"
                >
                  合并 params.id=999
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">5. 组合使用（Query + Hash）</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    push({
                      query: { page: 1, view: 'list' },
                      hash: { section: 'content', tab: 'details' },
                    })
                  }}
                  className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-white transition-colors"
                >
                  合并 query + hash
                </button>
                <button
                  onClick={() => {
                    push({
                      query: { search: 'react' },
                      hash: '#section-intro',
                    })
                  }}
                  className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-white transition-colors"
                >
                  Query + Hash 字符串
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Replace 方法测试 */ }
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
          <h3 className="text-lg font-medium text-white mb-3">Replace 方法测试（替换历史记录）</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-red-300 mb-2">1. 合并 Query 参数</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    replace({ query: { page: 1 } })
                  }}
                  className="px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-white transition-colors"
                >
                  合并 page=1
                </button>
                <button
                  onClick={() => {
                    replace({ query: { page: 2, sort: 'asc' } })
                  }}
                  className="px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-white transition-colors"
                >
                  合并 page=2, sort=asc
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-red-300 mb-2">2. 覆盖 Query 参数</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    replace({ query: { page: 1 }, replaceQuery: true })
                  }}
                  className="px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-white transition-colors"
                >
                  覆盖为 page=1
                </button>
                <button
                  onClick={() => {
                    replace({ query: { mode: 'grid' }, replaceQuery: true })
                  }}
                  className="px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-white transition-colors"
                >
                  覆盖为 mode=grid
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-red-300 mb-2">3. 指定路径并合并 Query</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    replace('/params/789', { query: { name: 'replace-test' } })
                  }}
                  className="px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-white transition-colors"
                >
                  导航到 /params/789?name=replace-test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 说明 */ }
        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <h3 className="text-lg font-medium text-white mb-2">使用说明：</h3>
          <ul className="text-sm text-neutral-300 space-y-2 list-disc list-inside">
            <li>
              <strong className="text-yellow-300">Push</strong>
              ：添加新的历史记录，可以通过浏览器后退按钮返回
            </li>
            <li>
              <strong className="text-yellow-300">Replace</strong>
              ：替换当前历史记录，无法通过后退按钮返回
            </li>
            <li>
              <strong className="text-yellow-300">合并模式</strong>
              （默认）：新的参数会与当前参数合并，相同 key 会被覆盖
            </li>
            <li>
              <strong className="text-yellow-300">覆盖模式</strong>
              （replaceQuery/replaceParams: true）：完全替换当前参数，只保留新参数
            </li>
            <li>
              <strong className="text-yellow-300">不提供 path</strong>
              ：使用当前路径，只更新 params 和 query
            </li>
            <li>
              <strong className="text-yellow-300">提供 path</strong>
              ：导航到新路径，params 用于替换路径中的占位符
            </li>
          </ul>
        </div>

        {/* 对比测试 */ }
        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <h3 className="text-lg font-medium text-white mb-3">对比测试：</h3>
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  push('/push-replace', { query: { test: 'push-1' } })
                  setTimeout(() => {
                    push('/push-replace', { query: { test: 'push-2' } })
                    setTimeout(() => {
                      push('/push-replace', { query: { test: 'push-3' } })
                    }, 500)
                  }, 500)
                }}
                className="px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-white transition-colors"
              >
                连续 Push 3 次（可后退）
              </button>
              <button
                onClick={() => {
                  replace('/push-replace', { query: { test: 'replace-1' } })
                  setTimeout(() => {
                    replace('/push-replace', { query: { test: 'replace-2' } })
                    setTimeout(() => {
                      replace('/push-replace', { query: { test: 'replace-3' } })
                    }, 500)
                  }, 500)
                }}
                className="px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-white transition-colors"
              >
                连续 Replace 3 次（不可后退）
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              💡 点击后观察浏览器历史记录的变化，Push 会添加多条记录，Replace 只会替换当前记录
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
