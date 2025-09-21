// Global API request cache and deduplication system
interface CacheEntry {
  data: any
  timestamp: number
  promise?: Promise<any>
}

import { globalRequestQueue } from "./global-request-queue"

class APICache {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 2700000 // 45 minutes in milliseconds
  private readonly MIN_REQUEST_INTERVAL = 2700000 // 45 minutes between requests

  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&")
    return `${endpoint}?${sortedParams}`
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION
  }

  private canMakeRequest(cacheKey: string): boolean {
    if (globalRequestQueue.isBlocked()) {
      return false
    }

    const entry = this.cache.get(cacheKey)
    if (!entry) return true
    return Date.now() - entry.timestamp > this.MIN_REQUEST_INTERVAL
  }

  async get<T>(endpoint: string, params: Record<string, any> = {}, fetcher: () => Promise<T>): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params)
    const entry = this.cache.get(cacheKey)

    // Return cached data if still valid
    if (entry && !this.isExpired(entry.timestamp)) {
      console.log(`[v0] Using cached data for ${cacheKey}`)
      return entry.data
    }

    // Return existing promise if request is in flight
    if (entry?.promise) {
      console.log(`[v0] Request already in flight for ${cacheKey}`)
      return entry.promise
    }

    // Check if we can make a new request
    if (!this.canMakeRequest(cacheKey)) {
      if (globalRequestQueue.isBlocked()) {
        if (entry?.data) {
          console.log(`[v0] Returning stale data due to global block for ${cacheKey}`)
          return entry.data
        }
        const remainingMs = globalRequestQueue.getRemainingBlockTime()
        throw new Error(`All API requests blocked due to rate limit. Wait ${Math.ceil(remainingMs / 1000)} seconds`)
      }

      const waitTime = this.MIN_REQUEST_INTERVAL - (Date.now() - (entry?.timestamp || 0))
      console.log(`[v0] Rate limited: must wait ${Math.ceil(waitTime / 1000)}s before next request to ${cacheKey}`)

      if (entry?.data) {
        console.log(`[v0] Returning stale data for ${cacheKey}`)
        return entry.data
      }
      throw new Error(`Rate limited: wait ${Math.ceil(waitTime / 1000)} seconds`)
    }

    console.log(`[v0] Queueing API request to ${cacheKey}`)
    const promise = globalRequestQueue.enqueue(fetcher, `${endpoint} (${JSON.stringify(params)})`)

    // Store promise to prevent duplicate requests
    this.cache.set(cacheKey, {
      data: entry?.data || null,
      timestamp: entry?.timestamp || 0,
      promise,
    })

    try {
      const data = await promise

      // Update cache with successful result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        promise: undefined,
      })

      console.log(`[v0] Successfully cached data for ${cacheKey}`)
      return data
    } catch (error) {
      // Remove failed promise from cache
      if (entry) {
        this.cache.set(cacheKey, {
          data: entry.data,
          timestamp: entry.timestamp,
          promise: undefined,
        })
      } else {
        this.cache.delete(cacheKey)
      }
      throw error
    }
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): { size: number; entries: Array<{ key: string; age: number; hasData: boolean }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      hasData: !!entry.data,
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }
}

// Global singleton instance
export const apiCache = new APICache()

export async function getCachedData(key: string): Promise<any | null> {
  const entry = apiCache["cache"].get(key)
  if (entry && !apiCache["isExpired"](entry.timestamp)) {
    return entry.data
  }
  return null
}

export async function setCachedData(key: string, data: any): Promise<void> {
  apiCache["cache"].set(key, {
    data,
    timestamp: Date.now(),
    promise: undefined,
  })
}
