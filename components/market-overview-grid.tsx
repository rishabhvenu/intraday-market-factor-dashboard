"use client"

import { MarketOverviewCard } from "@/components/market-overview-card"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SymbolData } from "@/lib/market-symbols"

interface MarketOverviewGridProps {
  onSymbolClick?: (symbolData: SymbolData) => void
}

export function MarketOverviewGrid({ onSymbolClick }: MarketOverviewGridProps) {
  const { snapshot, loading, error, refetch } = useMarketSnapshot()

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading market data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-muted-foreground">Failed to load market data</p>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!snapshot?.symbols.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No market data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {snapshot.symbols.map((symbolData) => (
        <MarketOverviewCard
          key={symbolData.symbol}
          symbolData={symbolData}
          onClick={() => onSymbolClick?.(symbolData)}
        />
      ))}
    </div>
  )
}
