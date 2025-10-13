"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Droplets, MapPin, RefreshCw, TrendingUp, TrendingDown, Minus, Waves } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import LeafletMap from "@/components/cnx_tif"
import { useRouter } from "next/navigation"




export default function WaterDashboard() {

  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">ระบบติดตามระดับน้ำ</h1>
              </div>
            </div>
            <Button onClick={() => router.push("/map")} variant="outline"size="sm">
              <MapPin className="h-4 w-4 mr-2" /> ไปที่แผนที่
            </Button>
           
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Map Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              แผนที่ระดับน้ำท่วม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeafletMap />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
