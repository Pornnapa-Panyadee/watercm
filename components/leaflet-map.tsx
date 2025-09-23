"use client"

import { useEffect, useRef } from "react"

// Define types for our station data
interface Station {
  id: number
  name: string
  location: { lat: number; lng: number }
  currentLevel: number
  normalLevel: number
  maxLevel: number
  status: string
  lastUpdated: Date
  trend: string
}

interface LeafletMapProps {
  stations: Station[]
  selectedStation: number | null
  onStationSelect: (stationId: number | null) => void
}

export default function LeafletMap({ stations, selectedStation, onStationSelect }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "#dc2626" // red
      case "low":
        return "#eab308" // yellow
      case "normal":
        return "#2563eb" // blue
      default:
        return "#6b7280" // gray
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "high":
        return "ระดับสูง"
      case "low":
        return "ระดับต่ำ"
      case "normal":
        return "ปกติ"
      default:
        return "ไม่ทราบ"
    }
  }

  useEffect(() => {
    if (!mapRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    const initMap = async () => {
      const L = (await import("leaflet")).default

      // Fix for default markers in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      // Initialize map centered on new coordinates and adjusted zoom level
      const map = L.map(mapRef.current!).setView([18.75787584, 99.004632], 12)

      L.tileLayer("https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}", {
        attribution: '© <a href="https://www.google.com/maps">Google Maps</a>',
        maxZoom: 20,
      }).addTo(map)

      mapInstanceRef.current = map

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      // Add station markers
      stations.forEach((station) => {
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              background-color: ${getStatusColor(station.status)};
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              cursor: pointer;
            ">
              ${station.id}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })

        const popupContent = `
          <div style="
            min-width: 250px;
            font-family: system-ui, -apple-system, sans-serif;
            padding: 8px;
          ">
            <h3 style="
              margin: 0 0 12px 0;
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              border-bottom: 2px solid ${getStatusColor(station.status)};
              padding-bottom: 6px;
            ">${station.name}</h3>
            
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">ระดับน้ำปัจจุบัน:</strong>
              <span style="
                font-size: 16px;
                font-weight: bold;
                color: ${getStatusColor(station.status)};
                margin-left: 8px;
              ">${station.currentLevel.toFixed(2)} ม.</span>
            </div>
            
            <div style="margin-bottom: 8px;">
              <strong style="color: #374151;">ระดับปกติ:</strong>
              <span style="margin-left: 8px;">${station.normalLevel.toFixed(2)} ม.</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151;">สถานะ:</strong>
              <span style="
                background-color: ${getStatusColor(station.status)};
                color: white;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 8px;
              ">${getStatusText(station.status)}</span>
            </div>
            
            <div style="
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 8px;
            ">
              อัปเดตล่าสุด: ${station.lastUpdated.toLocaleString("th-TH")}
            </div>
          </div>
        `

        const marker = L.marker([station.location.lat, station.location.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent, {
            maxWidth: 300,
            closeButton: true,
            autoClose: false,
            closeOnEscapeKey: true,
            className: "custom-popup",
          })

        markersRef.current.push(marker)
      })
    }

    initMap()

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [stations, selectedStation, onStationSelect])

  return (
    <>
      {/* Load Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-[500px] rounded-lg" />
    </>
  )
}
