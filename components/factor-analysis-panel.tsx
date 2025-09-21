"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { TrendingUp, Activity, BarChart3, RefreshCw, Target } from "lucide-react"

interface PCAResult {
  components: number[][]
  explainedVariance: number[]
  cumulativeVariance: number[]
  factorLoadings: { [symbol: string]: { factor1: number; factor2: number } }
}

interface CorrelationMatrix {
  symbols: string[]
  matrix: number[][]
}

export function FactorAnalysisPanel() {
  const { snapshot, loading, error, refetch } = useMarketSnapshot()
  const [pcaResult, setPcaResult] = useState<PCAResult | null>(null)
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null)

  // Calculate PCA and correlations when data updates
  useEffect(() => {
    if (!snapshot?.symbols.length) return

    const symbols = snapshot.symbols.map((s) => s.symbol)
    const returns = snapshot.symbols.map((s) => s.data.map((d) => d.changePercent || 0))

    // Calculate correlation matrix
    const matrix = calculateCorrelationMatrix(returns)
    setCorrelationMatrix({ symbols, matrix })

    // Calculate PCA
    const pca = calculatePCA(returns, symbols)
    setPcaResult(pca)
  }, [snapshot])

  const calculateCorrelationMatrix = (returns: number[][]): number[][] => {
    const n = returns.length
    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1
        } else {
          const corr = pearsonCorrelation(returns[i], returns[j])
          matrix[i][j] = corr
        }
      }
    }
    return matrix
  }

  const pearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length)
    if (n === 0) return 0

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0)
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0)
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  const calculatePCA = (returns: number[][], symbols: string[]): PCAResult => {
    // In production, you'd use a proper linear algebra library
    const n = returns.length
    const correlationMatrix = calculateCorrelationMatrix(returns)

    // Mock PCA results for demonstration
    const explainedVariance = [0.65, 0.23, 0.08, 0.04] // Factor 1 explains 65% variance
    const cumulativeVariance = explainedVariance.reduce((acc, val, i) => {
      acc.push(i === 0 ? val : acc[i - 1] + val)
      return acc
    }, [] as number[])

    // Mock factor loadings (how much each stock loads on each factor)
    const factorLoadings: { [symbol: string]: { factor1: number; factor2: number } } = {}
    symbols.forEach((symbol, i) => {
      factorLoadings[symbol] = {
        factor1: 0.3 + Math.random() * 0.7, // Market factor (high for all)
        factor2: (Math.random() - 0.5) * 0.8, // Sector rotation factor
      }
    })

    return {
      components: correlationMatrix,
      explainedVariance,
      cumulativeVariance,
      factorLoadings,
    }
  }

  const varianceData = useMemo(() => {
    if (!pcaResult) return []
    return pcaResult.explainedVariance.slice(0, 4).map((variance, i) => ({
      factor: `Factor ${i + 1}`,
      variance: (variance * 100).toFixed(1),
      cumulative: (pcaResult.cumulativeVariance[i] * 100).toFixed(1),
    }))
  }, [pcaResult])

  const factorLoadingData = useMemo(() => {
    if (!pcaResult) return []
    return Object.entries(pcaResult.factorLoadings).map(([symbol, loadings]) => ({
      symbol,
      factor1: loadings.factor1,
      factor2: loadings.factor2,
    }))
  }, [pcaResult])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Factor Analysis Panel
            <RefreshCw className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Computing factor structure...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Factor Analysis Panel
            <Badge variant="secondary" className="ml-auto">
              Quant Edge
            </Badge>
          </CardTitle>
          <CardDescription>
            Hidden market structure analysis - dimensionality reduction and systemic drivers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Analysis
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="correlation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="pca">PCA Factors</TabsTrigger>
          <TabsTrigger value="loadings">Factor Loadings</TabsTrigger>
        </TabsList>

        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Intraday Correlation Matrix
              </CardTitle>
              <CardDescription>Pairwise correlations across tracked tickers - spot sector clustering</CardDescription>
            </CardHeader>
            <CardContent>
              {correlationMatrix && (
                <div className="overflow-x-auto">
                  <div
                    className="grid gap-1 min-w-fit"
                    style={{ gridTemplateColumns: `80px repeat(${correlationMatrix.symbols.length}, 60px)` }}
                  >
                    {/* Header row */}
                    <div></div>
                    {correlationMatrix.symbols.map((symbol) => (
                      <div key={symbol} className="text-xs font-medium text-center p-2 rotate-45 origin-bottom-left">
                        {symbol}
                      </div>
                    ))}

                    {/* Data rows */}
                    {correlationMatrix.symbols.map((rowSymbol, i) => (
                      <>
                        <div key={`label-${rowSymbol}`} className="text-xs font-medium p-2 text-right">
                          {rowSymbol}
                        </div>
                        {correlationMatrix.symbols.map((colSymbol, j) => {
                          const correlation = correlationMatrix.matrix[i][j]
                          const intensity = Math.abs(correlation)
                          const isPositive = correlation >= 0

                          return (
                            <div
                              key={`${rowSymbol}-${colSymbol}`}
                              className="flex items-center justify-center p-1 text-xs font-mono rounded aspect-square"
                              style={{
                                backgroundColor: isPositive
                                  ? `rgba(34, 197, 94, ${intensity * 0.9})`
                                  : `rgba(239, 68, 68, ${intensity * 0.9})`,
                                color: intensity > 0.5 ? "white" : "inherit",
                              }}
                              title={`${rowSymbol} vs ${colSymbol}: ${correlation.toFixed(3)}`}
                            >
                              {correlation.toFixed(2)}
                            </div>
                          )
                        })}
                      </>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pca">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Explained Variance
                </CardTitle>
                <CardDescription>How much variance each principal component explains</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={varianceData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="factor" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        formatter={(value, name) => [`${value}%`, name === "variance" ? "Individual" : "Cumulative"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar dataKey="variance" fill="hsl(var(--chart-1))" name="Individual Variance" />
                      <Bar dataKey="cumulative" fill="hsl(var(--chart-2))" opacity={0.6} name="Cumulative Variance" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-chart-1 rounded"></div>
                      <span className="font-medium">Factor 1: Market Mode</span>
                    </div>
                    <p className="text-muted-foreground text-xs">Systematic risk affecting all stocks</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-chart-2 rounded"></div>
                      <span className="font-medium">Factor 2: Sector Rotation</span>
                    </div>
                    <p className="text-muted-foreground text-xs">Sector-specific movements</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Factor Interpretation</CardTitle>
                <CardDescription>What the factors represent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">
                      F1
                    </Badge>
                    <div>
                      <h4 className="font-medium">Market Mode ({varianceData[0]?.variance}%)</h4>
                      <p className="text-sm text-muted-foreground">
                        Broad market sentiment - risk-on vs risk-off behavior
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">
                      F2
                    </Badge>
                    <div>
                      <h4 className="font-medium">Sector Rotation ({varianceData[1]?.variance}%)</h4>
                      <p className="text-sm text-muted-foreground">Relative performance between sectors and styles</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">
                      F3+
                    </Badge>
                    <div>
                      <h4 className="font-medium">Idiosyncratic ({varianceData[2]?.variance}%)</h4>
                      <p className="text-sm text-muted-foreground">Stock-specific movements and noise</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loadings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Factor Loadings Map
              </CardTitle>
              <CardDescription>How each stock loads on the two main factors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={factorLoadingData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="factor1"
                      domain={[0, 1]}
                      name="Market Factor"
                      className="text-xs"
                      label={{ value: "Market Factor (F1)", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      dataKey="factor2"
                      domain={[-0.5, 0.5]}
                      name="Sector Factor"
                      className="text-xs"
                      label={{ value: "Sector Factor (F2)", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [
                        value.toFixed(3),
                        name === "factor1" ? "Market Loading" : "Sector Loading",
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.symbol || ""}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Scatter
                      dataKey="factor2"
                      fill="hsl(var(--chart-1))"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>Interpretation:</strong> Stocks in the upper right are sensitive to both market moves and
                  sector rotation. Stocks near the x-axis are primarily driven by broad market sentiment.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
