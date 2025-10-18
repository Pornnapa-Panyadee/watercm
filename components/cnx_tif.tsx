"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { fromArrayBuffer } from "geotiff"
import { kml } from "togeojson"

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array

export default function CnxTif() {
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    async function initMap() {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const L = (await import("leaflet")).default

      // 🗺️ แผนที่พื้นหลัง
      const map = L.map("map", { center: [18.75, 98.99], zoom: 12 })
      mapRef.current = map

      const googleSat = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=YOUR_API_KEY",
        { maxZoom: 20, attribution: "&copy; Google Satellite" }
      )

      const googleTerrain = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=YOUR_API_KEY",
        { maxZoom: 20, attribution: "&copy; Google Terrain" }
      )

      const darkBase = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 20,
          attribution:
            "&copy; <a href='https://carto.com/attributions'>CARTO</a> | Dark Matter",
        }
      )

      googleTerrain.addTo(map)

      // --------------------------------------------------
      // ✅ โหลดไฟล์ KML เส้นทางน้ำ Ping.kml
      // --------------------------------------------------
      let pingRiver: L.GeoJSON | null = null
      let roadLayer: L.GeoJSON | null = null

      try {
        const pingResponse = await fetch("/data/KML/stream.kml")
        if (!pingResponse.ok) throw new Error(`HTTP ${pingResponse.status}`)
        const pingText = await pingResponse.text()

        const parser = new DOMParser()
        const xml = parser.parseFromString(pingText, "text/xml")
        const geojson = kml(xml)

        pingRiver = L.geoJSON(geojson, {
          style: { color: "#ffffffff", weight: 1, opacity: 0.9 },
        }).addTo(map)
      } catch (err) {
        console.error("❌ โหลด Ping.kml ไม่สำเร็จ:", err)
      }

      try {
        const roadResponse = await fetch("/data/KML/road.kml")
        if (!roadResponse.ok) throw new Error(`HTTP ${roadResponse.status}`)
        const roadText = await roadResponse.text()

        const parser = new DOMParser()
        const xml = parser.parseFromString(roadText, "text/xml")
        const geojson = kml(xml)

        roadLayer = L.geoJSON(geojson, {
          style: { color: "#ffffffff", weight: 1, opacity: 0.9 },
        }).addTo(map)
      } catch (err) {
        console.error("❌ โหลด Road.kml ไม่สำเร็จ:", err)
      }



      // --------------------------------------------------
      // ✅ ฟังก์ชันโหลดและสร้าง layer จาก GeoTIFF
      // --------------------------------------------------
      async function loadRasterLayer(url: string, label: string) {
        const NODATA = -3.4028235e38
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const arrayBuffer = await response.arrayBuffer()
          const tiff = await fromArrayBuffer(arrayBuffer)
          const image = await tiff.getImage()
          const rasters = await image.readRasters()
          const data = rasters[0] as TypedArray
          const width = image.getWidth()
          const height = image.getHeight()
          const bbox = image.getBoundingBox()
          const [minX, minY, maxX, maxY] = bbox

          // คำนวณ min/max
          let min = Infinity,
            max = -Infinity
          for (let i = 0; i < data.length; i++) {
            const v = data[i]
            if (v > -1e30 && !isNaN(v)) {
              if (v < min) min = v
              if (v > max) max = v
            }
          }

          // สร้าง canvas
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")!
          const imageData = ctx.createImageData(width, height)

          // สี (gradient เดียวกัน)
          const getColor = (norm: number): [number, number, number] => {
            if (norm < 0.33) {
              const t = norm / 0.33
              return [
                Math.floor(168 * (1 - t) + 51 * t),
                Math.floor(216 * (1 - t) + 153 * t),
                Math.floor(255 * (1 - t) + 255 * t),
              ]
            } else if (norm < 0.66) {
              const t = (norm - 0.33) / 0.33
              return [
                Math.floor(51 * (1 - t) + 0 * t),
                Math.floor(153 * (1 - t) + 68 * t),
                Math.floor(255 * (1 - t) + 204 * t),
              ]
            } else {
              const t = (norm - 0.66) / 0.34
              return [
                0,
                Math.floor(68 * (1 - t) + 17 * t),
                Math.floor(204 * (1 - t) + 51 * t),
              ]
            }
          }

          for (let i = 0; i < data.length; i++) {
            const value = data[i]
            const idx = i * 4

            if (value < -1e30 || isNaN(value)) {
              imageData.data[idx + 3] = 0
            } else {
              const norm = (value - min) / (max - min)
              const [r, g, b] = getColor(norm)
              imageData.data[idx] = r
              imageData.data[idx + 1] = g
              imageData.data[idx + 2] = b
              imageData.data[idx + 3] = 255
            }
          }

          ctx.putImageData(imageData, 0, 0)

          const bounds: L.LatLngBoundsExpression = [
            [minY, minX],
            [maxY, maxX],
          ]

          const rasterLayer = L.imageOverlay(canvas.toDataURL(), bounds, {
            opacity: 0.7,
          })
          return { rasterLayer, image, width, height, bbox, min, max, label }
        } catch (err) {
          console.error(`โหลด ${url} ไม่สำเร็จ:`, err)
          return null
        }
      }

      // --------------------------------------------------
      // ✅ โหลดทั้งสองไฟล์ (NN และ IDW)
      // --------------------------------------------------
      const [nnData, idwData] = await Promise.all([
        loadRasterLayer("/data/cnxlpn_3NN.tif", "Nearest Neighbor (NN)"),
        loadRasterLayer("/data/cnxlpn_3IDW.tif", "Inverse Distance Weighted (IDW)"),
      ])

      if (!nnData || !idwData) {
        alert("ไม่สามารถโหลดไฟล์ GeoTIFF ทั้งหมดได้")
        return
      }

      // // เพิ่ม Layer Control
      // const baseLayers = {
      //   "🛰️ Google Satellite": googleSat,
      //   "🏔️ Google Terrain": googleTerrain,
      // }
      // const overlays = {
      //   "NN - Nearest Neighbor": nnData.rasterLayer,
      //   "IDW - Inverse Distance Weighted": idwData.rasterLayer,
      // }

      // nnData.rasterLayer.addTo(map)
      // L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map)
      // ✅ Layer Control
      const baseLayers = {
        "🌑 Dark Matter": darkBase,
        "🛰️ Google Satellite": googleSat,
        "🏔️ Google Terrain": googleTerrain,
      }

      const overlays = {
        "NN - Nearest Neighbor": nnData.rasterLayer,
        "IDW - Inverse Distance Weighted": idwData.rasterLayer,
      }

      // ✅ แยก infra layers
      const infraLayers = {
        "River": pingRiver ?? L.layerGroup(),
        "Road": roadLayer ?? L.layerGroup(),
      }
      

      // ✅ เพิ่ม control 2 ชุด
      nnData.rasterLayer.addTo(map)
      L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map)
      L.control.layers({}, infraLayers, { collapsed: false, position: "topright" }).addTo(map)


      // ✅ เพิ่มหัวข้อ Interpolation ด้านบน overlay
      setTimeout(() => {
        const overlayList = document.querySelector(
          ".leaflet-control-layers-overlays"
        ) as HTMLElement
        if (overlayList) {
          const header = document.createElement("div")
          header.innerHTML = `<strong style="display:block; margin-bottom:4px; color:#333;">📊 การประมาณค่าระดับน้ำเชิงพื้นที่</strong>`
          overlayList.prepend(header)
        }
      }, 100)

      // --------------------------------------------------
      // ✅ Legend เดียว ใช้ช่วงค่ารวมของทั้งสอง
      // --------------------------------------------------
      const globalMin = Math.min(nnData.min, idwData.min)
      const globalMax = Math.max(nnData.max, idwData.max)

      const legend = (L as any).control({ position: "bottomright" })
      legend.onAdd = function () {
        const div = L.DomUtil.create(
          "div",
          "info legend bg-white p-2 rounded shadow"
        )
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
          <span style="font-size:10px">${globalMin.toFixed(2)} → ${globalMax.toFixed(2)}</span>
        `
        return div
      }
      legend.addTo(map)

      // --------------------------------------------------
      // ✅ Popup แสดงค่าจริง (จาก layer ที่เปิดอยู่)
      // --------------------------------------------------
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const activeLayer =
          map.hasLayer(nnData.rasterLayer) && !map.hasLayer(idwData.rasterLayer)
            ? nnData
            : idwData

        const { image, width, height, bbox } = activeLayer
        const [minX, minY, maxX, maxY] = bbox
        const { lat, lng } = e.latlng
        const x = Math.floor(((lng - minX) / (maxX - minX)) * width)
        const y = Math.floor((1 - (lat - minY) / (maxY - minY)) * height)
        if (x < 0 || y < 0 || x >= width || y >= height) return

        const pixel = await image.readRasters({ window: [x, y, x + 1, y + 1] })
        const val = (pixel as TypedArray[])[0][0]

        if (val > -1e30 && !isNaN(val)) {
          L.popup()
            .setLatLng(e.latlng)
            .setContent(
              `📍 <b>${activeLayer.label}</b><br/>ค่าระดับน้ำ: <b>${val.toFixed(
                2
              )}</b> ซม.`
            )
            .openOn(map)
        }
      })
    }

    initMap()
  }, [])

  return <div id="map" className="w-full h-[80vh]" />
}
