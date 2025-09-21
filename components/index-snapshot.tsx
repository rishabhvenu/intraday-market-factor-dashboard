"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { TrendingUp, TrendingDown, Activity, Zap, Loader2, AlertTriangle, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import { useState } from "react"

interface IndexCardProps {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  isSpecial?: boolean
  sparklineData?: Array<{ value: number }>
  yearAverage?: number
}

function IndexCard({
  symbol,
  name,
  price,
  change,
  changePercent,
  isSpecial,
  sparklineData,
  yearAverage,
}: IndexCardProps) {
  const isPositive = change >= 0
  const changeColor = isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"

  const getVixRegime = (vixLevel: number) => {
    if (vixLevel < 15) return { label: "Complacency", color: "bg-blue-500", alert: false }
    if (vixLevel < 20) return { label: "Low Vol", color: "bg-green-500", alert: false }
    if (vixLevel < 30) return { label: "Elevated", color: "bg-yellow-500", alert: true }
    if (vixLevel < 40) return { label: "High Fear", color: "bg-orange-500", alert: true }
    return { label: "Panic Mode", color: "bg-red-500", alert: true }
  }

  const vixRegime = isSpecial ? getVixRegime(price) : null

  const vsYearAverage = yearAverage ? ((price - yearAverage) / yearAverage) * 100 : null

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isSpecial && "border-primary/50",
        vixRegime?.alert && "border-orange-500/50",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{symbol}</CardTitle>
          {isSpecial && (
            <div className="flex items-center gap-2">
              {vixRegime?.alert && <AlertTriangle className="h-3 w-3 text-orange-500" />}
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                VIX
              </Badge>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{name}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold font-mono">${price.toFixed(2)}</div>
          {sparklineData && (
            <div className="w-20 h-12 border rounded">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <div className="bg-background border rounded px-2 py-1 text-xs">
                            ${payload[0].value?.toFixed(2)}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-1 text-sm", changeColor)}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>
            {isPositive ? "+" : ""}
            {change.toFixed(2)} ({isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>

        {vsYearAverage !== null && (
          <div className="text-xs text-muted-foreground">
            vs 1Y avg: {vsYearAverage > 0 ? "+" : ""}
            {vsYearAverage.toFixed(1)}%
          </div>
        )}

        {isSpecial && vixRegime && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Market Regime</div>
              <Badge variant={vixRegime.alert ? "destructive" : "secondary"} className="text-xs">
                {vixRegime.label}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn("h-2 rounded-full transition-all", vixRegime.color)}
                style={{ width: `${Math.min((price / 50) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {price < 15
                ? "Institutional complacency - watch for reversals"
                : price < 20
                  ? "Normal market conditions"
                  : price < 30
                    ? "Elevated uncertainty - risk management mode"
                    : price < 40
                      ? "High fear - contrarian opportunities"
                      : "Panic selling - extreme dislocation"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function IndexSnapshot() {
  const { snapshot, loading, error } = useMarketSnapshot()
  const [exportFormat, setExportFormat] = useState<"csv" | "png">("csv")

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading index data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !snapshot?.symbols.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No index data available</p>
        </CardContent>
      </Card>
    )
  }

  const spyData = snapshot.symbols.find((s) => s.symbol === "SPY")
  const qqqData = snapshot.symbols.find((s) => s.symbol === "QQQ")

  // Mock data for IWM and DIA since they're not in the current API response
  const iwmData = {
    symbol: "IWM",
    name: "iShares Russell 2000 ETF",
    price: 198.45,
    change: -1.23,
    changePercent: -0.62,
  }

  const diaData = {
    symbol: "DIA",
    name: "SPDR Dow Jones Industrial Average ETF",
    price: 434.12,
    change: 2.87,
    changePercent: 0.67,
  }

  const vixData = {
    symbol: "VIX",
    name: "CBOE Volatility Index",
    price: 23.45,
    change: 1.32,
    changePercent: 5.97,
    yearAverage: 19.8, // 1Y average for comparison
  }

  const generateSparklineData = (basePrice: number, volatility = 0.02) => {
    return Array.from({ length: 30 }, (_, i) => ({
      value: basePrice * (1 + (Math.random() - 0.5) * volatility * (i / 15)),
      time: `${9 + Math.floor(i / 4)}:${(i % 4) * 15 || "00"}`,
    }))
  }

  const breadthData = [
    { name: "Advancing", value: 312, color: "#22c55e" },
    { name: "Declining", value: 188, color: "#ef4444" },
  ]

  const advancingRatio = 312 / (312 + 188)

  const getMarketRegime = () => {
    const breadthStrong = advancingRatio > 0.6
    const volatilityElevated = vixData.price > 20
    const momentum = (spyData?.changePercent || 0) + (qqqData?.changePercent || 0) / 2

    if (breadthStrong && !volatilityElevated && momentum > 0) {
      return "Market leaning bullish (breadth strong, volatility low)"
    } else if (breadthStrong && volatilityElevated && momentum > 0) {
      return "Market leaning bullish (breadth strong, volatility elevated)"
    } else if (!breadthStrong && volatilityElevated) {
      return "Market leaning bearish (breadth weak, volatility elevated)"
    } else {
      return "Market neutral (mixed signals across indicators)"
    }
  }

  const handleExport = (format: "csv" | "png") => {
    if (format === "csv") {
      const csvData = [
        ["Symbol", "Name", "Price", "Change", "Change%"],
        ["SPY", "SPDR S&P 500 ETF", spyData?.price || 0, spyData?.change || 0, spyData?.changePercent || 0],
        ["QQQ", "Invesco QQQ Trust", qqqData?.price || 0, qqqData?.change || 0, qqqData?.changePercent || 0],
        ["IWM", "iShares Russell 2000 ETF", iwmData.price, iwmData.change, iwmData.changePercent],
        ["DIA", "SPDR Dow Jones Industrial Average ETF", diaData.price, diaData.change, diaData.changePercent],
        ["VIX", "CBOE Volatility Index", vixData.price, vixData.change, vixData.changePercent],
      ]

      const csvContent = csvData.map((row) => row.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `index-snapshot-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Index Snapshot</h3>
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="space-y-4">
        {spyData && (
          <IndexCard
            symbol={spyData.symbol}
            name="SPDR S&P 500 ETF"
            price={spyData.price}
            change={spyData.change}
            changePercent={spyData.changePercent}
            sparklineData={generateSparklineData(spyData.price)}
          />
        )}

        {qqqData && (
          <IndexCard
            symbol={qqqData.symbol}
            name="Invesco QQQ Trust"
            price={qqqData.price}
            change={qqqData.change}
            changePercent={qqqData.changePercent}
            sparklineData={generateSparklineData(qqqData.price)}
          />
        )}

        <IndexCard
          symbol={iwmData.symbol}
          name={iwmData.name}
          price={iwmData.price}
          change={iwmData.change}
          changePercent={iwmData.changePercent}
          sparklineData={generateSparklineData(iwmData.price)}
        />

        <IndexCard
          symbol={diaData.symbol}
          name={diaData.name}
          price={diaData.price}
          change={diaData.change}
          changePercent={diaData.changePercent}
          sparklineData={generateSparklineData(diaData.price)}
        />

        {/* Enhanced VIX with regime analysis */}
        <IndexCard
          symbol={vixData.symbol}
          name={vixData.name}
          price={vixData.price}
          change={vixData.change}
          changePercent={vixData.changePercent}
          isSpecial={true}
          sparklineData={generateSparklineData(vixData.price, 0.05)}
          yearAverage={vixData.yearAverage}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Market Internals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Advancing vs Declining Stocks</div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breadthData} layout="horizontal">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <div className="bg-background border rounded px-2 py-1 text-xs">
                            {payload[0].payload.name}: {payload[0].value} stocks
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" fill={(entry) => entry.color} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">A/D Ratio:</span>
                <span className="font-mono text-green-600">1.66</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">vs 1Y avg:</span>
                <span className="font-mono text-green-600">+12%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Highs:</span>
                <span className="font-mono text-green-600">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Lows:</span>
                <span className="font-mono text-red-600">23</span>
              </div>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-3 mt-3">
            <div
              className="h-3 bg-green-500 rounded-full transition-all"
              style={{ width: `${advancingRatio * 100}%` }}
            />
          </div>
          <div className="text-xs text-center text-muted-foreground">
            Risk-On Environment ({(advancingRatio * 100).toFixed(0)}% bullish breadth)
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium text-center">{getMarketRegime()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
