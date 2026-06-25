export class LRUCache<K, V> extends Map<K, V> {
  /**
   * @param maxCacheLen 最大缓存长度
   */
  constructor(public maxCacheLen: number) {
    super()
  }

  get(key: K): V | undefined {
    const value = super.get(key)
    /**
     * 如果存在，则删除后重新设置，保证顺序最新
     */
    if (value) {
      this.delete(key)
      this.set(key, value)
    }
    return value
  }

  set(key: K, value: V): this {
    /**
     * 如果存在，则删除后重新设置，保证顺序最新
     */
    if (super.has(key)) {
      super.delete(key)
    }
    const res = super.set(key, value)

    /**
     * 超出最大缓存长度则淘汰最久未使用的（用循环而非单次 if，
     * 兼容运行时调小 maxCacheLen 后一次性裁剪多余条目的场景）
     */
    this.trim()

    return res
  }

  /**
   * 将缓存裁剪到不超过 maxCacheLen，从最久未使用（最早插入）的一端淘汰
   * 在运行时调小 maxCacheLen 后调用，可立即收敛到新上限，而非依赖后续 set 逐个挤出
   */
  trim(): void {
    while (this.size > this.maxCacheLen) {
      const first = this.keys().next()
      if (first.done)
        break
      this.delete(first.value)
    }
  }
}
