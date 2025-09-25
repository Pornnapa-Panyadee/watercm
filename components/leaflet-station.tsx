"use client"

import { useEffect, useRef } from "react"

// Define types for our station data
interface Station {
  id: number
  code_id: string
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
        return "#2cb01dff" // green
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

      // Initialize map centered on the first station or a default location
      const initialLat = stations.length > 0 ? stations[0].location.lat : 18.75787584// fallback: Bangkok
      const initialLng = stations.length > 0 ? stations[0].location.lng : 99.004632
      const map = L.map(mapRef.current!).setView([initialLat + 0.05, initialLng], 10)

      L.tileLayer("https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}", {
        attribution: ' <a href="https://www.google.com/maps"></a>',
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
                <div style=" position: relative;width: 0;height: 0; ">
                <!-- ขอบขาว -->
                <div style="
                    position: absolute;
                    top: -4px;  /* ระยะห่างจากด้านบน */
                    left: -4px; /* ระยะห่างจากด้านซ้าย */
                    width: 0;
                    height: 0;
                    border-left: 24px solid transparent;
                    border-right: 24px solid transparent;
                    border-bottom: 40px solid white; /* ✅ สามเหลี่ยมขาว (เป็นขอบ) */
                    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
                "></div>

                <!-- สามเหลี่ยมสีสถานะ -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 0;
                    height: 0;
                    border-left: 20px solid transparent;
                    border-right: 20px solid transparent;
                    border-bottom: 35px solid ${getStatusColor(station.status)};
                    cursor: pointer;
                ">
                <div style="
                    position: absolute;
                    top: 8px;
                    left: -8px;
                    width: 16px;
                    height: 24px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 10px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                  ">
                  ${station.code_id}
                </div>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        })


        const popupContent = `
          <div style="
            min-width: 100px;
            font-family: system-ui, -apple-system, sans-serif;
            padding: 8px;
          ">
            <h5 style="
              margin: 0 0 12px 0;
              font-size: 12px;
              font-weight: bold;
              color: #1f2937;
              border-bottom: 2px solid ${getStatusColor(station.status)};
              padding-bottom: 6px;
            ">
              <a href="/station/${station.id}" target="_blank" style="
                color: #1f2937;
                text-decoration: none;
                cursor: pointer;
              " onmouseover="this.style.color='${getStatusColor(station.status)}'" 
                 onmouseout="this.style.color='#1f2937'">
                ${station.name}
              </a>
            </h5>
            <a href="https://www.google.com/maps/dir/?api=1&origin=${initialLat},${initialLng}&destination=${station.location.lat},${station.location.lng}" 
              target="_blank" 
              style="
                display: inline-block;
                padding: 6px 10px;
                font-size: 12px;
                font-weight: 500;
                color: white;
                background-color: #3b82f6;
                border-radius: 6px;
                text-decoration: none;
              "
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'">
               >> ขอเส้นทาง
            </a>
          
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
      <div ref={mapRef} className="w-full h-[200px] rounded-lg" />
    </>
  )
}
