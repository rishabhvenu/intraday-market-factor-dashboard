import { type NextRequest, NextResponse } from "next/server"
import { globalRateLimiter } from "@/lib/global-rate-limiter"

export async function GET(request: NextRequest) {
  try {
    if (await globalRateLimiter.isBlocked()) {
      console.log("[v0] Market snapshot blocked - API credits exhausted")
      return NextResponse.json(
        {
          error: "API credits exhausted for today. Please wait until tomorrow or upgrade your plan.",
          creditsExhausted: true,
          remainingBlockTime: globalRateLimiter.getRemainingBlockTime(),
        },
        { status: 429 },
      )
    }

    console.log("[v0] Fetching market snapshot using batch API")

    const response = await fetch(`${request.nextUrl.origin}/api/market-data-batch`)
    if (!response.ok) {
      if (response.status === 429) {
        await globalRateLimiter.handle429Error(new Error("Rate limit exceeded"))
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

    const batchResponse = await response.json()

    if (batchResponse.serviceUnavailable) {
      return NextResponse.json(
        {
          error: batchResponse.error || "Market data temporarily unavailable. Please try again later.",
          serviceUnavailable: true,
        },
        { status: 503 },
      )
    }

    const symbols = Object.entries(batchResponse)
      .filter(([key]) => !key.startsWith("_"))
      .map(([symbol, symbolData]: [string, any]) => {
        if (!symbolData || symbolData.error) {
          return {
            symbol,
            name: symbolData?.name || symbol,
            type: "stock",
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            error: symbolData?.error || "No data available",
          }
        }

        return {
          symbol,
          name: symbolData.name || symbol,
          type: "stock",
          price: symbolData.price || 0,
          change: symbolData.change || 0,
          changePercent: symbolData.percent_change || 0,
          volume: symbolData.volume || 0,
        }
      })

    console.log(`[v0] Successfully processed ${symbols.length} symbols from batch request`)

    return NextResponse.json({
      symbols,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching market snapshot:", error)

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
