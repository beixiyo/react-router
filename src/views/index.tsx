/**
 * Home 页面
 *
 * 展示本地状态与输入框，用于验证 Activity 缓存的状态恢复。
 */
import { useState } from 'react'

export default function Home() {
  const [text, setText] = useState('')
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Home</h2>
      <input
        value={text}
        placeholder="输入内容以验证缓存"
        onChange={e => setText(e.target.value)}
        className="w-full max-w-lg px-4 py-3 rounded-md border border-white/10 bg-black/40 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      />
      <div className="text-sm text-neutral-400">
        当前输入：
        {text}
      </div>
    </div>
  )
}
