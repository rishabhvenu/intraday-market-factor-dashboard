"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SymbolData } from "@/lib/market-symbols"

interface HeatmapCellProps {
  symbolData: SymbolData
  onClick?: () => void
}

function HeatmapCell({ symbolData, onClick }: HeatmapCellProps) {
  const { symbol, changePercent } = symbolData

  const absChange = Math.abs(changePercent)
  const maxIntensity = 3 // Lowered threshold for more sensitive color changes
  const intensity = Math.min(absChange / maxIntensity, 1)

  const getBackgroundColor = () => {
    if (changePercent > 0) {
      // Green for positive changes with exponential scaling
      const scaledIntensity = Math.pow(intensity, 0.7) // Makes smaller changes more visible
      return `rgba(34, 197, 94, ${0.15 + scaledIntensity * 0.85})`
    } else if (changePercent < 0) {
      // Red for negative changes with exponential scaling
      const scaledIntensity = Math.pow(intensity, 0.7)
      return `rgba(239, 68, 68, ${0.15 + scaledIntensity * 0.85})`
    } else {
      return "rgba(156, 163, 175, 0.2)"
    }
  }

  const getTextColor = () => {
    if (intensity > 0.5) {
      return "text-white"
    }
    return changePercent >= 0 ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
  }

  const isAnomaly = absChange > 2.5

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-md",
        getTextColor(),
        isAnomaly && "ring-2 ring-yellow-400 ring-opacity-60", // Highlight anomalies
      )}
      style={{ backgroundColor: getBackgroundColor() }}
      onClick={() => onClick?.()}
    >
      {isAnomaly && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />}
      <div className="font-bold text-lg">{symbol}</div>
      <div className="text-sm font-medium">
        {changePercent >= 0 ? "+" : ""}
        {changePercent.toFixed(2)}%
      </div>
      <div className="text-xs opacity-75">${symbolData.price.toFixed(2)}</div>
    </div>
  )
}

interface PerformanceHeatmapProps {
  onSymbolClick?: (symbolData: SymbolData) => void
}

export function PerformanceHeatmap({ onSymbolClick }: PerformanceHeatmapProps) {
  const { snapshot, loading, error } = useMarketSnapshot()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading heatmap data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !snapshot?.symbols.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No data available for heatmap</p>
        </CardContent>
      </Card>
    )
  }

  const sortedSymbols = [...snapshot.symbols].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  const anomalies = snapshot.symbols.filter((s) => Math.abs(s.changePercent) > 2.5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Performance Heatmap
          {anomalies.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Color intensity represents magnitude of change. Anomalies &gt;2.5% highlighted with pulse indicator.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {sortedSymbols.map((symbolData) => (
            <HeatmapCell key={symbolData.symbol} symbolData={symbolData} onClick={() => onSymbolClick?.(symbolData)} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/80"></div>
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-400/40"></div>
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/80"></div>
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
            <span>Anomaly</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
