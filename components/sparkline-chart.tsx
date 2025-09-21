"use client"

import { Line, LineChart, ResponsiveContainer } from "recharts"

interface SparklineChartProps {
  data: Array<{ datetime: string; close: number }>
  color?: string
  className?: string
}

export function SparklineChart({ data, color = "hsl(var(--primary))", className }: SparklineChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>
      </div>
    )
  }

  // Take last 20 data points for sparkline
  const sparklineData = data.slice(-20).map((item, index) => ({
    index,
    value: item.close,
  }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
