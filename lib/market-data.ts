// Market data processing utilities for intraday factor analysis

import { apiCache } from "./api-cache"

export interface MarketDataPoint {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface FactorData {
  timestamp: Date
  momentum: number
  liquidity: number
  volatility: number
}

export interface CorrelationMatrix {
  [key: string]: { [key: string]: number }
}

// Fetch real-time stock data from internal API
export async function fetchRealMarketData(symbol = "AAPL"): Promise<MarketDataPoint[]> {
  return apiCache.get("/api/market-data", { symbol }, async () => {
    console.log(`[v0] Fetching REAL data only for ${symbol} from Twelve Data`)
    const response = await fetch(`/api/market-data?symbol=${symbol}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "API returned unsuccessful response")
    }

    console.log(`[v0] Successfully fetched ${result.data.length} REAL market data points for ${symbol}`)

    // Transform API data to our format
    const marketData: MarketDataPoint[] = result.data.map((point: any) => ({
      timestamp: new Date(point.timestamp),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }))

    return marketData
  })
}

// Fetch real-time quote for current price from internal API
export async function fetchRealTimeQuote(
  symbol = "AAPL",
): Promise<{ price: number; change: number; changePercent: number } | null> {
  return apiCache.get("/api/quote", { symbol }, async () => {
    console.log(`[v0] Fetching real-time quote for ${symbol}`)
    const response = await fetch(`/api/quote?symbol=${symbol}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      console.warn(`[v0] Quote API returned unsuccessful response for ${symbol}`)
      return null
    }

    console.log(`[v0] Successfully fetched real quote data for ${symbol}`)

    return {
      price: result.data.price,
      change: result.data.change,
      changePercent: result.data.changePercent,
    }
  })
}

// Generate synthetic intraday market data for demonstration
export function generateSyntheticMarketData(
  startPrice = 100,
  periods = 390, // 6.5 hours * 60 minutes
  volatility = 0.02,
): MarketDataPoint[] {
  const data: MarketDataPoint[] = []
  const startTime = new Date()
  startTime.setHours(9, 30, 0, 0) // Market open at 9:30 AM

  let currentPrice = startPrice

  for (let i = 0; i < periods; i++) {
    const timestamp = new Date(startTime.getTime() + i * 60000) // 1-minute intervals

    // Generate price movement with some momentum and mean reversion
    const randomWalk = (Math.random() - 0.5) * volatility
    const momentum = i > 10 ? ((data[i - 1].close - data[i - 10].close) / data[i - 10].close) * 0.1 : 0
    const meanReversion = ((startPrice - currentPrice) / startPrice) * 0.05

    const priceChange = randomWalk + momentum + meanReversion
    currentPrice *= 1 + priceChange

    const open = i === 0 ? startPrice : data[i - 1].close
    const volatilityFactor = 1 + (Math.random() - 0.5) * volatility * 0.5
    const high = Math.max(open, currentPrice) * volatilityFactor
    const low = Math.min(open, currentPrice) / volatilityFactor
    const volume = Math.floor(Math.random() * 1000000 + 500000)

    data.push({
      timestamp,
      open,
      high,
      low,
      close: currentPrice,
      volume,
    })
  }

  return data
}

// Calculate rolling correlation between two price series
export function calculateRollingCorrelation(series1: number[], series2: number[], window = 20): number[] {
  const correlations: number[] = []

  for (let i = window - 1; i < series1.length; i++) {
    const slice1 = series1.slice(i - window + 1, i + 1)
    const slice2 = series2.slice(i - window + 1, i + 1)

    const correlation = calculateCorrelation(slice1, slice2)
    correlations.push(correlation)
  }

  return correlations
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

// Extract intraday factors using simplified PCA approach
export function extractIntradayFactors(marketData: MarketDataPoint[]): FactorData[] {
  const factors: FactorData[] = []
  const window = 20

  for (let i = window; i < marketData.length; i++) {
    const recentData = marketData.slice(i - window, i)

    // Calculate momentum factor (price momentum over window)
    const momentum = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close

    // Calculate liquidity factor (inverse of volume volatility)
    const volumes = recentData.map((d) => d.volume)
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const volumeStd = Math.sqrt(volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length)
    const liquidity = avgVolume / (volumeStd + 1) // Normalized liquidity measure

    // Calculate volatility factor (realized volatility)
    const returns = recentData.slice(1).map((d, idx) => Math.log(d.close / recentData[idx].close))
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252 * 390)

    factors.push({
      timestamp: marketData[i].timestamp,
      momentum: momentum * 100, // Scale for display
      liquidity: liquidity / 1000000, // Scale for display
      volatility: volatility * 100, // Scale for display
    })
  }

  return factors
}

// Calculate correlation matrix for multiple assets/factors
export function calculateCorrelationMatrix(data: { [key: string]: number[] }): CorrelationMatrix {
  const keys = Object.keys(data)
  const matrix: CorrelationMatrix = {}

  keys.forEach((key1) => {
    matrix[key1] = {}
    keys.forEach((key2) => {
      matrix[key1][key2] = calculateCorrelation(data[key1], data[key2])
    })
  })

  return matrix
}

// Simulate trading strategy P&L based on factor signals
export interface StrategyConfig {
  momentumThreshold: number
  liquidityThreshold: number
  volatilityThreshold: number
  positionSize: number
}

export interface StrategyResult {
  timestamp: Date
  position: number
  pnl: number
  cumulativePnl: number
}

export function simulateFactorStrategy(
  marketData: MarketDataPoint[],
  factors: FactorData[],
  config: StrategyConfig,
): StrategyResult[] {
  const results: StrategyResult[] = []
  let cumulativePnl = 0
  let currentPosition = 0
  let entryPrice = 0

  for (let i = 1; i < factors.length; i++) {
    const factor = factors[i]
    const price = marketData[i + 20].close // Offset for factor calculation window

    // Generate trading signal based on factors
    let signal = 0

    if (factor.momentum > config.momentumThreshold && factor.liquidity > config.liquidityThreshold) {
      signal = 1 // Long signal
    } else if (factor.momentum < -config.momentumThreshold && factor.liquidity > config.liquidityThreshold) {
      signal = -1 // Short signal
    }

    // Calculate P&L if position changes
    let pnl = 0
    if (currentPosition !== 0 && signal !== currentPosition) {
      pnl = currentPosition * (price - entryPrice) * config.positionSize
      cumulativePnl += pnl
    }

    // Update position
    if (signal !== 0 && signal !== currentPosition) {
      currentPosition = signal
      entryPrice = price
    }

    results.push({
      timestamp: factor.timestamp,
      position: currentPosition,
      pnl,
      cumulativePnl,
    })
  }

  return results
}
