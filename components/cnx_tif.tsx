"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { fromUrl } from "geotiff"
import { fromArrayBuffer } from "geotiff"

export default function CnxTif() {
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    async function initMap() {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const L = (await import("leaflet")).default

      // 🗺️ สร้างแผนที่และตั้งค่าศูนย์กลาง
      const map = L.map("map", { center: [18.69, 98.98], zoom: 11 })
      mapRef.current = map

      // 🛰️ Google Satellite
      const googleSat = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=YOUR_API_KEY",
        {
          maxZoom: 20,
          attribution: "&copy; Google Satellite",
        }
      )

      // 🏔️ Google Terrain
      const googleTerrain = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=YOUR_API_KEY",
        {
          maxZoom: 20,
          attribution: "&copy; Google Terrain",
        }
      )

      // 🌫️ None (transparent basemap)
      const noBase = L.tileLayer("", {})
      

      // ค่าเริ่มต้นเป็น Satellite
      googleSat.addTo(map)

      // ✅ โหลด GeoTIFF (เวอร์ชันใหม่: ปลอดภัยและรองรับมือถือ)
      let data, width, height, bbox, minX, minY, maxX, maxY, image

      try {
        const response = await fetch("/data/cnxlpn_color.tif")
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()
        const tiff = await fromArrayBuffer(arrayBuffer)
        image = await tiff.getImage()
        const rasters = await image.readRasters()
        data = rasters[0]
        width = image.getWidth()
        height = image.getHeight()
        bbox = image.getBoundingBox()
        ;[minX, minY, maxX, maxY] = bbox

        console.log("✅ GeoTIFF loaded successfully:", { width, height })
      } catch (error) {
        console.error("❌ GeoTIFF load error:", error)
        alert("ไม่สามารถโหลดแผนที่ GeoTIFF ได้ กรุณารีเฟรชหรือใช้คอมพิวเตอร์แทน")
        return // หยุดทำงาน ถ้าโหลดไม่ได้
      }

      // ✅ คำนวณ min/max
      let min = Infinity
      let max = -Infinity
      if (ArrayBuffer.isView(data)) {
        for (let i = 0; i < data.length; i++) {
          const v = data[i]
          if (v !== -9999 && v !== 0 && !isNaN(v)) {
            if (v < min) min = v
            if (v > max) max = v
          }
        }
      } else if (typeof data === "number") {
        const v = data
        if (v !== -9999 && v !== 0 && !isNaN(v)) {
          min = v
          max = v
        }
      }

      // ✅ สร้าง Canvas
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      const imageData = ctx.createImageData(width, height)

      // 🎨 gradient: ฟ้าอ่อน → ฟ้า → น้ำเงิน → น้ำเงินเข้ม
      const getColor = (normalized: number): [number, number, number] => {
        if (normalized < 0.33) {
          const t = normalized / 0.33
          const r = Math.floor(168 * (1 - t) + 51 * t)
          const g = Math.floor(216 * (1 - t) + 153 * t)
          const b = Math.floor(255 * (1 - t) + 255 * t)
          return [r, g, b]
        } else if (normalized < 0.66) {
          const t = (normalized - 0.33) / 0.33
          const r = Math.floor(51 * (1 - t) + 0 * t)
          const g = Math.floor(153 * (1 - t) + 68 * t)
          const b = Math.floor(255 * (1 - t) + 204 * t)
          return [r, g, b]
        } else {
          // For normalized >= 0.66
          const t = (normalized - 0.66) / 0.34
          const r = Math.floor(0 * (1 - t) + 0 * t)
          const g = Math.floor(68 * (1 - t) + 17 * t)
          const b = Math.floor(204 * (1 - t) + 51 * t)
          return [r, g, b]
        }
      }
      // ✅ Render pixel สี
      if (ArrayBuffer.isView(data)) {
        for (let i = 0; i < data.length; i++) {
          const value = data[i]
          const pixelIndex = i * 4

          if (value === -9999 || value === 0 || isNaN(value)) {
            imageData.data[pixelIndex + 3] = 0
          } else {
            const normalized = (value - min) / (max - min)
            const [r, g, b] = getColor(normalized)
            imageData.data[pixelIndex] = r
            imageData.data[pixelIndex + 1] = g
            imageData.data[pixelIndex + 2] = b
            imageData.data[pixelIndex + 3] = 220
          }
        }
      } else if (typeof data === "number") {
        // Single value case
        const value = data
        const pixelIndex = 0
        if (value === -9999 || value === 0 || isNaN(value)) {
          imageData.data[pixelIndex + 3] = 0
        } else {
          const normalized = (value - min) / (max - min)
          const [r, g, b] = getColor(normalized)
          imageData.data[pixelIndex] = r
          imageData.data[pixelIndex + 1] = g
          imageData.data[pixelIndex + 2] = b
          imageData.data[pixelIndex + 3] = 220
        }
      }

      ctx.putImageData(imageData, 0, 0)

      // ✅ Overlay Raster
      const bounds: L.LatLngBoundsExpression = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ]
      const rasterLayer = L.imageOverlay(canvas.toDataURL(), bounds, { opacity: 1 })
      rasterLayer.addTo(map)

      // ✅ Layer Control
      const baseLayers = {
        "🛰️ Google Satellite": googleSat,
        "🏔️ Google Terrain": googleTerrain,
      }
      const overlays = { "📈 Raster Layer": rasterLayer }
      L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map)

      // ✅ Legend
      const L_any = L as any
      const legend = L_any.control({ position: "bottomright" })
      legend.onAdd = function () {
        const div = L.DomUtil.create("div", "info legend bg-white p-2 rounded shadow")
        const legendCanvas = document.createElement("canvas")
        legendCanvas.width = 120
        legendCanvas.height = 12
        const lctx = legendCanvas.getContext("2d")!
        const grad = lctx.createLinearGradient(0, 0, 120, 0)
        grad.addColorStop(0, "#A8D8FF")
        grad.addColorStop(0.33, "#3399FF")
        grad.addColorStop(0.66, "#0044CC")
        grad.addColorStop(1, "#001133")
        lctx.fillStyle = grad
        lctx.fillRect(0, 0, 120, 12)

        div.innerHTML = `
          <b>ระดับน้ำ (ซม.)</b><br/>
          <img src="${legendCanvas.toDataURL()}" width="120" height="12"/><br/>
          <span style="font-size:10px">${min.toFixed(2)} → ${max.toFixed(2)}</span>
        `
        return div
      }
      legend.addTo(map)

      // ✅ แสดงค่าพิกเซลเมื่อคลิก
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng
        const x = Math.floor(((lng - minX) / (maxX - minX)) * width)
        const y = Math.floor((1 - (lat - minY) / (maxY - minY)) * height)
        if (x < 0 || y < 0 || x >= width || y >= height) return

        const pixel = await image.readRasters({ window: [x, y, x + 1, y + 1] })
        const val = ArrayBuffer.isView(pixel[0]) ? pixel[0][0] : pixel[0]

        if (val !== undefined && !isNaN(val) && val !== -9999 && val !== 0) {
          L.popup()
            .setLatLng(e.latlng)
            .setContent(`ค่าระดับน้ำ: <b>${val.toFixed(2)}</b> ซม.`)
            .openOn(map)
        }
      })
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div id="map" className="w-full h-[80vh]" />
}
