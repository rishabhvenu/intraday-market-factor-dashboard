"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SparklineChart } from "@/components/sparkline-chart"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { SymbolData } from "@/lib/market-symbols"
import { cn } from "@/lib/utils"

interface MarketOverviewCardProps {
  symbolData: SymbolData
  onClick?: () => void
}

export function MarketOverviewCard({ symbolData, onClick }: MarketOverviewCardProps) {
  const { symbol, name, type, price, change, changePercent, volume, data } = symbolData
  const isPositive = change >= 0
  const changeColor = isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
  const sparklineColor = isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"

  return (
    <Card
      className={cn(
        "min-w-[280px] cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2",
        onClick && "hover:bg-accent/50",
        isPositive ? "hover:border-green-500/50" : "hover:border-red-500/50",
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{symbol}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">{name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price and Change */}
        <div className="space-y-1">
          <div className="text-3xl font-bold">${price.toFixed(2)}</div>
          <div className={cn("flex items-center gap-1 text-sm font-medium", changeColor)}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {isPositive ? "+" : ""}
              {change.toFixed(2)} ({isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Sparkline Chart */}
        <div className="h-20 w-full">
          <SparklineChart data={data} color={sparklineColor} className="h-full w-full" />
        </div>

        {/* Volume */}
        <div className="text-xs text-muted-foreground">Vol: {(volume / 1000000).toFixed(1)}M</div>
      </CardContent>
    </Card>
  )
}
