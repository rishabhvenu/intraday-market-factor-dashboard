"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { MarketOverviewGrid } from "@/components/market-overview-grid"
import { PerformanceHeatmap } from "@/components/performance-heatmap"
import { TopMoversPanel } from "@/components/top-movers-panel"
import { CorrelationHeatmap } from "@/components/correlation-heatmap"
import { PCAAnalysis } from "@/components/pca-analysis"
import { IndexSnapshot } from "@/components/index-snapshot"
import { SymbolDrilldownModal } from "@/components/symbol-drilldown-modal"
import { BarChart3, Zap, TrendingUp, Activity, PieChart, Target, RefreshCw, Clock, Info } from "lucide-react"
import type { SymbolData } from "@/lib/market-symbols"

export function DashboardLayout() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolData | null>(null)
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [refreshFrequency, setRefreshFrequency] = useState<string>("1m")
  const [timeHorizon, setTimeHorizon] = useState<string>("intraday")

  const handleSymbolClick = (symbolData: SymbolData) => {
    setSelectedSymbol(symbolData)
    setDrilldownOpen(true)
  }

  const refreshOptions = [
    { value: "15s", label: "15 seconds", ms: 15000 },
    { value: "1m", label: "1 minute", ms: 60000 },
    { value: "5m", label: "5 minutes", ms: 300000 },
  ]

  const interpretationText = {
    overview:
      "Real-time price movements and volume patterns show current market sentiment. Green indicates gains, red shows losses. Volume spikes often precede significant price moves.",
    performance:
      "Heat map reveals sector rotation and relative strength patterns. Darker colors indicate stronger performance. Top movers highlight momentum opportunities and risk areas.",
    indices:
      "Major index performance provides broad market context. VIX levels above 20 suggest elevated volatility. Breadth indicators show market participation strength.",
    analysis:
      "Correlation matrices reveal risk clustering - high correlations indicate systemic risk. PCA factors explain market structure: PC1 typically represents broad market moves, PC2 shows sector divergence.",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="sticky top-0 z-50 glass-effect border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl gradient-primary">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-balance bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Intraday Market Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">SPY • QQQ • AAPL • MSFT • NVDA Analysis</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={refreshFrequency} onValueChange={setRefreshFrequency}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {refreshOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Select value={timeHorizon} onValueChange={setTimeHorizon}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intraday">Intraday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs px-3 py-1 gradient-accent text-white border-0 hover-lift">
                <Zap className="mr-2 h-3 w-3" />
                Live Market Data
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-12 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Market Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <Activity className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger
              value="indices"
              className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <Target className="h-4 w-4" />
              <span>Indices</span>
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <PieChart className="h-4 w-4" />
              <span>Factor Analysis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-balance mb-2">Market Overview</h2>
              <p className="text-muted-foreground">Real-time market data and performance metrics</p>
            </div>
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{interpretationText.overview}</p>
                </div>
              </CardContent>
            </Card>
            <div className="hover-lift">
              <MarketOverviewGrid onSymbolClick={handleSymbolClick} />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-balance mb-2">Performance & Movers</h2>
              <p className="text-muted-foreground">Heat map visualization and top performing assets</p>
            </div>
            <Card className="mb-6 border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{interpretationText.performance}</p>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 hover-lift">
                <PerformanceHeatmap onSymbolClick={handleSymbolClick} />
              </div>
              <div className="hover-lift">
                <TopMoversPanel onSymbolClick={handleSymbolClick} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="indices" className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-balance mb-2">Index Snapshot</h2>
              <p className="text-muted-foreground">Major indices performance and trends</p>
            </div>
            <Card className="mb-6 border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{interpretationText.indices}</p>
                </div>
              </CardContent>
            </Card>
            <div className="max-w-2xl mx-auto hover-lift">
              <IndexSnapshot />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-balance mb-2">Factor Analysis</h2>
              <p className="text-muted-foreground">Correlation matrices and principal component analysis</p>
            </div>
            <Card className="mb-6 border-l-4 border-l-purple-500">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{interpretationText.analysis}</p>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="hover-lift">
                <CorrelationHeatmap />
              </div>
              <div className="hover-lift">
                <PCAAnalysis />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <SymbolDrilldownModal symbolData={selectedSymbol} open={drilldownOpen} onOpenChange={setDrilldownOpen} />
    </div>
  )
}
