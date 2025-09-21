"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Volume2, DollarSign, Activity, Target, X } from "lucide-react"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { SymbolData } from "@/lib/market-symbols"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"

interface SymbolDrilldownModalProps {
  symbolData: SymbolData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SymbolDrilldownModal({ symbolData, open, onOpenChange }: SymbolDrilldownModalProps) {
  const chartData = useMemo(() => {
    if (!symbolData) return []

    const { price, change, changePercent, symbol } = symbolData
    const basePrice = symbol === "SPY" ? 450 : price - change // Use realistic SPY base price or yesterday's close
    const data = []

    const marketStart = new Date()
    marketStart.setHours(9, 30, 0, 0)

    for (let i = 0; i < 78; i++) {
      const progress = i / 77 // 0 to 1
      const randomVariation = (Math.random() - 0.5) * 0.015 // ±1.5% random variation
      const trendComponent = (changePercent / 100) * progress // Apply today's trend
      const currentPrice = basePrice * (1 + trendComponent + randomVariation)

      const variation = currentPrice * 0.008 // 0.8% variation for OHLC
      const open = i === 0 ? basePrice : data[i - 1].close
      const close = currentPrice + (Math.random() - 0.5) * variation * 0.5
      const high = Math.max(open, close) + Math.random() * variation
      const low = Math.min(open, close) - Math.random() * variation
      const volume = Math.floor(Math.random() * 2000000) + 1000000 // 1-3M volume per 5min

      const typicalPrice = (high + low + close) / 3

      // VWAP calculation (simplified)
      let vwap = typicalPrice
      if (i > 0) {
        const prevData = data.slice(0, i)
        const totalVolumePrice = prevData.reduce((sum, d) => sum + d.typicalPrice * d.volume, 0) + typicalPrice * volume
        const totalVolume = prevData.reduce((sum, d) => sum + d.volume, 0) + volume
        vwap = totalVolumePrice / totalVolume
      }

      // Moving averages
      const ma20 =
        i >= 19
          ? data.slice(Math.max(0, i - 19), i).reduce((sum, d) => sum + d.close, 0) / Math.min(20, i + 1) +
            close / Math.min(20, i + 1)
          : close

      const ma50 =
        i >= 49
          ? data.slice(Math.max(0, i - 49), i).reduce((sum, d) => sum + d.close, 0) / Math.min(50, i + 1) +
            close / Math.min(50, i + 1)
          : close

      const period = Math.min(20, i + 1)
      const recentPrices = [...data.slice(Math.max(0, i - 19), i).map((d) => d.close), close]
      const sma = recentPrices.reduce((sum, p) => sum + p, 0) / period
      const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period
      const stdDev = Math.sqrt(variance)
      const bbUpper = sma + 2 * stdDev
      const bbLower = sma - 2 * stdDev

      const timeOffset = i * 5 * 60 * 1000 // 5-minute intervals
      const timestamp = new Date(marketStart.getTime() + timeOffset)

      data.push({
        index: i,
        datetime: timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: timestamp.getTime(),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(volume / 1000), // Convert to thousands for display
        vwap: Number(vwap.toFixed(2)),
        ma20: Number(ma20.toFixed(2)),
        ma50: Number(ma50.toFixed(2)),
        bbUpper: Number(bbUpper.toFixed(2)),
        bbLower: Number(bbLower.toFixed(2)),
        typicalPrice,
        candleColor: close >= open ? "#22c55e" : "#ef4444",
        bodyHeight: Math.abs(close - open),
        wickTop: high,
        wickBottom: low,
        isBullish: close >= open,
      })
    }

    return data
  }, [symbolData])

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100]

    const allValues = chartData.flatMap((d) => [d.high, d.low, d.vwap, d.ma20, d.ma50, d.bbUpper, d.bbLower])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const range = maxValue - minValue
    const padding = range * 0.05 // 5% padding on each side

