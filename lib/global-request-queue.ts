// Global request queue to prevent ALL concurrent API requests
class GlobalRequestQueue {
  private static instance: GlobalRequestQueue
  private queue: Array<() => Promise<any>> = []
  private isProcessing = false
  private globalBlockUntil = 0
  private readonly GLOBAL_BLOCK_DURATION = 3 * 60 * 1000 // 3 minutes

  static getInstance(): GlobalRequestQueue {
    if (!GlobalRequestQueue.instance) {
      GlobalRequestQueue.instance = new GlobalRequestQueue()
    }
    return GlobalRequestQueue.instance
  }

  // Block ALL requests for 3 minutes when ANY 429 occurs
  handle429Error(): void {
    console.log("[v0] NUCLEAR OPTION: 429 detected - BLOCKING ALL API REQUESTS FOR 3 MINUTES")
    this.globalBlockUntil = Date.now() + this.GLOBAL_BLOCK_DURATION
    this.queue = [] // Clear all pending requests
  }

  // Check if globally blocked
  isBlocked(): boolean {
    if (this.globalBlockUntil > Date.now()) {
      const remainingMs = this.globalBlockUntil - Date.now()
      console.log(`[v0] GLOBAL BLOCK ACTIVE - ${Math.ceil(remainingMs / 1000)}s remaining`)
      return true
    }
    return false
  }

  // Add request to queue (only one can execute at a time)
  async enqueue<T>(requestFn: () => Promise<T>, description: string): Promise<T> {
    if (this.isBlocked()) {
      const remainingMs = this.globalBlockUntil - Date.now()
      throw new Error(`All API requests blocked due to rate limit. Wait ${Math.ceil(remainingMs / 1000)} seconds`)
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          console.log(`[v0] EXECUTING QUEUED REQUEST: ${description}`)
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          if (error instanceof Error && (error.message.includes("429") || error.message.includes("rate limit"))) {
            this.handle429Error()
          }
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0 && !this.isBlocked()) {
      const request = this.queue.shift()
      if (request) {
        try {
          await request()
          // Wait 5 seconds between requests to prevent overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 5000))
        } catch (error) {
          console.error("[v0] Request failed in queue:", error)
          // Continue processing other requests unless globally blocked
          if (this.isBlocked()) {
            break
          }
        }
      }
    }

    this.isProcessing = false
  }

  getRemainingBlockTime(): number {
    return Math.max(0, this.globalBlockUntil - Date.now())
  }

  getQueueStatus(): { queueLength: number; isProcessing: boolean; isBlocked: boolean } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isBlocked: this.isBlocked(),
    }
  }
}

export const globalRequestQueue = GlobalRequestQueue.getInstance()
