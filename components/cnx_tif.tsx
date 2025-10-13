"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { fromUrl } from "geotiff"

export default function CnxTif() {
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    async function initMap() {
      // ✅ ป้องกันสร้างซ้ำ
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const L = (await import("leaflet")).default
      const plotty = await import("plotty")

      const map = L.map("map").setView([18.69, 98.98], 12)
      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 15,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map)

      // ✅ โหลด GeoTIFF
      const tiff = await fromUrl("/data/cnxlpn_color.tif")
      const image = await tiff.getImage()
      const rasters = await image.readRasters()
      const values = rasters[0]
      const width = image.getWidth()
      const height = image.getHeight()
      const [minX, minY, maxX, maxY] = image.getBoundingBox()

      // ✅ คำนวณ min/max แบบปลอดภัย
      let minVal = Infinity
      let maxVal = -Infinity
      if (ArrayBuffer.isView(values)) {
        for (let i = 0; i < values.length; i++) {
          const v = values[i]
          if (v < minVal) minVal = v
          if (v > maxVal) maxVal = v
        }
      } else if (typeof values === "number") {
        minVal = maxVal = values
      }

      // ✅ plot raster ด้วย plotty
      const canvas = document.createElement("canvas")
      const Plot = (plotty as any).plot || (plotty as any).default?.plot
      const plot = new Plot({
        canvas,
        data: values,
        width,
        height,
        domain: [minVal, maxVal],
        colorScale: "viridis",
      })
      plot.render()

      // ✅ overlay raster บนแผนที่
      const bbox = image.getBoundingBox()
      const bounds: L.LatLngBoundsExpression = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ]
      L.imageOverlay(canvas.toDataURL(), bounds).addTo(map)

      // ✅ เพิ่ม legend ด้านล่างขวา
      const legend = L.control({ position: "bottomright" })
      legend.onAdd = function () {
        const div = L.DomUtil.create(
          "div",
          "info legend bg-white p-2 rounded shadow"
        )
        const legendCanvas = document.createElement("canvas")
        legendCanvas.width = 120
        legendCanvas.height = 12

        // ✅ ใช้ color scale เดียวกันกับ raster
        const LegendPlot = new Plot({
          canvas: legendCanvas,
          data: new Float32Array(
            Array.from({ length: 120 }, (_, i) => minVal + (i / 120) * (maxVal - minVal))
          ),
          width: 120,
          height: 1,
          domain: [minVal, maxVal],
          colorScale: "viridis",
        })
        LegendPlot.render()

        div.innerHTML = `
          <b>ระดับน้ำ (ซม.)</b><br/>
          <img src="${legendCanvas.toDataURL()}" width="120" height="20"/><br/>
          <span style="font-size:10px">${minVal.toFixed(2)} → ${maxVal.toFixed(2)}</span>
        `
        return div
      }
      legend.addTo(map)

      // ✅ แสดงค่าพิกเซลเมื่อคลิก
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng

        // แปลงพิกัดแผนที่เป็นพิกัด pixel
        const x = Math.floor(((lng - minX) / (maxX - minX)) * width)
        const y = Math.floor((1 - (lat - minY) / (maxY - minY)) * height)

        if (x < 0 || y < 0 || x >= width || y >= height) return

        const pixel = await image.readRasters({ window: [x, y, x + 1, y + 1] })
        const val = pixel[0][0]

        if (val !== undefined && !isNaN(val)) {
          L.popup()
            .setLatLng(e.latlng)
            .setContent(`ค่าระดับน้ำ: <b>${val.toFixed(2)}</b> ซม.`)
            .openOn(map)
        }
      })
    }

    initMap()

    // ✅ cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div id="map" className="w-full h-[80vh]" />
}
