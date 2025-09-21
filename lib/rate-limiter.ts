class RateLimiter {
  private lastApiCall = 0
  private readonly minInterval: number = 180000 // 3 minutes between API calls

  async waitForNextCall(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall
      console.log(`[v0] Rate limiting: waiting ${waitTime}ms before next API call`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastApiCall = Date.now()
  }

  canMakeCall(): boolean {
    const now = Date.now()
    return now - this.lastApiCall >= this.minInterval
  }

  getTimeUntilNextCall(): number {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCall
    return Math.max(0, this.minInterval - timeSinceLastCall)
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter()
