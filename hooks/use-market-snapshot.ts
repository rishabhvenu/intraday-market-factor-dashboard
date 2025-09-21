"use client"

import { useState, useEffect } from "react"
import { marketSnapshotManager } from "@/lib/market-snapshot-manager"
import { useToast } from "@/hooks/use-toast"

export function useMarketSnapshot() {
  const [state, setState] = useState(marketSnapshotManager.getState())
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = marketSnapshotManager.subscribe(() => {
      setState(marketSnapshotManager.getState())
    })

    const currentState = marketSnapshotManager.getState()
    const shouldFetch = !currentState.lastUpdate || Date.now() - currentState.lastUpdate.getTime() > 5 * 60 * 1000

    if (shouldFetch && !currentState.loading && !currentState.creditsExhausted) {
      console.log("[v0] Triggering initial fetch for market snapshot")
      marketSnapshotManager.fetchSnapshot()
    }

    return unsubscribe
  }, [])

  useEffect(() => {
    if (state.creditsExhausted && state.error?.includes("exhausted")) {
      toast({
        title: "API Credits Exhausted",
        description: "Daily API limit reached. Service will resume tomorrow.",
        variant: "destructive",
      })
    }
  }, [state.creditsExhausted, state.error, toast])

  return {
    snapshot: state.snapshot,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    isStale: state.lastUpdate ? Date.now() - state.lastUpdate.getTime() > 10 * 60 * 1000 : false,
    creditsExhausted: state.creditsExhausted,
    refetch: () => marketSnapshotManager.fetchSnapshot(),
  }
}
