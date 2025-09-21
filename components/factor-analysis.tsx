"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  fetchRealMarketData,
  extractIntradayFactors,
  calculateCorrelationMatrix,
  type MarketDataPoint,
  type FactorData,
} from "@/lib/market-data"
import { TrendingUp, TrendingDown, Activity, BarChart3, RefreshCw } from "lucide-react"

export function FactorAnalysis() {
  const [factorWindow, setFactorWindow] = useState([20])
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([])
  const [factorData, setFactorData] = useState<FactorData[]>([])
  const [correlationMatrix, setCorrelationMatrix] = useState<{ [key: string]: { [key: string]: number } }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [currentSymbol, setCurrentSymbol] = useState("AAPL")

  const memoizedFactorWindow = useMemo(() => factorWindow[0], [factorWindow[0]])

  const fetchAndProcessData = async (symbol: string = currentSymbol) => {
    setIsLoading(true)
    console.log("[v0] Fetching real market data for factor analysis:", symbol)

    try {
      const data = await fetchRealMarketData(symbol)
      const factors = extractIntradayFactors(data)

      setMarketData(data)
      setFactorData(factors)

      // Calculate correlation matrix
      const momentumSeries = factors.map((f) => f.momentum)
      const liquiditySeries = factors.map((f) => f.liquidity)
      const volatilitySeries = factors.map((f) => f.volatility)
      const priceSeries = data.slice(20).map((d) => d.close) // Align with factor data

      const correlations = calculateCorrelationMatrix({
        Momentum: momentumSeries,
        Liquidity: liquiditySeries,
        Volatility: volatilitySeries,
        Price: priceSeries,
      })

      setCorrelationMatrix(correlations)
      console.log(`[v0] Processed ${data.length} data points for factor analysis`)
    } catch (error) {
      console.error("[v0] Error in factor analysis:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate and process data
  useEffect(() => {
    fetchAndProcessData()
  }, [memoizedFactorWindow])

  const handleRefresh = () => {
    fetchAndProcessData()
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    return factorData.map((factor, index) => ({
      time: factor.timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      momentum: Number(factor.momentum.toFixed(3)),
      liquidity: Number(factor.liquidity.toFixed(3)),
      volatility: Number(factor.volatility.toFixed(3)),
      price: marketData[index + 20]?.close || 0,
    }))
  }, [factorData, marketData])

  // Calculate factor statistics
  const factorStats = useMemo(() => {
    if (factorData.length === 0) return null

    const momentum = factorData.map((f) => f.momentum)
    const liquidity = factorData.map((f) => f.liquidity)
    const volatility = factorData.map((f) => f.volatility)

    const calculateStats = (series: number[]) => ({
      mean: series.reduce((a, b) => a + b, 0) / series.length,
      std: Math.sqrt(
        series.reduce((sum, x) => sum + Math.pow(x - series.reduce((a, b) => a + b, 0) / series.length, 2), 0) /
          series.length,
      ),
      min: Math.min(...series),
      max: Math.max(...series),
    })

    return {
      momentum: calculateStats(momentum),
      liquidity: calculateStats(liquidity),
      volatility: calculateStats(volatility),
    }
  }, [factorData])

  const CorrelationHeatmap = ({ matrix }: { matrix: { [key: string]: { [key: string]: number } } }) => {
    const factors = Object.keys(matrix)

    return (
      <div className="grid grid-cols-4 gap-1 p-4">
        {factors.map((factor1) => (
          <div key={factor1} className="text-xs font-medium text-center p-2">
            {factor1}
          </div>
        ))}
        {factors.map((factor1) =>
          factors.map((factor2) => {
            const correlation = matrix[factor1]?.[factor2] || 0
            const intensity = Math.abs(correlation)
            const isPositive = correlation > 0

            return (
              <div
                key={`${factor1}-${factor2}`}
                className={`
                  aspect-square flex items-center justify-center text-xs font-mono rounded
                  ${isPositive ? "bg-chart-3" : "bg-chart-5"}
                `}
                style={{
                  opacity: intensity,
                  color: intensity > 0.5 ? "white" : "inherit",
                }}
                title={`${factor1} vs ${factor2}: ${correlation.toFixed(3)}`}
              >
                {correlation.toFixed(2)}
              </div>
            )
          }),
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Factor Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Factor Analysis Controls
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>Real-time factor extraction from {currentSymbol} market data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rolling Window Size: {factorWindow[0]} periods</Label>
            <Slider
              value={factorWindow}
              onValueChange={setFactorWindow}
              max={50}
              min={10}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
            <Button variant="outline" size="sm">
              Export Factors
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Factor Statistics */}
      {factorStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-chart-1" />
                Momentum Factor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mean:</span>
                <span className="font-mono">{factorStats.momentum.mean.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Std Dev:</span>
                <span className="font-mono">{factorStats.momentum.std.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-mono">
                  {factorStats.momentum.min.toFixed(2)} to {factorStats.momentum.max.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-2" />
                Liquidity Factor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mean:</span>
                <span className="font-mono">{factorStats.liquidity.mean.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Std Dev:</span>
                <span className="font-mono">{factorStats.liquidity.std.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-mono">
                  {factorStats.liquidity.min.toFixed(2)} to {factorStats.liquidity.max.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-chart-5" />
                Volatility Factor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mean:</span>
                <span className="font-mono">{factorStats.volatility.mean.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Std Dev:</span>
                <span className="font-mono">{factorStats.volatility.std.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Range:</span>
                <span className="font-mono">
                  {factorStats.volatility.min.toFixed(2)} to {factorStats.volatility.max.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Factor Visualization */}
      <Tabs defaultValue="timeseries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeseries">Time Series</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="timeseries">
          <Card>
            <CardHeader>
              <CardTitle>Factor Time Series</CardTitle>
              <CardDescription>Real-time intraday evolution of extracted factors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="momentum"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      name="Momentum"
                    />
                    <Line
                      type="monotone"
                      dataKey="liquidity"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                      name="Liquidity"
                    />
                    <Line
                      type="monotone"
                      dataKey="volatility"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={false}
                      name="Volatility"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle>Factor Correlation Matrix</CardTitle>
              <CardDescription>Cross-correlations between factors and price</CardDescription>
            </CardHeader>
            <CardContent>
              <CorrelationHeatmap matrix={correlationMatrix} />
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-chart-3 rounded"></div>
                  <span>Positive Correlation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-chart-5 rounded"></div>
                  <span>Negative Correlation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Factor Distributions</CardTitle>
              <CardDescription>Statistical distribution of factor values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {factorStats &&
                  Object.entries(factorStats).map(([factorName, stats]) => (
                    <div key={factorName} className="space-y-2">
                      <h4 className="text-sm font-medium capitalize">{factorName}</h4>
                      <div className="h-[100px] bg-muted rounded p-2 flex items-end justify-center">
                        <div className="text-xs text-muted-foreground">Distribution visualization</div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>μ:</span>
                          <span className="font-mono">{stats.mean.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>σ:</span>
                          <span className="font-mono">{stats.std.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