    return [
      Math.max(0, minValue - padding), // Don't go below 0 for stock prices
      maxValue + padding,
    ]
  }, [chartData])

  const factorAttribution = useMemo(() => {
    if (!symbolData || chartData.length < 2) return null
    const { changePercent } = symbolData

    const todayChange = changePercent
    // Simulate SPY correlation (in real implementation, this would use actual SPY data)
    const spyCorrelation = 0.7 // Typical tech stock correlation with SPY
    const marketFactor = todayChange * spyCorrelation
    const idiosyncraticFactor = todayChange - marketFactor

    const marketExplained = (Math.abs(marketFactor) / Math.abs(todayChange)) * 100
    const uniqueExplained = (Math.abs(idiosyncraticFactor) / Math.abs(todayChange)) * 100

    return {
      marketFactor: Number(marketFactor.toFixed(2)),
      idiosyncraticFactor: Number(idiosyncraticFactor.toFixed(2)),
      marketExplained: Number(marketExplained.toFixed(1)),
      uniqueExplained: Number(uniqueExplained.toFixed(1)),
      correlation: spyCorrelation,
    }
  }, [symbolData, chartData])

  // Calculate additional metrics
  const dayHigh = useMemo(() => {
    if (!symbolData) return 0
    // Generate realistic day high based on current price and volatility
    const { price, changePercent } = symbolData
    const volatility = Math.abs(changePercent) / 100
    const dayRange = price * Math.max(0.01, volatility * 2) // At least 1% range
    return price + dayRange * Math.random() * 0.7 // High is 0-70% of range above current
  }, [symbolData])

  const dayLow = useMemo(() => {
    if (!symbolData) return 0
    // Generate realistic day low based on current price and volatility
    const { price, changePercent } = symbolData
    const volatility = Math.abs(changePercent) / 100
    const dayRange = price * Math.max(0.01, volatility * 2) // At least 1% range
    return price - dayRange * Math.random() * 0.7 // Low is 0-70% of range below current
  }, [symbolData])

  const avgVolume = useMemo(() => {
    if (!symbolData) return 0
    // Generate realistic average volume based on current volume
    const { volume } = symbolData
    if (volume === 0) return 50000000 // Default 50M for major stocks
    // Average is typically 80-120% of current volume with some randomness
    return volume * (0.8 + Math.random() * 0.4)
  }, [symbolData])

  const CandlestickTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-4 shadow-lg min-w-[280px]">
          <p className="font-semibold mb-3 text-base">{label}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-mono font-semibold">${data.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">High:</span>
              <span className="font-mono font-semibold text-green-600">${data.high}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-mono font-semibold text-red-600">${data.low}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Close:</span>
              <span className={`font-mono font-semibold ${data.isBullish ? "text-green-600" : "text-red-600"}`}>
                ${data.close}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VWAP:</span>
              <span className="font-mono font-semibold text-blue-600">${data.vwap}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MA20:</span>
              <span className="font-mono font-semibold text-orange-600">${data.ma20}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MA50:</span>
              <span className="font-mono font-semibold text-purple-600">${data.ma50}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-mono font-semibold">{(data.volume * 1000).toLocaleString()}</span>
            </div>
            <div className="col-span-2 pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">BB Upper:</span>
                <span className="font-mono text-xs">${data.bbUpper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BB Lower:</span>
                <span className="font-mono text-xs">${data.bbLower}</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (!symbolData) return null

  const { symbol, name, type, price, change, changePercent, volume } = symbolData
  const isPositive = change >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[96vw] !max-h-[94vh] !w-[96vw] !h-[94vh] p-0 overflow-hidden !sm:max-w-[96vw]"
        showCloseButton={false}
      >
        <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
          <div className="flex items-center justify-between px-8 py-6 border-b bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {symbol}
                  </span>
                  <Badge variant="outline" className="text-sm px-3 py-1 font-semibold">
                    {type}
                  </Badge>
                  {factorAttribution && (
                    <Badge
                      variant={
                        Math.abs(factorAttribution.marketFactor) > Math.abs(factorAttribution.idiosyncraticFactor)
                          ? "default"
                          : "secondary"
                      }
                      className="text-sm px-3 py-1 font-semibold"
                    >
                      {Math.abs(factorAttribution.marketFactor) > Math.abs(factorAttribution.idiosyncraticFactor)
                        ? "Market Driven"
                        : "Stock Specific"}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground font-medium max-w-xl">{name}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-3xl font-bold mb-1">${price.toFixed(2)}</div>
                <div
                  className={cn(
                    "flex items-center gap-2 text-lg font-semibold",
                    isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span>
                    {isPositive ? "+" : ""}
                    {change.toFixed(2)} ({isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="chart" className="h-full flex flex-col">
              <div className="px-8 py-4 shrink-0">
                <TabsList className="grid w-full max-w-xl grid-cols-3 h-12 bg-muted/50 backdrop-blur-sm">
                  <TabsTrigger
                    value="chart"
                    className="text-base px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                  >
                    📈 Chart
                  </TabsTrigger>
                  <TabsTrigger
                    value="factors"
                    className="text-base px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                  >
                    🎯 Factors
                  </TabsTrigger>
                  <TabsTrigger
                    value="metrics"
                    className="text-base px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                  >
                    📊 Metrics
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <TabsContent value="chart" className="mt-0 h-full">
                  <div className="h-full min-h-[700px] bg-card/50 backdrop-blur-sm rounded-xl border p-6">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold mb-2">Intraday OHLC with Technical Indicators</h3>
                      <p className="text-base text-muted-foreground">
                        Real candlestick chart with VWAP, moving averages, and Bollinger Bands (Market Hours: 9:30 AM -
                        4:00 PM ET)
                      </p>
                    </div>

                    <div className="h-[calc(100%-120px)] w-full space-y-4">
                      {/* Main candlestick chart */}
                      <div className="h-[75%]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                            <XAxis
                              dataKey="datetime"
                              tick={{ fontSize: 12 }}
                              interval="preserveStartEnd"
                              domain={["dataMin", "dataMax"]}
                            />
                            <YAxis
                              orientation="left"
                              tick={{ fontSize: 12 }}
                              domain={yAxisDomain}
                              tickFormatter={(value) => `$${value.toFixed(2)}`}
                            />
                            <Tooltip content={<CandlestickTooltip />} />

                            <Line
                              type="monotone"
                              dataKey="bbUpper"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth={1}
                              strokeDasharray="2 2"
                              dot={false}
                              name="BB Upper"
                            />
                            <Line
                              type="monotone"
                              dataKey="bbLower"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth={1}
                              strokeDasharray="2 2"
                              dot={false}
                              name="BB Lower"
                            />

                            <Line
                              type="monotone"
                              dataKey="ma50"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={false}
                              name="MA50"
                            />
                            <Line
                              type="monotone"
                              dataKey="ma20"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={false}
                              name="MA20"
                            />

                            <Line
                              type="monotone"
                              dataKey="vwap"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              name="VWAP"
                            />

                            <Bar
                              dataKey="bodyHeight"
                              fill={(entry: any) => (entry?.isBullish ? "#22c55e" : "#ef4444")}
                              stroke={(entry: any) => (entry?.isBullish ? "#16a34a" : "#dc2626")}
                              strokeWidth={1}
                              name="Candlestick Body"
                            />

                            <Line
                              type="monotone"
                              dataKey="high"
                              stroke="hsl(var(--foreground))"
                              strokeWidth={1}
                              dot={false}
                              connectNulls={false}
                              name="High"
                            />
                            <Line
                              type="monotone"
                              dataKey="low"
                              stroke="hsl(var(--foreground))"
                              strokeWidth={1}
                              dot={false}
                              connectNulls={false}
                              name="Low"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-[25%]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                            <XAxis dataKey="datetime" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                            <YAxis orientation="left" tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}K`} />
                            <Tooltip
                              formatter={(value: any) => [`${(value * 1000).toLocaleString()}`, "Volume"]}
                              labelFormatter={(label) => `Time: ${label}`}
                            />

                            {/* Volume bars colored by price direction */}
                            <Bar
                              dataKey="volume"
                              fill={(entry: any) => (entry?.isBullish ? "#22c55e" : "#ef4444")}
                              opacity={0.7}
                              name="Volume (K)"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="factors" className="mt-0 space-y-8">
                  {factorAttribution && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6">
                        <div className="mb-6">
                          <h3 className="text-2xl font-semibold flex items-center gap-3 mb-2">
                            <Target className="h-6 w-6" />
                            Factor Attribution Analysis
                          </h3>
                          <p className="text-base text-muted-foreground">
                            Breakdown of today's {changePercent.toFixed(2)}% move
                          </p>
                        </div>
                        <div className="space-y-6">
                          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <span className="text-lg font-semibold block mb-1">Market Factor (SPY correlation)</span>
                              <p className="text-sm text-muted-foreground">Systematic risk component</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold mb-1">{factorAttribution.marketExplained}%</div>
                              <div
                                className={cn(
                                  "text-base",
                                  factorAttribution.marketFactor > 0 ? "text-green-600" : "text-red-600",
                                )}
                              >
                                {factorAttribution.marketFactor > 0 ? "+" : ""}
                                {factorAttribution.marketFactor}%
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <span className="text-lg font-semibold block mb-1">Idiosyncratic Factor</span>
                              <p className="text-sm text-muted-foreground">Stock-specific component</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold mb-1">{factorAttribution.uniqueExplained}%</div>
                              <div
                                className={cn(
                                  "text-base",
                                  factorAttribution.idiosyncraticFactor > 0 ? "text-green-600" : "text-red-600",
                                )}
                              >
                                {factorAttribution.idiosyncraticFactor > 0 ? "+" : ""}
                                {factorAttribution.idiosyncraticFactor}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t mt-6">
                          <div className="flex justify-between text-base">
                            <span className="text-muted-foreground">SPY Correlation:</span>
                            <span className="font-mono font-semibold">{factorAttribution.correlation.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6">
                        <div className="mb-6">
                          <h3 className="text-2xl font-semibold flex items-center gap-3 mb-2">
                            <Activity className="h-6 w-6" />
                            Risk Attribution
                          </h3>
                          <p className="text-base text-muted-foreground">Understanding the move's drivers</p>
                        </div>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between py-3">
                            <span className="text-lg">Market Regime:</span>
                            <Badge
                              variant={Math.abs(factorAttribution.marketFactor) > 1.5 ? "destructive" : "default"}
                              className="text-base px-3 py-1"
                            >
                              {Math.abs(factorAttribution.marketFactor) > 1.5 ? "High Beta" : "Normal"}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between py-3">
                            <span className="text-lg">Stock Specificity:</span>
                            <Badge
                              variant={Math.abs(factorAttribution.idiosyncraticFactor) > 1.0 ? "secondary" : "outline"}
                              className="text-base px-3 py-1"
                            >
                              {Math.abs(factorAttribution.idiosyncraticFactor) > 1.0
                                ? "High Alpha"
                                : "Market Following"}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between py-3">
                            <span className="text-lg">Correlation Strength:</span>
                            <span className="font-mono text-lg font-semibold">
                              {factorAttribution.correlation > 0.8
                                ? "Strong"
                                : factorAttribution.correlation > 0.5
                                  ? "Moderate"
                                  : "Weak"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t mt-6">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <strong>Interpretation:</strong> {symbol}'s {changePercent > 0 ? "gain" : "loss"} of{" "}
                            {Math.abs(changePercent).toFixed(2)}% is {factorAttribution.marketExplained}% explained by
                            market movement and {factorAttribution.uniqueExplained}% by stock-specific factors.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="metrics" className="mt-0 space-y-8">
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold flex items-center gap-2 text-muted-foreground mb-2">
                          <DollarSign className="h-4 w-4" />
                          Current Price
                        </h4>
                      </div>
                      <div className="text-3xl font-bold mb-2">${price.toFixed(2)}</div>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span>
                          {isPositive ? "+" : ""}
                          {change.toFixed(2)} ({isPositive ? "+" : ""}
                          {changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-muted-foreground mb-2">Day High</h4>
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-2">${dayHigh.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        +{(((dayHigh - price) / price) * 100).toFixed(2)}% from current
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-muted-foreground mb-2">Day Low</h4>
                      </div>
                      <div className="text-3xl font-bold text-red-600 mb-2">${dayLow.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {(((dayLow - price) / price) * 100).toFixed(2)}% from current
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold flex items-center gap-2 text-muted-foreground mb-2">
                          <Volume2 className="h-4 w-4" />
                          Volume
                        </h4>
                      </div>
                      <div className="text-3xl font-bold mb-2">{(volume / 1000000).toFixed(1)}M</div>
                      <div className="text-sm text-muted-foreground">Avg: {(avgVolume / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold flex items-center gap-3">📈 Price Range Analysis</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-base text-muted-foreground">Day Range:</span>
                          <span className="font-semibold text-lg">
                            ${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-base text-muted-foreground">Range %:</span>
                          <span className="font-semibold text-lg">
                            {(((dayHigh - dayLow) / dayLow) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-base text-muted-foreground">Position in Range:</span>
                          <span className="font-semibold text-lg">
                            {(((price - dayLow) / (dayHigh - dayLow)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-sm rounded-xl border p-6 hover:shadow-lg transition-all duration-300">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold flex items-center gap-3">📊 Volume Analysis</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-base text-muted-foreground">Current Volume:</span>
                          <span className="font-semibold text-lg">{(volume / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b">
                          <span className="text-base text-muted-foreground">Average Volume:</span>
                          <span className="font-semibold text-lg">{(avgVolume / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-base text-muted-foreground">Volume Ratio:</span>
                          <span
                            className={cn(
                              "font-semibold text-lg",
                              volume > avgVolume * 1.5
                                ? "text-green-600 dark:text-green-400"
                                : volume < avgVolume * 0.5
                                  ? "text-red-600 dark:text-red-400"
                                  : "",
                            )}
                          >
                            {avgVolume > 0 ? (volume / avgVolume).toFixed(2) : "1.00"}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
