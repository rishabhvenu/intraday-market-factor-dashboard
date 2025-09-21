import { type NextRequest, NextResponse } from "next/server"
import { globalRateLimiter } from "@/lib/global-rate-limiter"

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get("symbol") || "AAPL"

  console.log(`[v0] Fetching REAL data only for ${symbol} from Twelve Data`)

  if (await globalRateLimiter.isBlocked()) {
    const remainingMs = globalRateLimiter.getRemainingBlockTime()
    return NextResponse.json(
      {
        success: false,
        error: `ALL API requests blocked due to previous 429 error. Wait ${Math.ceil(remainingMs / 1000)} seconds.`,
        symbol: symbol.toUpperCase(),
        globallyBlocked: true,
        waitTime: remainingMs,
      },
      { status: 429 },
    )
  }

  if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY === "demo") {
    return NextResponse.json(
      {
        success: false,
        error: "TWELVE_DATA_API_KEY environment variable not configured. Please add it in Vercel project settings.",
        symbol: symbol.toUpperCase(),
      },
      { status: 400 },
    )
  }

  try {
    console.log(`[v0] Fetching real market data for ${symbol} from Twelve Data API`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/time_series?symbol=${symbol}&interval=1min&outputsize=390&apikey=${TWELVE_DATA_API_KEY}`,
      { signal: controller.signal },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 429) {
        const errorText = await response.text()
        console.error(`[v0] 429 ERROR - Triggering global block: ${errorText}`)
        await globalRateLimiter.handle429Error(new Error("Rate limit exceeded"))

        return NextResponse.json(
          {
            success: false,
            error: "API rate limit exceeded. ALL API requests blocked for 3 minutes.",
            symbol: symbol.toUpperCase(),
            globallyBlocked: true,
            waitTime: 180000, // 3 minutes
          },
          { status: 429 },
        )
      }

      const errorText = await response.text()
      console.error(`[v0] Twelve Data API error: ${response.status} ${response.statusText} - ${errorText}`)
      return NextResponse.json(
        {
          success: false,
          error: `Twelve Data API error: ${response.status} - ${errorText}`,
          symbol: symbol.toUpperCase(),
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    if (data.code === 429 || (data.status === "error" && data.message && data.message.includes("API credits"))) {
      console.error(`[v0] API credits exhausted - Triggering global block`)
      await globalRateLimiter.handle429Error(new Error("API credits exhausted"))

      return NextResponse.json(
        {
          success: false,
          error: "API credits exhausted. ALL API requests blocked for 3 minutes.",
          symbol: symbol.toUpperCase(),
          globallyBlocked: true,
          waitTime: 180000,
        },
        { status: 429 },
      )
    }

    if (data.status === "error") {
      console.log(`[v0] Twelve Data API returned error for ${symbol}: ${data.message}`)

      return NextResponse.json(
        {
          success: false,
          error: data.message || "API returned error status",
          symbol: symbol.toUpperCase(),
        },
        { status: 400 },
      )
    }

    if (!data.values || data.values.length === 0) {
      console.log(`[v0] No market data available from Twelve Data API for ${symbol}`)
      return NextResponse.json(
        {
          success: false,
          error: "No market data available from API",
          symbol: symbol.toUpperCase(),
        },
        { status: 404 },
      )
    }

    const marketData = data.values
      .map((item: any) => ({
        timestamp: new Date(item.datetime).getTime(),
        open: Number.parseFloat(item.open),
        high: Number.parseFloat(item.high),
        low: Number.parseFloat(item.low),
        close: Number.parseFloat(item.close),
        volume: Number.parseInt(item.volume),
      }))
      .reverse()

    console.log(`[v0] Successfully fetched ${marketData.length} REAL data points for ${symbol}`)

    return NextResponse.json({
      success: true,
      data: marketData,
      symbol: symbol.toUpperCase(),
      synthetic: false,
      count: marketData.length,
    })
  } catch (error) {
    console.error(`[v0] Error fetching market data for ${symbol}:`, error)

    if (error instanceof Error && error.message.includes("429")) {
      await globalRateLimiter.handle429Error(error)
    }

    return NextResponse.json(
      {
        success: false,
        error: error.name === "AbortError" ? "Request timeout" : "Failed to fetch market data",
        symbol: symbol.toUpperCase(),
      },
      { status: 500 },
    )
  }
}
