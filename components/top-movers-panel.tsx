"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { TrendingUp, TrendingDown, Volume2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SymbolData } from "@/lib/market-symbols"

interface MoverItemProps {
  symbolData: SymbolData
  rank: number
  onClick?: () => void
}

function MoverItem({ symbolData, rank, onClick }: MoverItemProps) {
  const { symbol, name, price, change, changePercent, volume } = symbolData
  const isPositive = change >= 0

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onClick?.()}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">{rank}</div>
        <div>
          <div className="font-semibold">{symbol}</div>
          <div className="text-xs text-muted-foreground truncate max-w-32">{name}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold">${price.toFixed(2)}</div>
        <div
          className={cn(
            "flex items-center gap-1 text-sm",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

interface VolumeItemProps {
  symbolData: SymbolData
  rank: number
  onClick?: () => void
}

function VolumeItem({ symbolData, rank, onClick }: VolumeItemProps) {
  const { symbol, name, price, volume } = symbolData

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onClick?.()}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">{rank}</div>
        <div>
          <div className="font-semibold">{symbol}</div>
          <div className="text-xs text-muted-foreground truncate max-w-32">{name}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold">${price.toFixed(2)}</div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span>{(volume / 1000000).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  )
}

interface TopMoversProps {
  onSymbolClick?: (symbolData: SymbolData) => void
}

export function TopMoversPanel({ onSymbolClick }: TopMoversProps) {
  const { snapshot, loading, error } = useMarketSnapshot()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Movers</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading movers data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !snapshot?.symbols.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Movers</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Sort symbols for different categories
  const gainers = [...snapshot.symbols]
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)

  const losers = [...snapshot.symbols]
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)

  const byVolume = [...snapshot.symbols].sort((a, b) => b.volume - a.volume)

  const byVolatility = [...snapshot.symbols].sort((a, b) => {
    const volatilityA = Math.abs(a.changePercent)
    const volatilityB = Math.abs(b.changePercent)
    return volatilityB - volatilityA
  })

  const significantMoves = snapshot.symbols.filter((s) => Math.abs(s.changePercent) > 1.5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Top Movers
          <Badge variant="outline" className="text-xs">
            {snapshot.symbols.length} symbols
          </Badge>
          {significantMoves.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {significantMoves.length} significant
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="volatility" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="volatility" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Volatility
            </TabsTrigger>
            <TabsTrigger value="gainers" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="text-xs">
              <TrendingDown className="h-3 w-3 mr-1" />
              Losers
            </TabsTrigger>
            <TabsTrigger value="volume" className="text-xs">
              <Volume2 className="h-3 w-3 mr-1" />
              Volume
            </TabsTrigger>
          </TabsList>

          <TabsContent value="volatility" className="space-y-2 mt-4">
            {byVolatility.map((symbolData, index) => (
              <MoverItem
                key={symbolData.symbol}
                symbolData={symbolData}
                rank={index + 1}
                onClick={() => onSymbolClick?.(symbolData)}
              />
            ))}
          </TabsContent>

          <TabsContent value="gainers" className="space-y-2 mt-4">
            {gainers.length > 0 ? (
              gainers.map((symbolData, index) => (
                <MoverItem
                  key={symbolData.symbol}
                  symbolData={symbolData}
                  rank={index + 1}
                  onClick={() => onSymbolClick?.(symbolData)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">No gainers today</div>
            )}
          </TabsContent>

          <TabsContent value="losers" className="space-y-2 mt-4">
            {losers.length > 0 ? (
              losers.map((symbolData, index) => (
                <MoverItem
                  key={symbolData.symbol}
                  symbolData={symbolData}
                  rank={index + 1}
                  onClick={() => onSymbolClick?.(symbolData)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">No losers today</div>
            )}
          </TabsContent>

          <TabsContent value="volume" className="space-y-2 mt-4">
            {byVolume.map((symbolData, index) => (
              <VolumeItem
                key={symbolData.symbol}
                symbolData={symbolData}
                rank={index + 1}
                onClick={() => onSymbolClick?.(symbolData)}
              />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
