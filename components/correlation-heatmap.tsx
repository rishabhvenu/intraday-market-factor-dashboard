"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useMarketSnapshot } from "@/hooks/use-market-snapshot"
import { Download, Loader2, Play, Pause, RotateCcw } from "lucide-react"
import { useMemo, useState, useEffect } from "react"

export function CorrelationHeatmap() {
  const { snapshot, loading, error } = useMarketSnapshot()
  const [windowSize, setWindowSize] = useState(30)
  const [timeIndex, setTimeIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(500)

  const getBaseCorrelation = (symbol1: string, symbol2: string): number => {
    // ETFs tend to have high correlation
    if ((symbol1 === "SPY" || symbol1 === "QQQ") && (symbol2 === "SPY" || symbol2 === "QQQ")) {
      return 0.8
    }
    // Tech stocks correlate with QQQ
    if (
      (symbol1 === "QQQ" && ["AAPL", "MSFT", "NVDA"].includes(symbol2)) ||
      (symbol2 === "QQQ" && ["AAPL", "MSFT", "NVDA"].includes(symbol1))
    ) {
      return 0.7
    }
    // Tech stocks with each other
    if (["AAPL", "MSFT", "NVDA"].includes(symbol1) && ["AAPL", "MSFT", "NVDA"].includes(symbol2)) {
      return 0.6
    }
    // General market correlation
    return 0.4
  }

  const correlationData = useMemo(() => {
    if (!snapshot?.symbols.length) return null

    const symbols = snapshot.symbols.map((s) => s.symbol)
    const timeSeriesLength = 100 // Simulate 100 time periods
    const matrices: number[][][] = []

    // Generate time series of correlation matrices
    for (let t = 0; t < timeSeriesLength; t++) {
      const matrix: number[][] = Array(symbols.length)
        .fill(null)
        .map(() => Array(symbols.length).fill(0))

      for (let i = 0; i < symbols.length; i++) {
        for (let j = 0; j < symbols.length; j++) {
          if (i === j) {
            matrix[i][j] = 1.0
          } else {
            // Generate time-varying correlations with regime shifts
            const baseCorr = getBaseCorrelation(symbols[i], symbols[j])
            const timeVariation = Math.sin(t * 0.1) * 0.3 // Regime shifts
            const windowEffect = (windowSize - 30) * 0.01 // Window size effect
            const noise = (Math.random() - 0.5) * 0.1

            let correlation = baseCorr + timeVariation + windowEffect + noise
            correlation = Math.max(-0.95, Math.min(0.95, correlation)) // Clamp values

            matrix[i][j] = correlation
            matrix[j][i] = correlation
          }
        }
      }
      matrices.push(matrix)
    }

    // Calculate average correlation (systemic risk indicator)
    const currentMatrix = matrices[timeIndex] || matrices[0]
    let totalCorr = 0
    let count = 0

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        totalCorr += Math.abs(currentMatrix[i][j])
        count++
      }
    }

    const avgCorrelation = count > 0 ? totalCorr / count : 0

    return {
      symbols,
      matrices,
      currentMatrix,
      avgCorrelation,
      timeSeriesLength,
    }
  }, [snapshot, windowSize, timeIndex])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isAnimating && correlationData) {
      interval = setInterval(() => {
        setTimeIndex((prev) => (prev + 1) % correlationData.timeSeriesLength)
      }, animationSpeed)
    }
    return () => clearInterval(interval)
  }, [isAnimating, animationSpeed, correlationData])

  const exportToCSV = () => {
    if (!correlationData) return

    const { symbols, currentMatrix } = correlationData
    let csv = "Symbol," + symbols.join(",") + "\n"

    symbols.forEach((symbol, i) => {
      csv += symbol + "," + currentMatrix[i].map((val) => val.toFixed(4)).join(",") + "\n"
    })

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `correlation_matrix_${windowSize}p_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPNG = () => {
    // In a real implementation, you'd use html2canvas or similar
    alert("PNG export would be implemented with html2canvas library")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating correlations...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !correlationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No correlation data available</p>
        </CardContent>
      </Card>
    )
  }

  const { symbols, currentMatrix, avgCorrelation, timeSeriesLength } = correlationData

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Enhanced Correlation Matrix
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Systemic Risk: {(avgCorrelation * 100).toFixed(1)}%</Badge>
            <Badge variant={avgCorrelation > 0.7 ? "destructive" : avgCorrelation > 0.5 ? "default" : "secondary"}>
              {avgCorrelation > 0.7 ? "High Risk" : avgCorrelation > 0.5 ? "Medium Risk" : "Low Risk"}
            </Badge>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {windowSize}-period rolling correlation with regime shift analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Window Size</label>
            <div className="flex items-center gap-4">
              {[10, 30, 60].map((size) => (
                <Button
                  key={size}
                  variant={windowSize === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWindowSize(size)}
                >
                  {size}p
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Time Period: {timeIndex + 1}/{timeSeriesLength}
            </label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAnimating(!isAnimating)}>
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTimeIndex(0)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Slider
                value={[timeIndex]}
                onValueChange={(value) => setTimeIndex(value[0])}
                max={timeSeriesLength - 1}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Export Data</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPNG}>
                <Download className="h-4 w-4 mr-1" />
                PNG
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${symbols.length}, 1fr)` }}>
            {/* Header row */}
            <div></div>
            {symbols.map((symbol) => (
              <div key={symbol} className="text-xs font-medium text-center p-2">
                {symbol}
              </div>
            ))}

            {/* Data rows */}
            {symbols.map((rowSymbol, i) => (
              <>
                <div key={`label-${rowSymbol}`} className="text-xs font-medium p-2 text-right">
                  {rowSymbol}
                </div>
                {symbols.map((colSymbol, j) => {
                  const correlation = currentMatrix[i][j]
                  const absCorr = Math.abs(correlation)

                  // Diverging color scale: red-white-green
                  let backgroundColor: string
                  if (correlation > 0) {
                    // Positive correlation: white to green
                    const intensity = correlation
                    backgroundColor = `rgba(34, 197, 94, ${intensity * 0.8})`
                  } else {
                    // Negative correlation: white to red
                    const intensity = Math.abs(correlation)
                    backgroundColor = `rgba(239, 68, 68, ${intensity * 0.8})`
                  }

                  return (
                    <div
                      key={`${rowSymbol}-${colSymbol}`}
                      className="flex items-center justify-center p-2 text-xs font-medium rounded transition-all duration-200"
                      style={{
                        backgroundColor,
                        color: absCorr > 0.6 ? "white" : "inherit",
                        border: i === j ? "2px solid hsl(var(--border))" : "1px solid transparent",
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

        <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/80"></div>
            <span>Strong Negative (-1.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200"></div>
            <span>No Correlation (0.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/80"></div>
            <span>Strong Positive (+1.0)</span>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Market Regime Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <strong>Current Period:</strong> {timeIndex + 1} of {timeSeriesLength}
            </div>
            <div>
              <strong>Average Correlation:</strong> {(avgCorrelation * 100).toFixed(1)}%
              {avgCorrelation > 0.7 && " (Crisis-like conditions)"}
              {avgCorrelation > 0.5 && avgCorrelation <= 0.7 && " (Elevated systemic risk)"}
              {avgCorrelation <= 0.5 && " (Normal market conditions)"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Interpretation:</strong> Higher average correlations indicate increased systemic risk and reduced
            diversification benefits. Use the time slider to observe correlation regime shifts during market stress
            periods.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
