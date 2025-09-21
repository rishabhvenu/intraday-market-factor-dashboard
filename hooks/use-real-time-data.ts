"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import {
  fetchRealMarketData,
  extractIntradayFactors,
  simulateFactorStrategy,
  type MarketDataPoint,
  type FactorData,
  type StrategyConfig,
  type StrategyResult,
} from "@/lib/market-data"

export interface RealTimeDataState {
  marketData: MarketDataPoint[]
  factorData: FactorData[]
  strategyResults: StrategyResult[]
  isLive: boolean
  lastUpdate: Date | null
  connectionStatus: "connected" | "disconnected" | "connecting"
  currentSymbol: string
  currentPrice: number | null
  priceChange: number | null
  priceChangePercent: number | null
  isManualRefresh: boolean
}

export function useRealTimeData(strategyConfig: StrategyConfig, updateInterval = 60000) {
  const [state, setState] = useState<RealTimeDataState>({
    marketData: [],
    factorData: [],
    strategyResults: [],
    isLive: true,
    lastUpdate: null,
    connectionStatus: "connected",
    currentSymbol: "AAPL",
    currentPrice: null,
    priceChange: null,
    priceChangePercent: null,
    isManualRefresh: false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingRef = useRef(false)

  const memoizedStrategyConfig = useMemo(
    () => ({
      momentumThreshold: strategyConfig.momentumThreshold,
      liquidityThreshold: strategyConfig.liquidityThreshold,
      volatilityThreshold: strategyConfig.volatilityThreshold,
      positionSize: strategyConfig.positionSize,
    }),
    [
      strategyConfig.momentumThreshold,
      strategyConfig.liquidityThreshold,
      strategyConfig.volatilityThreshold,
      strategyConfig.positionSize,
    ],
  )

  const updateData = useCallback(
    async (isManual = false) => {
      if (isUpdatingRef.current) {
        console.log("[v0] Skipping update - already in progress")
        return
      }

      isUpdatingRef.current = true
      console.log("[v0] Fetching real market data for", state.currentSymbol)

      if (isManual) {
        setState((prev) => ({ ...prev, connectionStatus: "connecting", isManualRefresh: true }))
      }

      try {
        const marketData = await fetchRealMarketData(state.currentSymbol)

        if (marketData.length > 0) {
          const factorData = extractIntradayFactors(marketData)
          const strategyResults = simulateFactorStrategy(marketData, factorData, memoizedStrategyConfig)

          setState((prev) => ({
            ...prev,
            marketData,
            factorData,
            strategyResults,
            currentPrice: marketData[marketData.length - 1].close,
            priceChange:
              marketData.length > 1
                ? marketData[marketData.length - 1].close - marketData[marketData.length - 2].close
                : null,
            priceChangePercent:
              marketData.length > 1
                ? ((marketData[marketData.length - 1].close - marketData[marketData.length - 2].close) /
                    marketData[marketData.length - 2].close) *
                  100
                : null,
            lastUpdate: new Date(),
            connectionStatus: "connected",
            isManualRefresh: false,
          }))

          console.log(`[v0] Updated with ${marketData.length} real data points`)
        } else {
          if (isManual) {
            setState((prev) => ({ ...prev, connectionStatus: "disconnected", isManualRefresh: false }))
          }
        }
      } catch (error) {
        console.error("[v0] Error updating real market data:", error)

        if (error instanceof Error) {
          if (error.message.includes("API requests are currently blocked")) {
            const timeMatch = error.message.match(/(\d+)s remaining/)
            const remainingTime = timeMatch ? timeMatch[1] : "unknown"

            toast({
              variant: "destructive",
              title: "Rate Limited",
              description: `API requests temporarily blocked due to rate limits. Resuming in ${remainingTime} seconds.`,
            })
          } else if (error.message.includes("429") || error.message.includes("rate limit")) {
            toast({
              variant: "destructive",
              title: "Rate Limited",
              description: "API rate limit exceeded. Data updates will resume automatically in a few minutes.",
            })
          } else {
            toast({
              variant: "destructive",
              title: "Data Update Failed",
              description: "Unable to fetch market data. Please try again later.",
            })
          }
        }

        if (isManual) {
          setState((prev) => ({ ...prev, connectionStatus: "disconnected", isManualRefresh: false }))
        }
      } finally {
        isUpdatingRef.current = false
      }
    },
    [state.currentSymbol, memoizedStrategyConfig],
  )

  const startLiveUpdates = useCallback(() => {
    console.log(`[v0] Starting live market data updates with ${updateInterval / 1000}s interval`)
    if (intervalRef.current) return

    setState((prev) => ({ ...prev, isLive: true }))

    updateData(false)

    intervalRef.current = setInterval(() => {
      updateData(false)
    }, updateInterval)
  }, [updateData, updateInterval])

  const stopLiveUpdates = useCallback(() => {
    console.log("[v0] Stopping live market data updates")
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setState((prev) => ({ ...prev, isLive: false }))
  }, [])

  const refreshData = useCallback(() => {
    console.log("[v0] Manually refreshing market data")
    updateData(true)
  }, [updateData])

  const changeSymbol = useCallback(
    (symbol: string) => {
      console.log("[v0] Changing symbol to", symbol)
      setState((prev) => ({ ...prev, currentSymbol: symbol.toUpperCase() }))
      updateData(true)
    },
    [updateData],
  )

  useEffect(() => {
    console.log("[v0] Cleaning up real-time data hook")
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    console.log("[v0] Initializing real market data feed with reduced frequency")

    setTimeout(() => {
      startLiveUpdates()
    }, 1000)
  }, [])

  return {
    ...state,
    startLiveUpdates,
    stopLiveUpdates,
    refreshData,
    changeSymbol,
  }
}
