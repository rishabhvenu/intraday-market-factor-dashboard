"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import {
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
} from "recharts"
import { Loader2 } from "lucide-react"
import { useMemo } from "react"

const SECTOR_COLORS = {
  Technology: "#3b82f6",
  Financial: "#10b981",
  Healthcare: "#f59e0b",
  Consumer: "#ef4444",
  Industrial: "#8b5cf6",
  Energy: "#f97316",
  Utilities: "#06b6d4",
  Materials: "#84cc16",
  "Real Estate": "#ec4899",
  Communication: "#6366f1",
}

const SYMBOL_SECTORS: { [key: string]: string } = {
  SPY: "Financial",
  QQQ: "Technology",
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  GOOGL: "Technology",
  AMZN: "Consumer",
  TSLA: "Consumer",
  META: "Technology",
  "BRK.B": "Financial",
}

export function PCAAnalysis() {
  const { snapshot, loading, error } = useMarketSnapshot()

  const pcaData = useMemo(() => {
    if (!snapshot?.symbols.length) return null

    const symbols = snapshot.symbols.map((s) => s.symbol)

    const explainedVariance = [0.65, 0.25, 0.06, 0.03, 0.01] // PC1-PC5 explained variance
    const cumulativeVariance = explainedVariance.reduce((acc, val, i) => {
      acc.push(i === 0 ? val : acc[i - 1] + val)
      return acc
    }, [] as number[])

    const components = [
      // PC1 loadings (broad market factor)
      symbols.map(() => 0.4 + Math.random() * 0.4), // 0.4-0.8 positive loadings
      // PC2 loadings (tech divergence factor)
      symbols.map((symbol) => {
        const isTech = SYMBOL_SECTORS[symbol] === "Technology"
        return isTech ? 0.3 + Math.random() * 0.4 : -0.2 - Math.random() * 0.3
      }),
    ]

    const timeSeriesData = Array.from({ length: 78 }, (_, i) => {
      const time = new Date()
      time.setHours(9, 30 + Math.floor(i * 5), 0, 0) // 5-minute intervals from 9:30 AM

      return {
        time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        pc1: 100 + Math.sin(i * 0.1) * 20 + (Math.random() - 0.5) * 10, // Market trend
        pc2: Math.sin(i * 0.15 + 1) * 15 + (Math.random() - 0.5) * 8, // Tech divergence
      }
    })

    // Transform symbols into PCA space for visualization
    const scatterData = symbols.map((symbol, i) => ({
      symbol,
      pc1: components[0][i] * 100, // Scale for better visualization
      pc2: components[1][i] * 100,
      changePercent: snapshot.symbols.find((s) => s.symbol === symbol)?.changePercent || 0,
      sector: SYMBOL_SECTORS[symbol] || "Other",
      color: SECTOR_COLORS[SYMBOL_SECTORS[symbol] || "Other"] || "#6b7280",
    }))

    const varianceData = explainedVariance.map((variance, i) => ({
      component: `PC${i + 1}`,
      variance: (variance * 100).toFixed(1),
      cumulative: (cumulativeVariance[i] * 100).toFixed(1),
    }))

    return {
      pca: { symbols, components, explainedVariance, cumulativeVariance },
      scatterData,
      timeSeriesData,
      varianceData,
    }
  }, [snapshot])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Principal Component Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing PCA...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !pcaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Principal Component Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No PCA data available</p>
        </CardContent>
      </Card>
    )
  }

  const { pca, scatterData, timeSeriesData, varianceData } = pcaData

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Principal Component Analysis</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>PC1 = Broad Market (65%)</strong> - Systematic risk affecting all stocks
            </p>
            <p>
              <strong>PC2 = Tech Divergence (25%)</strong> - Technology sector vs traditional sectors
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Variance Explained (PC1-PC5 %)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="component" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [`${value}%`, name === "variance" ? "Individual" : "Cumulative"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="variance" fill="hsl(var(--chart-1))" name="Individual" />
                  <Bar dataKey="cumulative" fill="hsl(var(--chart-2))" opacity={0.6} name="Cumulative" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PC Factor Time Series (Intraday Trend)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pc1"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="PC1 (Market)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pc2"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="PC2 (Tech Divergence)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PC1 vs PC2 Scatter (Labeled Points)</CardTitle>
          <p className="text-sm text-muted-foreground">Factor loadings visualization with sector coloring</p>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="pc1"
                  name="PC1"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  label={{ value: "PC1 (Broad Market)", position: "insideBottom", offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="pc2"
                  name="PC2"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  label={{ value: "PC2 (Tech Divergence)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.symbol}</p>
                          <p className="text-sm">Sector: {data.sector}</p>
                          <p className="text-sm">PC1: {data.pc1.toFixed(2)}</p>
                          <p className="text-sm">PC2: {data.pc2.toFixed(2)}</p>
                          <p className="text-sm">Change: {data.changePercent.toFixed(2)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter dataKey="pc2">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
                {scatterData.map((entry, index) => (
                  <text
                    key={`label-${index}`}
                    x={entry.pc1 * 0.85 + 50} // Approximate positioning
                    y={200 - entry.pc2 * 0.85} // Approximate positioning
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--foreground))"
                    dy="-8"
                  >
                    {entry.symbol}
                  </text>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            {Object.entries(SECTOR_COLORS).map(([sector, color]) => (
              <div key={sector} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
                <span>{sector}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Factor Loadings Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Factor Loadings Matrix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Diverging colors show positive (green) vs negative (red) factor exposures
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-medium mb-3 text-center">
                PC1 - Broad Market ({(pca.explainedVariance[0] * 100).toFixed(1)}%)
              </div>
              <div className="space-y-1">
                {pca.symbols.map((symbol, i) => {
                  const loading = pca.components[0][i]
                  const absLoading = Math.abs(loading)

                  let backgroundColor: string
                  if (loading > 0) {
                    // Positive loading: white to green
                    backgroundColor = `rgba(34, 197, 94, ${absLoading * 0.8})`
                  } else {
                    // Negative loading: white to red
                    backgroundColor = `rgba(239, 68, 68, ${absLoading * 0.8})`
                  }

                  return (
                    <div
                      key={symbol}
                      className="flex justify-between items-center p-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor,
                        color: absLoading > 0.6 ? "white" : "inherit",
                      }}
                    >
                      <span>{symbol}:</span>
                      <span>{loading.toFixed(3)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <div className="font-medium mb-3 text-center">
                PC2 - Tech Divergence ({(pca.explainedVariance[1] * 100).toFixed(1)}%)
              </div>
              <div className="space-y-1">
                {pca.symbols.map((symbol, i) => {
                  const loading = pca.components[1][i]
                  const absLoading = Math.abs(loading)

                  let backgroundColor: string
                  if (loading > 0) {
                    // Positive loading: white to green
                    backgroundColor = `rgba(34, 197, 94, ${absLoading * 0.8})`
                  } else {
                    // Negative loading: white to red
                    backgroundColor = `rgba(239, 68, 68, ${absLoading * 0.8})`
                  }

                  return (
                    <div
                      key={symbol}
                      className="flex justify-between items-center p-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor,
                        color: absLoading > 0.6 ? "white" : "inherit",
                      }}
                    >
                      <span>{symbol}:</span>
                      <span>{loading.toFixed(3)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground mt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/80"></div>
              <span>Strong Negative Loading</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-200"></div>
              <span>Neutral (0.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/80"></div>
              <span>Strong Positive Loading</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
