"use client"

import type { MarketSnapshot } from "@/lib/market-symbols"

class MarketSnapshotManager {
  private static instance: MarketSnapshotManager
  private snapshot: MarketSnapshot | null = null
  private loading = false
  private error: string | null = null
  private lastUpdate: Date | null = null
  private creditsExhausted = false
  private subscribers = new Set<() => void>()
  private pendingRequest: Promise<void> | null = null

  static getInstance(): MarketSnapshotManager {
    if (!MarketSnapshotManager.instance) {
      MarketSnapshotManager.instance = new MarketSnapshotManager()
    }
    return MarketSnapshotManager.instance
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback())
  }

  getState() {
    return {
      snapshot: this.snapshot,
      loading: this.loading,
      error: this.error,
      lastUpdate: this.lastUpdate,
      creditsExhausted: this.creditsExhausted,
    }
  }

  async fetchSnapshot(): Promise<void> {
    if (this.pendingRequest) {
      console.log("[v0] Deduplicating request - using existing pending request")
      return this.pendingRequest
    }

    if (this.creditsExhausted) {
      console.log("[v0] Skipping request - API credits exhausted")
      return
    }

    this.pendingRequest = this.performFetch()
    try {
      await this.pendingRequest
    } finally {
      this.pendingRequest = null
    }
  }

  private async performFetch(): Promise<void> {
    this.loading = true
    this.notifySubscribers()

    try {
      console.log("[v0] Making single market snapshot request")
      const response = await fetch("/api/market-snapshot")

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json().catch(() => ({}))
          if (data.creditsExhausted) {
            console.log("[v0] API credits exhausted - stopping all requests")
            this.creditsExhausted = true
            this.error = "API credits exhausted for today"
            this.notifySubscribers()
            return
          }
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      this.snapshot = data
      this.error = null
      this.lastUpdate = new Date()
      console.log(`[v0] Successfully loaded market snapshot with ${data.symbols?.length || 0} symbols`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Error fetching market snapshot:", errorMessage)
      this.error = errorMessage
    } finally {
      this.loading = false
      this.notifySubscribers()
    }
  }
}

export const marketSnapshotManager = MarketSnapshotManager.getInstance()
