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
            <Button onClick={() => router.push("/")} variant="outline"size="sm">
              <MapPin className="h-4 w-4 mr-2" /> Home
            </Button>
           
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 🗺️ แผนที่ (9 ส่วน) */}
          <div className="col-span-12 md:col-span-9">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  แผนที่การประมาณค่าระดับน้ำเชิงพื้นที่
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeafletMap />
              </CardContent>
            </Card>
          </div>

          {/* 📘 วิธีใช้งาน (3 ส่วน) */}
          <div className="col-span-12 md:col-span-3">
            <Card className="h-full border border-blue-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  วิธีใช้งาน
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                  <li>คลิกที่จุดใดก็ได้บนแผนที่</li>
                  <li>ดูค่าระดับน้ำที่จุดนั้น</li>
                  <li>ซูมและเลื่อนแผนที่ได้ตามต้องการ</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
