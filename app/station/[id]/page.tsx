"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Droplets, ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, Waves, MapPin } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import WaterCrossSection from "@/components/water-cross-section"

const generateHistoricalData = (currentLevel: number, normalLevel: number) => {
    const data = []
    const now = new Date()

    for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000) // 24 hours back
        const variation = (Math.random() - 0.5) * 0.3 // Random variation
        const level = Math.max(0, currentLevel + variation - i * 0.01) // Slight trend

        data.push({
            time: time.getHours() + ":00",
            level: Number.parseFloat(level.toFixed(2)),
            timestamp: time,
        })
    }

    return data
}

const API_ENDPOINTS = {
    1: null, // P.67 - สะพานแม่แฝก (no API)
    2: null, // P.1 - สะพานนวรัฐ (no API)
    3: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy021", // FBP.2 - สะพานเม็งราย
    4: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy022", // FBP.3 - สะพานวัดเกาะกลาง
}

const fetchStationData = async (stationId: number) => {
    try {
        const endpoint = API_ENDPOINTS[stationId as keyof typeof API_ENDPOINTS]
        if (!endpoint) {
            console.log(`[v0] No API endpoint for station ${stationId}, using mock data`)
            return null
        }

        const response = await fetch(endpoint)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        console.log(`[v0] API data for station ${stationId}:`, data)

        return {
            currentLevel: data.value?.water_level || 0,
            flowRate: data.value?.flow_rate || data.value?.discharge || 0,
            lastUpdated: new Date(data.value?.log_datetime || Date.now()),
            stationName: data.name || data.name_en || `สถานี ${stationId}`,
        }
    } catch (error) {
        console.error(`[v0] Error fetching data for station ${stationId}:`, error)
        return null
    }
}

const initialStations = [
    {
        id: 1,
        name: "P.67 - สะพานแม่แฝก",
        location: { lat: 19.009787, lng: 98.959635 },
        currentLevel: 4.73,
        normalLevel: 8.0,
        maxLevel: 12.2,
        leftBank: 13.5,
        rightBank: 13.5,
        flowRate: 0.0,
        status: "normal",
        lastUpdated: new Date(),
        trend: "down",
        hasAPI: false,
    },
    {
        id: 2,
        name: "P.1 - สะพานนวรัฐ",
        location: { lat: 18.787584, lng: 99.004632 },
        currentLevel: 5.45,
        normalLevel: 5.5,
        maxLevel: 6.7,
        leftBank: 9.75,
        rightBank: 10.5,
        flowRate: 0.0,
        status: "warning",
        lastUpdated: new Date(),
        trend: "stable",
        hasAPI: false,
    },
    {
        id: 3,
        name: "FBP.2 - สะพานเม็งราย",
        location: { lat: 18.766187, lng: 99.003291 },
        currentLevel: 10.85,
        normalLevel: 9.0,
        maxLevel: 9.0,
        leftBank: 9.7,
        rightBank: 9.8,
        flowRate: 0.0,
        status: "normal",
        lastUpdated: new Date(),
        trend: "up",
        hasAPI: true,
    },
    {
        id: 4,
        name: "FBP.3 - สะพานวัดเกาะกลาง",
        location: { lat: 18.741756, lng: 98.983531 },
        currentLevel: 6.2,
        normalLevel: 13.0,
        maxLevel: 12.5,
        leftBank: 13.35,
        rightBank: 13.37,
        flowRate: 0.0,
        status: "high",
        lastUpdated: new Date(),
        trend: "up",
        hasAPI: true,
    },
]

