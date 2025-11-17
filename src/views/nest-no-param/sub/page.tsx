import { Link } from '@/router'
import { randomColor } from '@/utils'

export default function page() {
  return (
    <div style={{
      background: randomColor(),
    }}
    >
      <h3 className="text-lg font-medium text-white mb-3">子路由内容：</h3>
      <div className="flex gap-2 flex-wrap justify-center">
        <Link to="/nest-no-param" className="px-4 py-2 rounded-full bg-black border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
          返回父路由
        </Link>
      </div>
    </div>
  )
}
