"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Wifi, WifiOff, RefreshCw, RotateCcw } from "lucide-react"

interface RealTimeStatusProps {
  isLive: boolean
  connectionStatus: "connected" | "disconnected" | "connecting"
  lastUpdate: Date | null
  onStartLive: () => void
  onStopLive: () => void
  onRefresh: () => void
  onReset: () => void
}

export function RealTimeStatus({
  isLive,
  connectionStatus,
  lastUpdate,
  onStartLive,
  onStopLive,
  onRefresh,
  onReset,
}: RealTimeStatusProps) {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-3 w-3" />
      case "connecting":
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case "disconnected":
        return <WifiOff className="h-3 w-3" />
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return isLive ? "default" : "secondary"
      case "connecting":
        return "secondary"
      case "disconnected":
        return "destructive"
    }
  }

  const getStatusText = () => {
    if (connectionStatus === "connecting") return "Connecting..."
    if (connectionStatus === "disconnected") return "Disconnected"
    return isLive ? "Live Data" : "Static Data"
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Real-time Status
        </CardTitle>
        <CardDescription>Data streaming and update controls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection:</span>
          <Badge variant={getStatusColor()} className="text-xs">
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </div>

        {lastUpdate && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Update:</span>
            <span className="text-xs font-mono text-muted-foreground">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" disabled={connectionStatus === "connecting"}>
            <RefreshCw className={`h-3 w-3 ${connectionStatus === "connecting" ? "animate-spin" : ""}`} />
          </Button>

          <Button onClick={onReset} variant="outline" size="sm" disabled={connectionStatus === "connecting"}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">Data updates automatically every 5 seconds</div>
      </CardContent>
    </Card>
  )
}
