"use client"
import React, { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Droplets, ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, Waves, MapPin } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import WaterCrossSection from "@/components/water-cross-section"
import Image from "next/image"
import LeafletMap from "@/components/leaflet-station"

interface StationDetailClientProps {
    stationId: string
}

export default function StationDetailClient({ stationId }: StationDetailClientProps) {
    const router = useRouter()
    const numericId = Number.parseInt(stationId)
    const [selectedStation, setSelectedStation] = useState<number | null>(null)
    const SUPABASE_URL = "https://uhsmuwbmimfkffkobunm.supabase.co"
    const SUPABASE_API = `${SUPABASE_URL}/rest/v1/water_levels`
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // ===== Helpers =====
    const generateHistoricalData = (currentLevel: number, normalLevel: number) => {
        const data = []
        const now = new Date()
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000)
            const variation = (Math.random() - 0.5) * 0.3
            const level = Math.max(0, currentLevel + variation - i * 0.01)
            data.push({
                time: time.getHours() + ":00",
                level: Number.parseFloat(level.toFixed(2)),
                timestamp: time,
            })
        }
        return data
    }

    const API_ENDPOINTS = {
        1: null,
        2: null,
        3: null,
        4: `${SUPABASE_API}?station_id=eq.22&order=created_at.desc&limit=1`,
        5: `${SUPABASE_API}?station_id=eq.21&order=created_at.desc&limit=1`
        // 4: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy022",
        // 5: "https://www.cmuccdc.org/api/ccdc/floodboy/Floodboy021",
    }


    const image_station = {
        1: "/images/stations/F21.jpg",
        2: "/images/stations/f22.jpg",
        3: "/images/stations/f22.jpg",
        4: "/images/stations/f22.jpg",
        5: "/images/stations/F21.jpg",
    }

    const fetchStationHistory = async (stationId: number) => {
    try {
        const since = new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString()
        const url = `${SUPABASE_API}?station_id=eq.${stationId}&log_datetime=gte.${since}&order=log_datetime.asc`

        const response = await fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        })

        if (!response.ok) throw new Error(`Supabase error: ${response.status}`)
        const data = await response.json()

        // ❌ ไม่ต้องบวก 7 ชั่วโมง — JS จะตีความเป็นเวลาท้องถิ่นอยู่แล้ว
        return data.map((row: any) => {
        const utcDate = new Date(row.log_datetime)
            const utcString = utcDate.toLocaleString("th-TH", {
                timeZone: "UTC", // ✅ บังคับไม่บวกเวลาไทย
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
            })
            return {
                time: utcString,
                level: row.water_level,
                timestamp: utcDate,
            }
        })
    } catch (err) {
        console.error("Error fetching historical data:", err)
        return []
    }
    }



    const fetchStationData = async (stationId: number) => {
        try {
            const endpoint = API_ENDPOINTS[stationId as keyof typeof API_ENDPOINTS]
            if (!endpoint) return null
            const response = await fetch(endpoint)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const data = await response.json()
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
            currentLevel: 8.85,
            normalLevel: 9.2,
            maxLevel: 9.0,
            leftBank: 9.7,
            rightBank: 9.8,
            flowRate: 425.00,
            bm: 294.2,
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
            normalLevel: 13.0,
            maxLevel: 13.00,
            leftBank: 13.35,
            rightBank: 13.37,
            flowRate: 420.00,
            bm: 289.145,
            status: "normal",
            lastUpdated: new Date(),
            trend: "up",
            historicalData: generateHistoricalData(6.2, 13.0),
            hasAPI: true,
        },
    ]


    // ===== State =====
    const [station, setStation] = useState(() => {
        const found = initialStations.find((s) => s.id === numericId)
        if (!found) return null
        return {
            ...found,
            historicalData: generateHistoricalData(found.currentLevel, found.normalLevel),
        }
    })
    const [isLoading, setIsLoading] = useState(false)

    // ===== Helpers =====
    const determineStatus = (currentLevel: number, normalLevel: number, maxLevel: number) => {
        if (currentLevel >= maxLevel * 0.9) return "high"
        if (currentLevel <= normalLevel * 0.3) return "low"
        return "normal"
    }

    const determineTrend = (current: number, previous: number) => {
        const diff = current - previous
        if (Math.abs(diff) < 0.05) return "stable"
        return diff > 0 ? "up" : "down"
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

    // ===== Data refresh =====
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
        if (station) refreshData()
    }, [])

    useEffect(() => {
        
        if (station) {
            const interval = setInterval(refreshData, 2 * 60 * 1000)
            return () => clearInterval(interval)
        }

    }, [refreshData, station])

    useEffect(() => {
        if (!station) return

        // mapping สถานีในระบบคุณ -> station_id ในตาราง water_levels
        const stationMap: Record<number, number> = {
            4: 22, // FBP.2 = station_id 22
            5: 21, // FBP.3 = station_id 21
        }

        const mappedId = stationMap[station.id]
        if (!mappedId) return // ถ้าไม่อยู่ใน mapping ก็ข้ามไป

        ;(async () => {
            const history = await fetchStationHistory(mappedId)
            setStation((prev) =>
            prev ? { ...prev, historicalData: history } : prev
            )
        })()
        }, [])

    // ===== UI =====
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
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value
        if (value) {
            router.push(`/station/${value}`)
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
                                    {station.hasAPI}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">

                {/* Dropdown and left content */}
                <div className="container mx-auto px-4 py-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* เนื้อหาด้านซ้าย */}
                        <div className="col-span-10">
                            {/* ใส่อะไรก็ได้ */}
                        </div>

                        {/* Dropdown ด้านขวา */}
                        <div className="col-span-12 sm:col-span-2 gap-1">
                            <select
                                onChange={handleChange}
                                defaultValue=""
                                id="dropdown"
                                className="block w-full rounded-xl border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 
                                        text-gray-700 text-base font-medium shadow-lg py-2 px-4 
                                        focus:border-blue-500 focus:ring-4 focus:ring-blue-300 
                                        hover:from-blue-100 hover:to-blue-200 transition-all duration-200 ease-in-out"
                            >
                                <option value="" disabled>
                                    -- กรุณาเลือกสถานี --
                                </option>
                                <option value="1">P.67 - สะพานแม่แฝก</option>
                                <option value="2">P.103 - สะพานป่าข่อยใต้</option>
                                <option value="3">P.1 - สะพานนวรัฐ</option>
                                <option value="4">FBP.2 - สะพานเม็งราย</option>
                                <option value="5">FBP.3 - สะพานวัดเกาะกลาง</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Top section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Station Image */}
                    <div className="lg:col-span-4">
                        <Card className="h-full">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Droplets className="h-5 w-5" />
                                    รูปสถานี
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                    <Image
                                        src={image_station[station.id as keyof typeof image_station] || "/placeholder.svg"}
                                        alt={`รูปสถานี ${station.name}`}
                                        width={400}
                                        height={225}
                                        className="w-full h-full object-cover"
                                        priority
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    {/* General Status */}
                    <div className="lg:col-span-5">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    สถานะข้อมูลทั่วไป : {station.location_name_TH}
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
                                        <div className="text-2xl font-bold text-primary">{station.currentLevel.toFixed(2)} ({(station.bm + station.currentLevel).toFixed(2)})</div>
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
                                        <span>ระดับเตือนภัย:</span>
                                        <span className="font-medium text-yellow-600">{station.maxLevel.toFixed(2)} ม. ({(station.maxLevel+station.bm ).toFixed(2)} ม.รทก.)</span>

                                    </div>
                                    <div className="flex justify-between">
                                        <span>ระดับวิกฤติ:</span>
                                        <span className="font-medium text-red-600">{station.normalLevel.toFixed(2)} ม. ({(station.normalLevel+station.bm ).toFixed(2)} ม.รทก.)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ตลิ่งซ้าย:</span>
                                        <span className="font-medium">{station.leftBank.toFixed(2)} ม. ({(station.leftBank+station.bm ).toFixed(2)} ม.รทก.)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ตลิ่งขวา:</span>
                                        <span className="font-medium">{station.rightBank.toFixed(2)} ม. ({(station.rightBank+station.bm ).toFixed(2)} ม.รทก.) </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>อัปเดต:</span>
                                        <span className="font-medium">{station.lastUpdated.toLocaleString("th-TH", {dateStyle: "medium",timeStyle: "medium"                            })} </span>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                    {/* Map */}
                    <div className="lg:col-span-3">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    แผนที่ที่ตั้ง
                                </CardTitle>
                                <CardContent>
                                    <LeafletMap stations={[station]} selectedStation={selectedStation} onStationSelect={setSelectedStation} />
                                </CardContent>
                            </CardHeader>
                            <CardContent className="space-y-4">

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
                    </div> 

                </div>

                {/* Bottom section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>ภาพตัดขวางลำน้ำ</CardTitle>
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
                                        leftBank={station.leftBank}
                                        bm={station.bm}

                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-8">
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
        </div>
    )
}
