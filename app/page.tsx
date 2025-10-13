"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Droplets, MapPin, RefreshCw, TrendingUp, TrendingDown, Minus, Waves } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import LeafletMap from "@/components/leaflet-map"
import WaterCrossSection from "@/components/water-cross-section"
import { useRouter } from "next/navigation"


const generateHistoricalData = (currentLevel: number, normalLevel: number) => {
  const data = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000) // 12 hours back

    // 👇 เพิ่มแรงเหวี่ยง (สุ่มได้ตั้งแต่ -2.5 ถึง +2.5)
    const variation = (Math.random() - 0.5) * 5

    // 👇 ปรับ slope ให้ดรอปแรงขึ้น (0.05 ต่อชั่วโมง)
    const level = Math.max(0, currentLevel + variation - i * 0.05)

    data.push({
      time: time.getHours() + ":00",
      level: Number.parseFloat(level.toFixed(2)),
      timestamp: time,
    })
  }

 return data
}


const API_ENDPOINTS = {
  4: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy022", // FBP.2 - สะพานเม็งราย
  5: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy021", // FBP.3 - สะพานวัดเกาะกลาง
}

const fetchStationData = async (stationId: number) => {
  try {
    const endpoint = API_ENDPOINTS[stationId as keyof typeof API_ENDPOINTS]
    if (!endpoint) return null

    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()
    // console.log(`[v0] API data for station ${stationId}:`, data)

    return {
      currentLevel: data.value?.water_level || 0,
      flowRate: data.value?.flow_rate || data.value?.discharge || 0,
      lastUpdated: new Date(data.value?.log_datetime || Date.now()),
      stationName: data.name || data.name_en || `สถานี ${stationId}`,
      // Add more fields as needed based on API response structure
    }
  } catch (error) {
    // console.error(`[v0] Error fetching data for station ${stationId}:`, error)
    return null
  }
}

// Mock data for water monitoring stations with API integration
const initialStations = [
  {
    id: 1,
    code_id: "P.67",
    name: "P.67 - สะพานแม่แฝก",
    location_name_TH: "สะพานแม่แฝก 	บ้านแม่แต ต.แม่แฝกเก่า อ.สันทราย จ.เชียงใหม่",
    location_name_Eng: "Mae Faek Bridge, Ban Mae Tae, Mae Faek Kao, San Sai, Chiang Mai",
    location: { lat: 19.009787, lng: 98.959635 },
    currentLevel: 4.73,
    normalLevel: 8.0,
    maxLevel: 12.2,
    leftBank: 13.5,
    rightBank: 13.5,
    flowRate: 0.0, // m³/s
    status: "normal",
    bm: 315.926,
    lastUpdated: new Date(),
    trend: "down",
    historicalData: generateHistoricalData(4.73, 8.0),
    hasAPI: false,
  },
  {
    id: 2,
    code_id: "P.103",
    name: "P.103 - สะพานป่าข่อยใต้",
    location_name_TH: "สะพานป่าข่อยใต้ ต.สันผีเสื้อ อ.เมือง จ.เชียงใหม่",
    location_name_Eng: "Pa Koi Bridge, San Phi Suea, Muang, Chiang Mai",
    location: { lat: 18.8665052, lng: 98.978431 },
    currentLevel: 5.45,
    normalLevel: 6.0,
    maxLevel: 8.7,
    leftBank: 9.75,
    rightBank: 10.5,
    flowRate: 0.0, // m³/s
    bm: 315.926,
    status: "normal",
    lastUpdated: new Date(),
    trend: "stable",
    historicalData: generateHistoricalData(5.45, 5.5),
    hasAPI: false,
  },
  {
    id: 3,
    code_id: "P.1",
    name: "P.1 - สะพานนวรัฐ",
    location_name_TH: "สะพานนวรัฐ ต.วัดเกตุ อ.เมือง จ.เชียงใหม่",
    location_name_Eng: "Nawarat Bridge, Wat Ket, Muang, Chiang Mai",
    location: { lat: 18.787584, lng: 99.004632 },
    currentLevel: 5.45,
    normalLevel: 6.0,
    maxLevel: 8.7,
    leftBank: 9.75,
    rightBank: 10.5,
    flowRate: 0.0, // m³/s
    bm: 300.5,
    status: "normal",
    lastUpdated: new Date(),
    trend: "stable",
    historicalData: generateHistoricalData(5.45, 5.5),
    hasAPI: false,
  },
  {
    id: 4,
    code_id: "FBP.2",
    name: "FBP.2 - สะพานเม็งราย",
    location_name_TH: "สะพานเม็งรายอนุสรณ์ ต.วัดเกต อ.เมือง จ.เชียงใหม่",
    location_name_Eng: "Mengrai Anuson bridge, Wat Ket, Muang, Chiang Mai",
    location: { lat: 18.766187, lng: 99.003291 },
    currentLevel: 9.80,
    normalLevel: 9.0,
    maxLevel: 9,
    leftBank: 9.7,
    rightBank: 9.8,
    flowRate: 445.00, // m³/s
    bm: 294.97,
    status: "normal",
    lastUpdated: new Date(),
    trend: "up",
    historicalData: generateHistoricalData(10.85, 9.0),
    hasAPI: true,
  },
  {
    id: 5,
    code_id: "FBP.3",
    name: "FBP.3 - สะพานวัดเกาะกลาง",
    location_name_TH: "สะพานวัดเกาะกลาง ต.ป่าแดด อ.เมือง จ.เชียงใหม่",
    location_name_Eng: "Wat Ko Klang Bridge, Pa Daet, Muang, Chiang Mai",
    location: { lat: 18.741756, lng: 98.983531 },
    currentLevel: 6.2,
    normalLevel: 12.0,
    maxLevel: 13.00,
    leftBank: 13.35,
    rightBank: 13.37,
    flowRate: 440.00, // m³/s
    bm: 289.145,
    status: "normal",
    lastUpdated: new Date(),
    trend: "up",
    historicalData: generateHistoricalData(6.2, 13.0),
    hasAPI: true,
  },
]

