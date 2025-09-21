class GlobalRateLimiter {
  private static instance: GlobalRateLimiter
  private creditsExhausted = false

  static getInstance(): GlobalRateLimiter {
    if (!GlobalRateLimiter.instance) {
      GlobalRateLimiter.instance = new GlobalRateLimiter()
    }
    return GlobalRateLimiter.instance
  }

  markCreditsExhausted(): void {
    console.log("[v0] API credits exhausted - blocking all requests until tomorrow")
    this.creditsExhausted = true
  }

  resetCredits(): void {
    console.log("[v0] API credits reset - requests allowed again")
    this.creditsExhausted = false
  }

  async isBlocked(): Promise<boolean> {
    return this.creditsExhausted
  }

  async handle429Error(error: any): Promise<void> {
    console.log("[v0] 429 error detected - marking credits as exhausted")
    this.markCreditsExhausted()
  }

  getRemainingBlockTime(): number {
    return this.creditsExhausted ? 24 * 60 * 60 * 1000 : 0
  }
}

export const globalRateLimiter = GlobalRateLimiter.getInstance()
