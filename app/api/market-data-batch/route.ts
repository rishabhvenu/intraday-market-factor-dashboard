import { type NextRequest, NextResponse } from "next/server"
import { globalRateLimiter } from "@/lib/global-rate-limiter"

export async function GET(request: NextRequest) {
  try {
    if (await globalRateLimiter.isBlocked()) {
      console.log("[v0] API requests blocked - credits exhausted")
      return NextResponse.json(
        {
          error: "API credits exhausted for today. Please wait until tomorrow or upgrade your plan.",
          creditsExhausted: true,
        },
        { status: 429 },
      )
    }

    console.log("[v0] Making single batch API request for all symbols")

    const symbolList = "SPY,QQQ,AAPL,MSFT,NVDA"

    const apiKey = process.env.TWELVE_DATA_API_KEY
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is not configured")
    }

    const url = `https://api.twelvedata.com/quote?symbol=${symbolList}&apikey=${apiKey}`
    console.log("[v0] Single API call for batch data:", url)

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Market-Dashboard/1.0",
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        await globalRateLimiter.handle429Error(new Error("Rate limit exceeded"))
        throw new Error("API credits exhausted")
      }
      throw new Error(`Twelve Data API error: ${response.status}`)
    }

    const batchData = await response.json()
    console.log("[v0] Raw API response received successfully")

    if (
      batchData.code === 429 ||
      (batchData.status === "error" && batchData.message && batchData.message.includes("API credits"))
    ) {
      await globalRateLimiter.handle429Error(new Error("API credits exhausted"))
      throw new Error("API credits exhausted")
    }

    const processedData: Record<string, any> = {}
    const coreSymbols = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA"]

    for (const symbol of coreSymbols) {
      const symbolData = batchData[symbol]

      if (symbolData && !symbolData.code) {
        processedData[symbol] = {
          symbol,
          name: symbolData.name || symbol,
          price: Number.parseFloat(symbolData.close) || 0,
          change: Number.parseFloat(symbolData.change) || 0,
          percent_change: Number.parseFloat(symbolData.percent_change) || 0,
          volume: Number.parseInt(symbolData.volume) || 0,
          high: Number.parseFloat(symbolData.high) || 0,
          low: Number.parseFloat(symbolData.low) || 0,
          open: Number.parseFloat(symbolData.open) || 0,
          previous_close: Number.parseFloat(symbolData.previous_close) || 0,
          datetime: symbolData.datetime,
        }
      } else {
        processedData[symbol] = {
          symbol,
          error: "No data available",
        }
      }
    }

    console.log("[v0] Successfully processed batch data with single API call")
    return NextResponse.json(processedData)
  } catch (error) {
    console.error("[v0] Error in batch market data fetch:", error)

    if (error instanceof Error && (error.message.includes("429") || error.message.includes("credits"))) {
      await globalRateLimiter.handle429Error(error)
      return NextResponse.json(
        {
          error: "API credits exhausted for today. Please wait until tomorrow or upgrade your plan.",
          creditsExhausted: true,
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        error: "Market data temporarily unavailable. Please try again later.",
        serviceUnavailable: true,
      },
      { status: 503 },
    )
  }
}
