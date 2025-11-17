import { Link, Outlet } from '@/router'
import { randomColor } from '@/utils'

export default function NestedParamsPage() {
  return (
    <div className="space-y-8" style={ {
      background: randomColor()
    } }>
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
  )
}
