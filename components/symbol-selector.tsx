"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, TrendingUp } from "lucide-react"

interface SymbolSelectorProps {
  currentSymbol: string
  onSymbolChange: (symbol: string) => void
  isLoading?: boolean
}

const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "INTC", name: "Intel Corp." },
]

const SECTOR_SYMBOLS = {
  Technology: ["AAPL", "GOOGL", "MSFT", "NVDA", "AMD"],
  Consumer: ["TSLA", "AMZN", "NFLX", "META", "DIS"],
  Finance: ["JPM", "BAC", "WFC", "GS", "MS"],
  Healthcare: ["JNJ", "PFE", "UNH", "ABBV", "MRK"],
  Energy: ["XOM", "CVX", "COP", "EOG", "SLB"],
}

export function SymbolSelector({ currentSymbol, onSymbolChange, isLoading = false }: SymbolSelectorProps) {
  const [customSymbol, setCustomSymbol] = useState("")
  const [selectedSector, setSelectedSector] = useState<string>("")

  const handleCustomSymbolSubmit = () => {
    if (customSymbol.trim()) {
      onSymbolChange(customSymbol.trim().toUpperCase())
      setCustomSymbol("")
    }
  }

  const handleSectorChange = (sector: string) => {
    setSelectedSector(sector)
  }

  return (
    <div className="space-y-4">
      {/* Current Symbol Display */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm font-mono">
          <TrendingUp className="mr-1 h-3 w-3" />
          {currentSymbol}
        </Badge>
        {isLoading && (
          <Badge variant="secondary" className="text-xs">
            Loading...
          </Badge>
        )}
      </div>

      {/* Popular Symbols */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Popular Stocks</Label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SYMBOLS.map((stock) => (
            <Button
              key={stock.symbol}
              variant={currentSymbol === stock.symbol ? "default" : "outline"}
              size="sm"
              onClick={() => onSymbolChange(stock.symbol)}
              disabled={isLoading}
              className="text-xs"
            >
              {stock.symbol}
            </Button>
          ))}
        </div>
      </div>

      {/* Sector Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">By Sector</Label>
        <Select value={selectedSector} onValueChange={handleSectorChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a sector" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(SECTOR_SYMBOLS).map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSector && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SECTOR_SYMBOLS[selectedSector as keyof typeof SECTOR_SYMBOLS].map((symbol) => (
              <Button
                key={symbol}
                variant={currentSymbol === symbol ? "default" : "outline"}
                size="sm"
                onClick={() => onSymbolChange(symbol)}
                disabled={isLoading}
                className="text-xs"
              >
                {symbol}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Symbol Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Symbol</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter symbol (e.g., AAPL)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSymbolSubmit()}
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={handleCustomSymbolSubmit} disabled={!customSymbol.trim() || isLoading} size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
