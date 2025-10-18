"use client"

import { useRef } from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Info, Droplets } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const useMapEvents = dynamic(() => import("react-leaflet").then((mod) => mod.useMapEvents), { ssr: false })
const useMap = dynamic(() => import("react-leaflet").then((mod) => mod.useMap), { ssr: false })

interface WaterLevelData {
  x: number
  y: number
  value: number
  lat: number
  lon: number
}

interface TiffDataType {
  image: any
  rasters: any
  width: number
  height: number
  bbox: [number, number, number, number]
  canvas: HTMLCanvasElement
}

function MapClickHandler({
  tiffData,
  onPointSelect,
}: {
  tiffData: TiffDataType | null
  onPointSelect: (point: WaterLevelData | null) => void
}) {
  useMapEvents({
    click: (e) => {
      if (!tiffData) return

      const { lat, lng } = e.latlng
      const [minX, minY, maxX, maxY] = tiffData.bbox

      // Convert lat/lng to pixel coordinates
      const x = Math.floor(((lng - minX) / (maxX - minX)) * tiffData.width)
      const y = Math.floor(((maxY - lat) / (maxY - minY)) * tiffData.height)

      if (x >= 0 && x < tiffData.width && y >= 0 && y < tiffData.height) {
        const index = y * tiffData.width + x
        const value = tiffData.rasters[0][index]

        if (value !== -9999 && value !== 0) {
          onPointSelect({ x, y, value, lat, lon: lng })
        }
      }
    },
  })

  return null
}

function TiffOverlay({ tiffData }: { tiffData: TiffDataType | null }) {
  const map = useMap()
  const overlayRef = useRef<any>(null)

  useEffect(() => {
    if (!map || !tiffData) return

    const addOverlay = async () => {
      const L = (await import("leaflet")).default

      // Remove existing overlay
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current)
      }

      const canvas = tiffData.canvas
      const imageUrl = canvas.toDataURL()
      const [minX, minY, maxX, maxY] = tiffData.bbox

      // Create image overlay
      overlayRef.current = L.imageOverlay(imageUrl, [
        [minY, minX],
        [maxY, maxX],
      ]).addTo(map)

      // Fit map to bounds
      map.fitBounds([
        [minY, minX],
        [maxY, maxX],
      ])
    }

    addOverlay()

    return () => {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current)
      }
    }
  }, [map, tiffData])

  return null
}

