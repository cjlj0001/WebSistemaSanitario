import React, { useEffect, useRef, useState } from "react"
import api from "../../servicio/api"
import { X, Save, Download, Trash2, Palette, Brush, Hand, Image as ImageIcon, Maximize, ZoomIn, ZoomOut } from "lucide-react"

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function ImagePainterModal({ isOpen, imageUrl, imageId, onClose, onSaved }) {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const drawingRef = useRef(false)
  const panningRef = useRef(false)
  const pointerIdRef = useRef(null)
  const lastMousePositionRef = useRef(null)
  const viewportRef = useRef(null)

  const [lineColor, setLineColor] = useState("#ffffff")
  const [lineWidth, setLineWidth] = useState(6)
  const [tool, setTool] = useState("draw")
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePosition, setLastMousePosition] = useState(null)

  const [imageError, setImageError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [savingImage, setSavingImage] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const onEscape = (event) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onEscape)

    return () => {
      window.removeEventListener("keydown", onEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    setImageError("")
    setSaveError("")
    setSaveSuccess("")
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const paintBaseImage = () => {
    const canvas = canvasRef.current
    const img = imageRef.current

    if (!canvas || !img) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(img, 0, 0)

    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }

  const getFitZoom = () => {
    const img = imageRef.current
    const viewport = viewportRef.current
    if (!img || !viewport) return 1

    return Math.min(viewport.clientWidth / img.width, viewport.clientHeight / img.height)
  }

  const fitToWindow = () => {
    setZoom(getFitZoom())
    setOffset({ x: 0, y: 0 })
  }

  const zoomAt = (nextZoom, clientX, clientY) => {
    const img = imageRef.current
    const viewport = viewportRef.current
    if (!img || !viewport) return

    const viewportRect = viewport.getBoundingClientRect()
    const boundedZoom = clamp(nextZoom, Math.max(getFitZoom() * 0.5, 0.1), 8)
    const imageCenterX = viewportRect.left + viewportRect.width / 2 + offset.x
    const imageCenterY = viewportRect.top + viewportRect.height / 2 + offset.y
    const imageX = (clientX - (imageCenterX - (img.width * zoom) / 2)) / zoom
    const imageY = (clientY - (imageCenterY - (img.height * zoom) / 2)) / zoom
    const nextCenterX = clientX - imageX * boundedZoom + (img.width * boundedZoom) / 2
    const nextCenterY = clientY - imageY * boundedZoom + (img.height * boundedZoom) / 2

    setZoom(boundedZoom)
    setOffset({
      x: nextCenterX - (viewportRect.left + viewportRect.width / 2),
      y: nextCenterY - (viewportRect.top + viewportRect.height / 2)
    })
  }

  const zoomFromCenter = (factor) => {
    const viewport = viewportRef.current
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    zoomAt(zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  useEffect(() => {
    if (!isOpen || !imageUrl) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      imageRef.current = img

      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = img.width
      canvas.height = img.height

      paintBaseImage()
      requestAnimationFrame(fitToWindow)
    }

    img.onerror = () => {
      setImageError("No se pudo cargar la imagen para pintar")
    }

    img.src = imageUrl
  }, [isOpen, imageUrl])

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    return {
      x: clamp(x, 0, canvas.width),
      y: clamp(y, 0, canvas.height)
    }
  }

  const startDrawing = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    drawingRef.current = true
    pointerIdRef.current = event.pointerId
    canvas.setPointerCapture(event.pointerId)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const point = getCanvasPoint(event)
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
  }

  const startPanning = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    panningRef.current = true
    pointerIdRef.current = event.pointerId
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY }
    setIsPanning(true)
    setLastMousePosition({ x: event.clientX, y: event.clientY })
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerDown = (event) => {
    if (tool === "pan") {
      startPanning(event)
      return
    }
    startDrawing(event)
  }

  const draw = (event) => {
    const canvas = canvasRef.current
    if (!canvas || pointerIdRef.current !== event.pointerId) return

    if (panningRef.current && lastMousePositionRef.current) {
      const deltaX = event.clientX - lastMousePositionRef.current.x
      const deltaY = event.clientY - lastMousePositionRef.current.y
      setOffset((currentOffset) => ({ x: currentOffset.x + deltaX, y: currentOffset.y + deltaY }))
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY }
      setLastMousePosition({ x: event.clientX, y: event.clientY })
      return
    }

    if (!drawingRef.current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const point = getCanvasPoint(event)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDrawing = (event) => {
    const canvas = canvasRef.current
    if (!canvas || pointerIdRef.current !== event.pointerId) return

    drawingRef.current = false
    panningRef.current = false
    pointerIdRef.current = null
    lastMousePositionRef.current = null
    setIsPanning(false)
    setLastMousePosition(null)
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const handleWheel = (event) => {
    event.preventDefault()
    zoomAt(zoom * (event.deltaY < 0 ? 1.1 : 0.9), event.clientX, event.clientY)
  }

  const clearDrawing = () => {
    drawingRef.current = false
    panningRef.current = false
    pointerIdRef.current = null
    lastMousePositionRef.current = null
    setIsPanning(false)
    setLastMousePosition(null)
    paintBaseImage()
    setImageError("")
    setSaveError("")
    setSaveSuccess("")
  }

  const downloadAnnotatedImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setImageError("")
    setSaveError("")
    setSaveSuccess("")
    try {
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `imagen-${imageId || "anotada"}.png`
      link.click()
    } catch {
      setSaveError("No se pudo exportar la imagen. Verifica CORS en el backend.")
    }
  }

  const saveAnnotatedImage = async () => {
    const canvas = canvasRef.current
    if (!canvas || !imageId) return

    setSavingImage(true)
    setImageError("")
    setSaveError("")
    setSaveSuccess("")

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((createdBlob) => {
          if (createdBlob) {
            resolve(createdBlob)
            return
          }
          reject(new Error("No se pudo generar la imagen anotada"))
        }, "image/png")
      })

      const formData = new FormData()
      formData.append("file", blob, `manual_result_${imageId}.png`)

      const response = await api.post(
        `/medicalImages/${encodeURIComponent(imageId)}/manual-result`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      )

      const savedImageId = response?.data?.medicalImage?.id
      if (onSaved && response?.data?.medicalImage) {
        onSaved(response.data.medicalImage)
      }
      setSaveSuccess(
        savedImageId
          ? `Imagen manual guardada correctamente (ID: ${savedImageId})`
          : "Imagen manual guardada correctamente"
      )
    } catch (error) {
      const detail = error?.response?.data?.detail
      setSaveError(detail || "No se pudo guardar la imagen manual en el servidor")
    } finally {
      setSavingImage(false)
    }
  }

  if (!isOpen) return null

    return (
    <div
       className="fixed inset-0 z-50 bg-slate-100"
       >
      <div
        div className="flex h-screen w-screen flex-col overflow-hidden bg-white"
       >
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <ImageIcon className="h-7 w-7 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Editor de resultados médicos
              </h2>

              <p className="text-sm text-emerald-100">
                Imagen ID: {imageId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>

        <div className="flex items-center gap-5 border-b border-slate-200 bg-slate-50 px-6 py-3 whitespace-nowrap">

          <div className="ml-auto flex items-center gap-2">
            <Palette className="h-4 w-4 text-emerald-600" />

            <span className="text-sm font-medium text-slate-700">
              Color
            </span>

            <input
              type="color"
              value={lineColor}
              onChange={(e) => setLineColor(e.target.value)}
              className="h-11 w-11 cursor-pointer rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
            <button
              type="button"
              onClick={() => setTool("draw")}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${tool === "draw" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <Brush className="h-3 w-3" /> Dibujar
            </button>
            <button
              type="button"
              onClick={() => setTool("pan")}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${tool === "pan" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <Hand className="h-3 w-3" /> Mover
            </button>
          </div>

          <label className="flex items-center gap-3">
            <Brush className="h-4 w-4 text-emerald-600" />

            <span className="text-sm font-medium text-slate-700">
              Grosor
            </span>

            <input
              type="range"
              min="1"
              max="40"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-44 accent-emerald-600"
            />

            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-sm font-semibold text-emerald-700">
              {lineWidth}
            </div>
          </label>

          <div className="ml-auto flex flex-wrap gap-3">

            <button
              type="button"
              onClick={clearDrawing}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Trash2 className="h-3 w-3" />
              Limpiar trazos
            </button>

            <button
              type="button"
              onClick={() => zoomFromCenter(1.2)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              aria-label="Acercar imagen"
            >
              <ZoomIn className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={() => zoomFromCenter(1 / 1.2)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              aria-label="Alejar imagen"
            >
              <ZoomOut className="h-3 w-3" />
            </button>

            <button
              type="button"
              onClick={fitToWindow}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Maximize className="h-3 w-3" /> Ajustar
            </button>

            <button
              type="button"
              onClick={downloadAnnotatedImage}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Download className="h-3 w-3" />
              Descargar
            </button>

            <button
              type="button"
              onClick={saveAnnotatedImage}
              disabled={savingImage}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save className="h-3 w-3" />
              {savingImage ? "Guardando..." : "Guardar imagen"}
            </button>

          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-slate-100 p-4">
          <div ref={viewportRef} className="relative h-full w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              className={`absolute touch-none ${tool === "pan" || (isPanning && lastMousePosition) ? "cursor-grab" : "cursor-crosshair"}`}
              style={{
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: `translate(-50%, -50%) scale(${zoom})`,
                transformOrigin: "center center"
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
              onWheel={handleWheel}
            />
          </div>
        </div>

        {(imageError || saveError || saveSuccess) && (
          <div className="space-y-3 border-t border-slate-200 bg-white px-6 py-4">

            {imageError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {imageError}
              </div>
            )}

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveSuccess}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
