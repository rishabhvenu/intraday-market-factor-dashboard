export const MARKET_SYMBOLS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF" },
  { symbol: "AAPL", name: "Apple Inc.", type: "Stock" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "Stock" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "Stock" },
] as const

export type MarketSymbol = (typeof MARKET_SYMBOLS)[number]["symbol"]

export interface SymbolData {
  symbol: string
  name: string
  type: string
  price: number
  change: number
  changePercent: number
  volume: number
  data: Array<{
    datetime: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export interface MarketSnapshot {
  symbols: SymbolData[]
  lastUpdated: string
}