export default function StationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const stationId = Number.parseInt(params.id as string)

    const [station, setStation] = useState(() => {
        const foundStation = initialStations.find((s) => s.id === stationId)
        if (!foundStation) return null
        return {
            ...foundStation,
            historicalData: generateHistoricalData(foundStation.currentLevel, foundStation.normalLevel),
        }
    })

    const [isLoading, setIsLoading] = useState(false)

    const determineStatus = (currentLevel: number, normalLevel: number, maxLevel: number) => {
        if (currentLevel >= maxLevel * 0.8) return "high"
        if (currentLevel <= normalLevel * 0.7) return "low"
        return "normal"
    }

    const determineTrend = (current: number, previous: number) => {
        const diff = current - previous
        if (Math.abs(diff) < 0.05) return "stable"
        return diff > 0 ? "up" : "down"
    }

    const refreshData = useCallback(async () => {
        if (!station) return

        setIsLoading(true)

        if (station.hasAPI) {
            const apiData = await fetchStationData(station.id)
            if (apiData) {
                const newLevel = apiData.currentLevel
                const newFlowRate = apiData.flowRate
                const previousLevel = station.currentLevel

                setStation((prev) =>
                    prev
                        ? {
                            ...prev,
                            currentLevel: newLevel,
                            flowRate: newFlowRate,
                            lastUpdated: apiData.lastUpdated,
                            status: determineStatus(newLevel, prev.normalLevel, prev.maxLevel),
                            trend: determineTrend(newLevel, previousLevel),
                            historicalData: generateHistoricalData(newLevel, prev.normalLevel),
                        }
                        : null,
                )
            }
        } else {
            // Mock data update for stations without API
            const newLevel = station.currentLevel + (Math.random() - 0.5) * 0.1
            const newFlowRate = station.flowRate + (Math.random() - 0.5) * 10

            setStation((prev) =>
                prev
                    ? {
                        ...prev,
                        currentLevel: newLevel,
                        flowRate: Math.max(0, newFlowRate),
                        lastUpdated: new Date(),
                        historicalData: generateHistoricalData(newLevel, prev.normalLevel),
                    }
                    : null,
            )
        }

        setIsLoading(false)
    }, [station])

    useEffect(() => {
        if (station) {
            refreshData()
        }
    }, []) // Empty dependency array to run only on mount

    useEffect(() => {
        if (station) {
            const interval = setInterval(refreshData, 2 * 60 * 1000) // 2 minutes for detail page
            return () => clearInterval(interval)
        }
    }, [refreshData, station])

    if (!station) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-bold mb-2">ไม่พบข้อมูลสถานี</h2>
                        <p className="text-muted-foreground mb-4">ไม่พบสถานีที่มี ID: {stationId}</p>
                        <Button onClick={() => router.push("/")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            กลับหน้าหลัก
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                return <TrendingUp className="h-5 w-5 text-red-500" />
            case "down":
                return <TrendingDown className="h-5 w-5 text-blue-500" />
            case "stable":
                return <Minus className="h-5 w-5 text-muted-foreground" />
            default:
                return <Minus className="h-5 w-5 text-muted-foreground" />
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                กลับ
                            </Button>
                            <Droplets className="h-8 w-8 text-primary" />
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{station.name}</h1>
                                <p className="text-sm text-muted-foreground">
                                    อัปเดตล่าสุด: {station.lastUpdated.toLocaleTimeString("th-TH")}
                                    {station.hasAPI && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            API
                                        </Badge>
                                    )}
                                </p>
                            </div>
                        </div>
                        <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                            {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Station Image */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Droplets className="h-5 w-5" />
                                รูปสถานี
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Droplets className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">รูปภาพสถานี</p>
                                    <p className="text-xs">{station.name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Map Location */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                แผนที่ที่ตั้ง
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">แผนที่ตำแหน่งสถานี</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>ละติจูด:</span>
                                    <span className="font-medium">{station.location.lat.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ลองจิจูด:</span>
                                    <span className="font-medium">{station.location.lng.toFixed(6)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* General Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                สถานะข้อมูลทั่วไป
                                {getTrendIcon(station.trend)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Droplets className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-medium">ระดับน้ำ</span>
                                    </div>
                                    <div className="text-2xl font-bold text-primary">{station.currentLevel.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">เมตร (ม.รทก.)</div>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Waves className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm font-medium">อัตราการไหล</span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{station.flowRate.toFixed(1)}</div>
                                    <div className="text-xs text-muted-foreground">ลบ.ม./วิ</div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>ระดับปกติ:</span>
                                    <span className="font-medium">{station.normalLevel.toFixed(2)} ม.</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ระดับเตือนภัย:</span>
                                    <span className="font-medium text-red-600">{station.maxLevel.toFixed(2)} ม.</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ตลิ่งซ้าย:</span>
                                    <span className="font-medium">{station.leftBank.toFixed(2)} ม.</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ตลิ่งขวา:</span>
                                    <span className="font-medium">{station.rightBank.toFixed(2)} ม.</span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Badge className={getStatusColor(station.status)} variant="secondary">
                                    {getStatusText(station.status)}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cross-section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>ภาพตัดขวางระดับน้ำ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <WaterCrossSection
                                    currentLevel={station.currentLevel}
                                    maxLevel={station.maxLevel}
                                    normalLevel={station.normalLevel}
                                    status={station.status}
                                    stationId={station.id}
                                    rightBank={station.rightBank}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Historical Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>กราฟระดับน้ำ 24 ชั่วโมงที่ผ่านมา</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={station.historicalData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="time" fontSize={12} interval="preserveStartEnd" />
                                        <YAxis fontSize={12} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                                        <Tooltip
                                            labelFormatter={(value) => `เวลา: ${value}`}
                                            formatter={(value: number) => [`${value.toFixed(2)} ม.`, "ระดับน้ำ"]}
                                        />
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
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
