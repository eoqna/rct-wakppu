/** Keeps at most one running loop per key, so a stay platform can never stack its sound. */
export class LoopSet<T> {
  private readonly live = new Map<string, { handle: T; stop: (h: T) => void }>()

  /** Starts the loop unless one is already running under this key; returns whether it started. */
  start(key: string, create: () => T, stop: (h: T) => void): boolean {
    if (this.live.has(key)) return false
    this.live.set(key, { handle: create(), stop })
    return true
  }

  has(key: string) {
    return this.live.has(key)
  }

  stop(key: string) {
    const loop = this.live.get(key)
    if (!loop) return
    this.live.delete(key)
    loop.stop(loop.handle)
  }

  stopAll() {
    for (const key of [...this.live.keys()]) this.stop(key)
  }

  get size() {
    return this.live.size
  }
}
