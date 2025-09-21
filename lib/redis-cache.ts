import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      console.error("[v0] Redis configuration missing:", {
        hasUrl: !!url,
        hasToken: !!token,
        url: url ? `${url.substring(0, 20)}...` : "undefined",
        token: token ? `${token.substring(0, 10)}...` : "undefined",
        availableEnvVars: {
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          KV_URL: !!process.env.KV_URL,
          REDIS_URL: !!process.env.REDIS_URL,
        },
      })
      throw new Error("Redis configuration missing: No valid Upstash Redis credentials found")
    }

    console.log("[v0] Initializing Redis client with URL:", url.substring(0, 30) + "...")
    console.log("[v0] Token available:", token ? "YES" : "NO")

    if (!url.startsWith("https://")) {
      throw new Error("Invalid Redis URL format - must start with https://")
    }

    redis = new Redis({
      url,
      token,
    })
  }
  return redis
}

export interface CachedMarketData {
  timestamp: number
  data: any
  synthetic: boolean
}

export class MarketDataCache {
  private static readonly CACHE_DURATION = 45 * 60 * 1000 // 45 minutes for batch data
  private static readonly BATCH_DATA_KEY = "market_data_batch"
  private static readonly QUOTE_KEY_PREFIX = "quote:"
  private static readonly RATE_LIMIT_KEY = "rate_limit_status"

  static async getBatchData(): Promise<CachedMarketData | null> {
    try {
      const redisClient = getRedisClient()
      const cached = await redisClient.get(this.BATCH_DATA_KEY)
      if (cached && typeof cached === "string") {
        const data = JSON.parse(cached) as CachedMarketData
        if (Date.now() - data.timestamp < this.CACHE_DURATION) {
          console.log("[v0] Using cached batch data from Redis")
          return data
        }
      }
      return null
    } catch (error) {
      console.error("[v0] Redis get error:", error)
      return null
    }
  }

  static async setBatchData(data: any, synthetic = false): Promise<void> {
    try {
      const redisClient = getRedisClient()
      const cacheData: CachedMarketData = {
        timestamp: Date.now(),
        data,
        synthetic,
      }
      await redisClient.setex(this.BATCH_DATA_KEY, Math.ceil(this.CACHE_DURATION / 1000), JSON.stringify(cacheData))
      console.log("[v0] Cached batch data to Redis")
    } catch (error) {
      console.error("[v0] Redis set error:", error)
    }
  }

  static async getQuote(symbol: string): Promise<CachedMarketData | null> {
    try {
      const redisClient = getRedisClient()
      const key = `${this.QUOTE_KEY_PREFIX}${symbol}`
      const cached = await redisClient.get(key)
      if (cached && typeof cached === "string") {
        const data = JSON.parse(cached) as CachedMarketData
        if (Date.now() - data.timestamp < this.CACHE_DURATION) {
          return data
        }
      }
      return null
    } catch (error) {
      console.error("[v0] Redis get error:", error)
      return null
    }
  }

  static async setQuote(symbol: string, data: any, synthetic = false): Promise<void> {
    try {
      const redisClient = getRedisClient()
      const key = `${this.QUOTE_KEY_PREFIX}${symbol}`
      const cacheData: CachedMarketData = {
        timestamp: Date.now(),
        data,
        synthetic,
      }
      await redisClient.setex(key, Math.ceil(this.CACHE_DURATION / 1000), JSON.stringify(cacheData))
    } catch (error) {
      console.error("[v0] Redis set error:", error)
    }
  }

  static async shouldFetchFreshData(): Promise<boolean> {
    const cached = await this.getBatchData()
    return !cached || Date.now() - cached.timestamp > this.CACHE_DURATION
  }

  static async setRateLimitStatus(blockedUntil: number): Promise<void> {
    try {
      const redisClient = getRedisClient()
      const statusData = JSON.stringify({ blockedUntil })
      await redisClient.setex(this.RATE_LIMIT_KEY, Math.ceil((blockedUntil - Date.now()) / 1000), statusData)
      console.log("[v0] Set rate limit status in Redis")
    } catch (error) {
      console.error("[v0] Redis rate limit set error:", error)
    }
  }

  static async getRateLimitStatus(): Promise<number | null> {
    try {
      const redisClient = getRedisClient()
      const status = await redisClient.get(this.RATE_LIMIT_KEY)
      if (status && typeof status === "string") {
        const parsedStatus = JSON.parse(status)
        if ("blockedUntil" in parsedStatus) {
          return parsedStatus.blockedUntil
        }
      }
      return null
    } catch (error) {
      console.error("[v0] Redis rate limit get error:", error)
      return null
    }
  }
}
