"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { useRealTimeData } from "@/hooks/use-real-time-data"
import { TrendingUp, TrendingDown, Volume2, Activity, BarChart3, Zap, Play, Pause, RefreshCw } from "lucide-react"

interface CandlestickData {
  time: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
}

interface MarketChartProps {
  selectedSymbol?: string
}

export function MarketChart({ selectedSymbol = "AAPL" }: MarketChartProps) {
  const [timeframe, setTimeframe] = useState("1m")
  const [chartType, setChartType] = useState("candlestick")

  const strategyConfig = useMemo(
    () => ({
      momentumThreshold: 0.5,
      liquidityThreshold: 0.3,
      volatilityThreshold: 0.8,
      positionSize: 1000,
    }),
    [],
  )

  const {
    marketData,
    factorData,
    isLive,
    lastUpdate,
    connectionStatus,
    currentSymbol,
    currentPrice,
    priceChange,
    priceChangePercent,
    startLiveUpdates,
    stopLiveUpdates,
    refreshData,
    changeSymbol,
    isManualRefresh,
  } = useRealTimeData(strategyConfig, selectedSymbol) // Pass selectedSymbol to hook

  // Prepare candlestick chart data
  const candlestickData: CandlestickData[] = useMemo(() => {
    return marketData.map((point, index) => {
      const prevClose = index > 0 ? marketData[index - 1].close : point.open
      const change = point.close - prevClose
      const changePercent = (change / prevClose) * 100

      return {
        time: point.timestamp.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        timestamp: point.timestamp.getTime(),
        open: Number(point.open.toFixed(2)),
        high: Number(point.high.toFixed(2)),
        low: Number(point.low.toFixed(2)),
        close: Number(point.close.toFixed(2)),
        volume: point.volume,
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
      }
    })
  }, [marketData])

  // Prepare combined chart data with factors
  const combinedData = useMemo(() => {
    return candlestickData.map((candle, index) => {
      const factor = factorData[Math.max(0, index - 20)] // Align with factor calculation offset
      return {
        ...candle,
        momentum: factor?.momentum || 0,
        liquidity: factor?.liquidity || 0,
        volatility: factor?.volatility || 0,
      }
    })
  }, [candlestickData, factorData])

  // Calculate market statistics
  const marketStats = useMemo(() => {
    if (candlestickData.length === 0) return null

    const prices = candlestickData.map((d) => d.close)
    const volumes = candlestickData.map((d) => d.volume)

    const currentPriceFromData = prices[prices.length - 1]
    const openPrice = candlestickData[0].open
    const dayChange = currentPriceFromData - openPrice
    const dayChangePercent = (dayChange / openPrice) * 100

    const high = Math.max(...candlestickData.map((d) => d.high))
    const low = Math.min(...candlestickData.map((d) => d.low))
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length

    return {
      currentPrice: currentPrice || currentPriceFromData,
      dayChange: priceChange || dayChange,
      dayChangePercent: priceChangePercent || dayChangePercent,
      high,
      low,
      avgVolume,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
    }
  }, [candlestickData, currentPrice, priceChange, priceChangePercent])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-mono">${data.open}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="font-mono">${data.high}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-mono">${data.low}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-mono">${data.close}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-mono">{(data.volume / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Change:</span>
              <span className={`font-mono ${data.changePercent > 0 ? "text-chart-3" : "text-chart-5"}`}>
                {data.changePercent > 0 ? "+" : ""}
                {data.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Market Statistics */}
      {marketStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">${marketStats.currentPrice.toFixed(2)}</div>
              <div
                className={`text-sm flex items-center gap-1 ${
                  marketStats.dayChangePercent > 0 ? "text-chart-3" : "text-chart-5"
                }`}
              >
                {marketStats.dayChangePercent > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {marketStats.dayChangePercent > 0 ? "+" : ""}
                {marketStats.dayChangePercent.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Day Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono">
                ${marketStats.low.toFixed(2)} - ${marketStats.high.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Range: ${(marketStats.high - marketStats.low).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono">{(marketStats.totalVolume / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">Avg: {(marketStats.avgVolume / 1000).toFixed(0)}K</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Volatility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-chart-5">
                {(((marketStats.high - marketStats.low) / marketStats.currentPrice) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Intraday range</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Momentum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-chart-1">
                {factorData.length > 0 ? factorData[factorData.length - 1].momentum.toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-muted-foreground">Current factor</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Chart - {selectedSymbol}
                {isLive && (
                  <div className="flex items-center gap-1 text-xs text-chart-3">
                    <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                    LIVE
                  </div>
                )}
              </CardTitle>
              <CardDescription>Real-time price and volume analysis</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={isLive ? stopLiveUpdates : startLiveUpdates}>
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isManualRefresh}>
                <RefreshCw className={`h-4 w-4 ${isManualRefresh ? "animate-spin" : ""}`} />
              </Button>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1m</SelectItem>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="price" className="space-y-4">
            <TabsList>
              <TabsTrigger value="price">Price Action</TabsTrigger>
              <TabsTrigger value="volume">Volume Profile</TabsTrigger>
              <TabsTrigger value="factors">Factor Overlay</TabsTrigger>
            </TabsList>

            <TabsContent value="price">
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "candlestick" ? (
                    <ComposedChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                      <YAxis domain={["dataMin - 10", "dataMax + 10"]} className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="volume" fill="hsl(var(--muted))" opacity={0.3} yAxisId="volume" />
                      {/* Candlestick representation using composed chart */}
                      <Line
                        type="monotone"
                        dataKey="close"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1}
                        dot={false}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  ) : chartType === "line" ? (
                    <ComposedChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  ) : (
                    <AreaChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="volume">
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="price" orientation="right" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="volume" className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="volume" dataKey="volume" fill="hsl(var(--chart-2))" opacity={0.7} />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="factors">
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="price" orientation="right" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="factor" className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Price"
                    />
                    <Line
                      yAxisId="factor"
                      type="monotone"
                      dataKey="momentum"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={1}
                      dot={false}
                      name="Momentum"
                    />
                    <Line
                      yAxisId="factor"
                      type="monotone"
                      dataKey="liquidity"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={1}
                      dot={false}
                      name="Liquidity"
                    />
                    <Line
                      yAxisId="factor"
                      type="monotone"
                      dataKey="volatility"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={1}
                      dot={false}
                      name="Volatility"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
