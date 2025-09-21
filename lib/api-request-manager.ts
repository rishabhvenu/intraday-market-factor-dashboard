class APIRequestManager {
  private requestQueue: Array<{ url: string; resolve: Function; reject: Function }> = []
  private requestTimes: number[] = []
  private isProcessing = false
  private readonly MAX_REQUESTS_PER_MINUTE = 5
  private readonly MINUTE_MS = 60 * 1000

  private canMakeRequest(): boolean {
    const now = Date.now()
    // Remove requests older than 1 minute
    this.requestTimes = this.requestTimes.filter((time) => now - time < this.MINUTE_MS)

    return this.requestTimes.length < this.MAX_REQUESTS_PER_MINUTE
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        // Wait until we can make another request
        const oldestRequest = this.requestTimes[0]
        const waitTime = oldestRequest ? oldestRequest + this.MINUTE_MS - Date.now() : 0

        if (waitTime > 0) {
          console.log(`[v0] Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before next request`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }
      }

      const request = this.requestQueue.shift()
      if (!request) continue

      try {
        this.requestTimes.push(Date.now())
        console.log(
          `[v0] Making API request ${this.requestTimes.length}/${this.MAX_REQUESTS_PER_MINUTE}: ${request.url}`,
        )

        const response = await fetch(request.url)
        request.resolve(response)
      } catch (error) {
        request.reject(error)
      }
    }

    this.isProcessing = false
  }

  async makeRequest(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, resolve, reject })
      this.processQueue()
    })
  }

  getQueueStatus() {
    const now = Date.now()
    this.requestTimes = this.requestTimes.filter((time) => now - time < this.MINUTE_MS)

    return {
      requestsInLastMinute: this.requestTimes.length,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      queueLength: this.requestQueue.length,
      canMakeRequest: this.canMakeRequest(),
    }
  }
}

export const apiRequestManager = new APIRequestManager()