export default function TiffMapViewer() {
  const [tiffData, setTiffData] = useState<TiffDataType | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<WaterLevelData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadTiffFile()
  }, [])

  const loadTiffFile = async () => {
    setIsLoading(true)
    try {
      // Import geotiff dynamically
      const { fromArrayBuffer } = await import("geotiff")

      // Fetch TIFF file from public folder
      const response = await fetch("/data/cnxlpn_color.tif")
      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดไฟล์ TIFF ได้")
      }

      const arrayBuffer = await response.arrayBuffer()
      const tiff = await fromArrayBuffer(arrayBuffer)
      const image = await tiff.getImage()
      const rasters = await image.readRasters()
      const bbox = image.getBoundingBox()

      // Create canvas for TIFF rendering
      const canvas = document.createElement("canvas")
      const width = image.getWidth()
      const height = image.getHeight()
      canvas.width = width
      canvas.height = height

      // Render TIFF to canvas
      renderTiff(canvas, rasters, width, height)

      setTiffData({
        image,
        rasters,
        width,
        height,
        bbox,
        canvas,
      })
    } catch (error) {
      console.error("Error loading TIFF:", error)
      alert("เกิดข้อผิดพลาดในการโหลดไฟล์ TIFF กรุณาตรวจสอบว่าไฟล์อยู่ที่ /public/data/cnxlpn_color.tif")
    } finally {
      setIsLoading(false)
    }
  }

  const renderTiff = (canvas: HTMLCanvasElement, rasters: any, width: number, height: number) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imageData = ctx.createImageData(width, height)
    const data = rasters[0] // First band

    // Find min and max for normalization
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== -9999 && data[i] !== 0) {
        min = Math.min(min, data[i])
        max = Math.max(max, data[i])
      }
    }

    // Render with color scale and transparency for no-data
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const pixelIndex = i * 4

      if (value === -9999 || value === 0) {
        imageData.data[pixelIndex] = 0
        imageData.data[pixelIndex + 1] = 0
        imageData.data[pixelIndex + 2] = 0
        imageData.data[pixelIndex + 3] = 0
      } else {
        // Normalize value to 0-1 range
        const normalized = (value - min) / (max - min)

        // Color scale: blue (low) to cyan to yellow (high)
        let r, g, b
        if (normalized < 0.5) {
          const t = normalized * 2
          r = Math.floor(0 * (1 - t) + 0 * t)
          g = Math.floor(100 * (1 - t) + 200 * t)
          b = Math.floor(200 * (1 - t) + 255 * t)
        } else {
          const t = (normalized - 0.5) * 2
          r = Math.floor(0 * (1 - t) + 255 * t)
          g = Math.floor(200 * (1 - t) + 220 * t)
          b = Math.floor(255 * (1 - t) + 0 * t)
        }

        imageData.data[pixelIndex] = r
        imageData.data[pixelIndex + 1] = g
        imageData.data[pixelIndex + 2] = b
        imageData.data[pixelIndex + 3] = 200
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">แผนที่ระดับน้ำ</h1>
              <p className="text-sm text-muted-foreground">Water Level Map Viewer</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-6 overflow-hidden">
        <div className="flex-1 relative">
          <Card className="h-full w-full overflow-hidden bg-card border-border">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 animate-pulse">
                  <Droplets className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">กำลังโหลดแผนที่...</h3>
                  <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
                </div>
              </div>
            ) : !tiffData ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
                  <Droplets className="w-10 h-10 text-destructive" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">ไม่สามารถโหลดแผนที่ได้</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    กรุณาตรวจสอบว่าไฟล์ cnxlpn_color.tif อยู่ในโฟลเดอร์ /public/data/
                  </p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={[13.7563, 100.5018]}
                zoom={6}
                className="h-full w-full"
                style={{ background: "#0a0a0a" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <TiffOverlay tiffData={tiffData} />
                <MapClickHandler tiffData={tiffData} onPointSelect={setSelectedPoint} />
              </MapContainer>
            )}
          </Card>
        </div>

        {/* Info Panel */}
        <div className="w-80 space-y-4">
          {/* Instructions Card */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 shrink-0">
                <Info className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">วิธีใช้งาน</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
                  <li>• คลิกที่จุดใดก็ได้บนแผนที่</li>
                  <li>• ดูค่าระดับน้ำที่จุดนั้น</li>
                  <li>• พื้นที่โปร่งใสคือพื้นที่ไม่มีข้อมูล</li>
                  <li>• ซูมและเลื่อนแผนที่ได้ตามต้องการ</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Selected Point Info */}
          {selectedPoint && (
            <Card className="p-6 bg-card border-border">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <Droplets className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">ข้อมูล ณ จุดที่เลือก</h3>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">ระดับน้ำ (Water Level)</div>
                    <div className="text-2xl font-bold text-primary font-mono">{selectedPoint.value.toFixed(2)} m</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary">
                      <div className="text-xs text-muted-foreground mb-1">Pixel X</div>
                      <div className="text-lg font-semibold text-foreground font-mono">{selectedPoint.x}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary">
                      <div className="text-xs text-muted-foreground mb-1">Pixel Y</div>
                      <div className="text-lg font-semibold text-foreground font-mono">{selectedPoint.y}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-secondary">
                      <div className="text-xs text-muted-foreground mb-1">Latitude</div>
                      <div className="text-sm font-semibold text-foreground font-mono">
                        {selectedPoint.lat.toFixed(6)}°
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary">
                      <div className="text-xs text-muted-foreground mb-1">Longitude</div>
                      <div className="text-sm font-semibold text-foreground font-mono">
                        {selectedPoint.lon.toFixed(6)}°
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Color Legend */}
          {tiffData && (
            <Card className="p-6 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-4">สเกลสี (Color Scale)</h3>
              <div className="space-y-3">
                <div
                  className="h-8 rounded-lg"
                  style={{
                    background: "linear-gradient(to right, rgb(0, 100, 200), rgb(0, 200, 255), rgb(255, 220, 0))",
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ต่ำ (Low)</span>
                  <span>กลาง (Medium)</span>
                  <span>สูง (High)</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
