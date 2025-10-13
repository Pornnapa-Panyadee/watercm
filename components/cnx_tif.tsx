"use client"

import { useEffect } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { plot } from "plotty"
import { fromUrl } from "geotiff"

export default function MapPage() {
  useEffect(() => {
    const container = L.DomUtil.get("map")
    if (container != null) container._leaflet_id = null

    // 🗺️ สร้างแผนที่พื้นฐาน
    const map = L.map("map").setView([18.69, 98.98], 12)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    async function loadTiff() {
      try {
        // ✅ โหลด GeoTIFF
        const tiff = await fromUrl("/data/cnxlpn_color.tif")
        const image = await tiff.getImage()
        const rasters = await image.readRasters()
        const values = rasters[0]
        const width = image.getWidth()
        const height = image.getHeight()
        const [minX, minY, maxX, maxY] = image.getBoundingBox()

        // ✅ หาค่าช่วงจริงในข้อมูล (min, max)
        let minVal = Infinity
        let maxVal = -Infinity
        for (let i = 0; i < values.length; i++) {
          const v = values[i]
          if (v < minVal) minVal = v
          if (v > maxVal) maxVal = v
        }
        

        // ✅ ใช้ plotty ทำสี raster
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const p = new plot({
          canvas,
          data: values,
          width,
          height,
          domain: [minVal, maxVal], // ค่าจริง
          colorScale: "viridis", // หรือ "viridis", "jet", "rainbow"
        })
        p.render()

        // ✅ แสดงบนแผนที่ (overlay)
        const imageUrl = canvas.toDataURL()
        const imageBounds: L.LatLngBoundsExpression = [
          [minY, minX],
          [maxY, maxX],
        ]
        const overlay = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.7 })
        overlay.addTo(map)

        // ✅ เพิ่ม Legend แสดงสีด้านล่างขวา
        const legend = L.control({ position: "bottomright" })
        legend.onAdd = function () {
          const div = L.DomUtil.create("div", "info legend bg-white p-2 rounded shadow")
          const legendCanvas = document.createElement("canvas")
          legendCanvas.width = 120
          legendCanvas.height = 12

          // สร้าง legend จาก color scale เดียวกัน
          const legendPlot = new plot({
            canvas: legendCanvas,
            data: new Float32Array(Array.from({ length: 120 }, (_, i) => minVal + (i / 120) * (maxVal - minVal))),
            width: 120,
            height: 1,
            domain: [minVal, maxVal],
            colorScale: "viridis",
          })
          legendPlot.render()

          div.innerHTML = `
            <b>ระดับน้ำ (ซม.)</b><br/>
            <img src="${legendCanvas.toDataURL()}" width="120" height="20"/>
            <span style="font-size:10px">${minVal.toFixed(2)} → ${maxVal.toFixed(2)}</span>
          `
          return div
        }
        legend.addTo(map)

        // ✅ อ่านค่า pixel เมื่อคลิก
        map.on("click", async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng

          // แปลงพิกัดเป็นตำแหน่งใน raster
          const x = Math.floor(((lng - minX) / (maxX - minX)) * width)
          const y = Math.floor((1 - (lat - minY) / (maxY - minY)) * height)

          // อ่านค่า pixel จากตำแหน่งนั้น
          const pixel = await image.readRasters({ window: [x, y, x + 1, y + 1] })
          const val = pixel[0][0]

          if (val !== undefined && !isNaN(val)) {
            L.popup()
              .setLatLng(e.latlng)
              .setContent(`ค่าระดับน้ำ: <b>${val.toFixed(2)}</b> ซม.`)
              .openOn(map)
          }
        })
      } catch (err) {
        console.error("Error loading GeoTIFF:", err)
      }
    }

    loadTiff()
  }, [])

  return <div id="map" className="w-full h-screen" />
}
