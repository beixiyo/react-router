import { useState } from 'react'
import { Link, Outlet } from '../../router'
import { randomColor } from '../../utils'
import { PageTransition } from '../_shared/PageTransition'

export default function NestedParamsPage() {
  /**
   * 一次性写入 state，作为「壳是否还是同一个 keep-alive 实例」的探针：
   * 只要实例被保活，颜色就保持不变；颜色变了 = 实例被重建（缓存失效）
   * 不能在 render 里内联 randomColor()——壳会随导航重渲染，内联值每次都会重算，
   * 误以为「缓存没生效」，而其实只是重渲染（实例仍单例存活）
   */
  const [bg] = useState(randomColor)

  return (
    <PageTransition>
      <div
        className="space-y-8"
        style={{
          background: bg,
        }}
      >
        <div className="flex gap-2 flex-wrap justify-center">
          <Link to="/nest-no-param/sub" className="px-4 py-2 rounded-full bg-black border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
            进入子路由
          </Link>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="border-l-2 border-purple-500/30 pl-4">
            <Outlet />
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