export default function WaterDashboard() {
  const [stations, setStations] = useState(initialStations)
  const [selectedStation, setSelectedStation] = useState<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const determineStatus = (currentLevel: number, normalLevel: number, maxLevel: number) => {
    if (currentLevel >= maxLevel * 0.95) return "high"
    if (currentLevel <= normalLevel * 0.2) return "low"
    return "normal"
  }

  const determineTrend = (current: number, previous: number) => {
    const diff = current - previous
    if (Math.abs(diff) < 0.05) return "stable"
    return diff > 0 ? "up" : "down"
  }

  const refreshData = useCallback(async () => {
    setIsLoading(true)

    const updatedStations = await Promise.all(
      stations.map(async (station) => {
        if (station.hasAPI) {
          const apiData = await fetchStationData(station.id)
          if (apiData) {
            const newLevel = apiData.currentLevel
            //const newFlowRate = apiData.flowRate
            const previousLevel = station.currentLevel

            return {
              ...station,
              currentLevel: newLevel,
              //flowRate: newFlowRate,
              lastUpdated: apiData.lastUpdated,
              status: determineStatus(newLevel, station.normalLevel, station.maxLevel),
              trend: determineTrend(newLevel, previousLevel),
              historicalData: generateHistoricalData(newLevel, station.normalLevel),
            }
          }
        }

        // Fallback to mock data for stations without API or if API fails
        const newLevel = station.currentLevel + (Math.random() - 0.5) * 0.1
        const newFlowRate = station.flowRate + (Math.random() - 0.5) * 10
        return {
          ...station,
          currentLevel: newLevel,
          flowRate: Math.max(0, newFlowRate),
          lastUpdated: new Date(),
          historicalData: generateHistoricalData(newLevel, station.normalLevel),
        }
      }),
    )

    setStations(updatedStations)
    setLastRefresh(new Date())
    setIsLoading(false)
  }, [stations])

  useEffect(() => {
    refreshData()
  }, []) // Empty dependency array to run only on mount

  useEffect(() => {
    const interval = setInterval(refreshData, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [refreshData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "low":
        return "bg-yellow-500 text-white"
      case "warning":
        return "bg-orange-500 text-white"
      case "normal":
        return "bg-primary text-primary-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "high":
        return "ระดับสูง"
      case "low":
        return "ระดับต่ำ"
      case "warning":
        return "เฝ้าระวัง"
      case "normal":
        return "ปกติ"
      default:
        return "ไม่ทราบ"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-blue-500" />
      case "stable":
        return <Minus className="h-4 w-4 text-muted-foreground" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

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
                <p className="text-sm text-muted-foreground">อัปเดตล่าสุด: {lastRefresh.toLocaleTimeString("th-TH")}</p>
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
              แผนที่สถานีตรวจวัด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeafletMap stations={stations} selectedStation={selectedStation} onStationSelect={setSelectedStation} />
          </CardContent>
        </Card>

        {/* Water Level Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {stations.map((station) => (
            <Card key={station.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <button
                        onClick={() => (window.location.href = `/station/${station.id}`)}
                        className="text-left hover:text-primary transition-colors cursor-pointer"
                      >
                        {station.name}
                      </button>
                      {/* {station.hasAPI && (
                        <Badge variant="outline" className="text-xs">
                          API
                        </Badge>
                      )} */}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      อัปเดต: {station.lastUpdated.toLocaleString("th-TH", {
                              dateStyle: "medium",
                              timeStyle: "medium"
                            })}
                    </p>
                  </div>
                  {getTrendIcon(station.trend)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="space-y-1">
                    {/* Values */}
                    <div className="grid grid-cols-2">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Droplets className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">ระดับน้ำ</span>
                        </div>
                        <div className="text-xl font-bold text-primary">{station.currentLevel.toFixed(2)} ({(station.currentLevel+station.bm).toFixed(2)})</div>
                        <div className="text-xs text-muted-foreground">เมตร (ม.รทก.)</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Waves className="h-4 w-4 text-blue-500" />
                          <span className="text-xs font-medium">อัตราการไหล</span>
                        </div>
                        <div className="text-xl font-bold text-blue-600">{station.flowRate.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">ลบ.ม./วิ</div>
                      </div>
                    </div>

                    {/* Chart */}
                    {/* <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={station.historicalData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <XAxis dataKey="time" hide />
                          <YAxis hide />
                          <Line
                            type="monotone"
                            dataKey="level"
                            stroke={
                              station.status === "high"
                                ? "#ef4444"
                                : station.status === "low"
                                  ? "#eab308"
                                  : station.status === "warning"
                                    ? "#f59e0b"
                                    : "#3b82f6"
                            }
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div> */}
                  </div>

                  <div>
                    <div className="text-xs font-medium mb-1 text-center">ภาพตัดขวางลำน้ำ</div>
                    <WaterCrossSection
                      currentLevel={station.currentLevel}
                      maxLevel={station.maxLevel}
                      normalLevel={station.normalLevel}
                      status={station.status}
                      stationId={station.id}
                      rightBank={station.rightBank}
                      leftBank={station.leftBank}
                      bm={station.bm}
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge className={getStatusColor(station.status)}>{getStatusText(station.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
