import React, { useEffect, useMemo, useRef, useState } from "react"
import ResultBox from "../result/ResultBox"
import api from "../../servicio/api"
import ImagePainterModal from "./ImagePainterModal"
import { buildTraceableImageFileName } from "./imageDownloadUtils"
import { getUserIdentifierLabel } from "../user/userIdentifier"
import { downloadStudyPdf } from "./studyPdfUtils"
import {
  Image as ImageIcon,
  User,
  IdCard,
  CalendarDays,
  Download,
  Brain,
  Pencil,
  FileText,
  Maximize2,
  Trash2
} from "lucide-react"

function buildPreviewUrl(imageId, cacheKey = "") {
  if (!imageId) return ""
  const base = `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/preview`
  return cacheKey ? `${base}?v=${encodeURIComponent(cacheKey)}` : base
}

function buildDownloadFileName(item, imageId, imageType, format) {
  return buildTraceableImageFileName(
    {
      ...item,
      medicalImage: {
        ...item?.medicalImage,
        id: imageId,
        tipo: imageType,
      },
    },
    format,
    `imagen_${imageId}`
  )
}

export default function StudyCard({ item, editable = true, onOpenPreview = null, allowStudyPdfDownload = false, onDeleteStudy = null }) {
  const [isPainterOpen, setIsPainterOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [showManualBlock, setShowManualBlock] = useState(Boolean(item?.result?.manualImageId))
  const [manualOverride, setManualOverride] = useState({
    imageId: item?.result?.manualImageId || null,
    version: ""
  })

  const cleanImageId = item?.medicalImage?.id
  const iaImageId = item?.result?.gradcamImageId || null
  const manualImageId = manualOverride.imageId || item?.result?.manualImageId || null
  const studyUid = item?._orthancStudyUid || item?.medicalImage?.orthancStudyUid || ""

  const cleanPreviewUrl = useMemo(() => buildPreviewUrl(cleanImageId), [cleanImageId])
  const iaPreviewUrl = useMemo(() => buildPreviewUrl(iaImageId), [iaImageId])
  const manualPreviewUrl = useMemo(
    () => buildPreviewUrl(manualImageId, manualOverride.version),
    [manualImageId, manualOverride.version]
  )
  const [showCleanDownloadMenu, setShowCleanDownloadMenu] = useState(false)
  const [showIaDownloadMenu, setShowIaDownloadMenu] = useState(false)
  const [showManualDownloadMenu, setShowManualDownloadMenu] = useState(false)
  const cleanDownloadMenuRef = useRef(null)
  const iaDownloadMenuRef = useRef(null)
  const manualDownloadMenuRef = useRef(null)

  useEffect(() => {
    const closeDownloadMenus = (event) => {
      const clickedInsideMenu = [
        cleanDownloadMenuRef.current,
        iaDownloadMenuRef.current,
        manualDownloadMenuRef.current,
      ].some((menu) => menu?.contains(event.target))

      if (!clickedInsideMenu) {
        setShowCleanDownloadMenu(false)
        setShowIaDownloadMenu(false)
        setShowManualDownloadMenu(false)
      }
    }

    document.addEventListener("mousedown", closeDownloadMenus)
    return () => document.removeEventListener("mousedown", closeDownloadMenus)
  }, [])

  const toggleDownloadMenu = (menuName) => {
    setShowCleanDownloadMenu((visible) => menuName === "clean" ? !visible : false)
    setShowIaDownloadMenu((visible) => menuName === "ia" ? !visible : false)
    setShowManualDownloadMenu((visible) => menuName === "manual" ? !visible : false)
  }

  const downloadDicom = async (imageId, imageType) => {
    const token = localStorage.getItem("accessToken") || ""
    if (!token) return alert("Debes iniciar sesión para descargar la imagen en DICOM")
    const url = `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/download`
    const filename = buildDownloadFileName(item, imageId, imageType, "dicom")
    try {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!resp.ok) return alert(`Error: ${resp.status}`)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      alert(`No se pudo descargar la imagen: ${err.message}`)
    }
  }

  const downloadPng = async (imageId, imageType, cacheKey = "") => {
    const base = `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/preview`
    const url = cacheKey ? `${base}?v=${encodeURIComponent(cacheKey)}` : base
    const filename = buildDownloadFileName(item, imageId, imageType, "png")
    try {
      const resp = await fetch(url)
      if (!resp.ok) return alert(`Error: ${resp.status}`)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      alert(`No se pudo descargar la imagen PNG: ${err.message}`)
    }
  }

  const handleDownloadStudyPdf = async () => {
    if (!allowStudyPdfDownload || isDownloadingPdf) return
    setIsDownloadingPdf(true)
    try {
      await downloadStudyPdf({
        studyItem: item,
        cleanPreviewUrl,
        iaPreviewUrl,
        manualPreviewUrl,
      })
    } catch (err) {
      alert(`No se pudo generar el PDF del estudio: ${err?.message || "Error desconocido"}`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/15 p-3"><ImageIcon className="h-7 w-7 text-white" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">Estudio médico</h2>
            <p className="max-w-xl break-all text-xs text-emerald-100">UID del estudio: {studyUid || "No disponible"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {allowStudyPdfDownload && (
            <button
              type="button"
              onClick={handleDownloadStudyPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {isDownloadingPdf ? "Generando PDF..." : "Descargar estudio"}
            </button>
          )}
          {onDeleteStudy && (
            <button
              type="button"
              onClick={() => onDeleteStudy(item?._orthancStudyUid || item?.medicalImage?.orthancStudyUid)}
              className="rounded-lg bg-white/15 p-2.5 text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Borrar estudio"
              title="Borrar estudio"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-6 md:grid-cols-3">
        <div className="flex items-center gap-3"><User className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">Usuario</p><p className="font-medium text-slate-800">{item?.medicalImage?.nombreUsuario || "-"}</p></div></div>
        <div className="flex items-center gap-3"><IdCard className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">{getUserIdentifierLabel(item?.medicalImage?.dniUsuario)}</p><p className="font-medium text-slate-800">{item?.medicalImage?.dniUsuario || "-"}</p></div></div>
        <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">Fecha de subida</p><p className="font-medium text-slate-800">{new Date(item?.medicalImage?.fechaSubida).toLocaleString()}</p></div></div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-emerald-100 p-2"><ImageIcon className="h-5 w-5 text-emerald-700" /></div><div><h3 className="font-semibold text-slate-800">Imagen original</h3><p className="text-sm text-slate-500">Imagen subida por el usuario</p></div></div>
          {cleanPreviewUrl ? (
            <div className="relative">
              <img
                src={cleanPreviewUrl}
                alt={`Imagen limpia ${cleanImageId}`}
                loading="lazy"
                className="h-64 w-full rounded-md border border-gray-200 object-contain bg-black"
              />
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={() => onOpenPreview(cleanPreviewUrl)}
                  className="absolute bottom-3 right-3 rounded-full bg-white p-2 shadow transition hover:scale-105"
                  aria-label="Ampliar imagen"
                >
                  <Maximize2 className="h-5 w-5 text-slate-700" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500">
              Sin imagen limpia
            </div>
          )}
          <div ref={cleanDownloadMenuRef} className="relative mt-3">
            <button
              type="button"
              onClick={() => toggleDownloadMenu("clean")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Descargar imagen
            </button>
            {showCleanDownloadMenu && (
              <div className="absolute right-0 z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700" onClick={() => { setShowCleanDownloadMenu(false); downloadDicom(cleanImageId, "Limpia") }}><Download className="h-4 w-4" /><span>Descargar DICOM</span></button>
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700" onClick={() => { setShowCleanDownloadMenu(false); downloadPng(cleanImageId, "Limpia") }}><ImageIcon className="h-4 w-4" /><span>Descargar PNG</span></button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-sky-100 p-2"><Brain className="h-5 w-5 text-sky-600" /></div><div><h3 className="font-semibold text-slate-800">Resultado IA</h3><p className="text-sm text-slate-500">Análisis generado automáticamente</p></div></div>
          {iaPreviewUrl ? (
            <div className="relative">
              <img
                src={iaPreviewUrl}
                alt={`Resultado IA ${iaImageId}`}
                loading="lazy"
                className="h-64 w-full rounded-md border border-gray-200 object-contain bg-black"
              />
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={() => onOpenPreview(iaPreviewUrl)}
                  className="absolute bottom-3 right-3 rounded-full bg-white p-2 shadow transition hover:scale-105"
                  aria-label="Ampliar imagen IA"
                >
                  <Maximize2 className="h-5 w-5 text-slate-700" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-amber-300 bg-amber-50 text-sm text-amber-700">
              No hay resultado IA para este estudio
            </div>
          )}
          <div ref={iaDownloadMenuRef} className="relative mt-3">
            <button
              type="button"
              onClick={() => toggleDownloadMenu("ia")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white transition hover:bg-sky-700"
            >
              <Download className="h-4 w-4" />
              Descargar imagen IA
            </button>
            {showIaDownloadMenu && (
              <div className="absolute right-0 z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700" onClick={() => { setShowIaDownloadMenu(false); downloadDicom(iaImageId, "Resultado IA") }}><Download className="h-4 w-4" /><span>Descargar DICOM</span></button>
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700" onClick={() => { setShowIaDownloadMenu(false); downloadPng(iaImageId, "Resultado IA") }}><ImageIcon className="h-4 w-4" /><span>Descargar PNG</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showManualBlock && manualImageId && (
        <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-left"><div className="rounded-lg bg-amber-100 p-2"><Pencil className="h-5 w-5 text-amber-600" /></div><div><h3 className="font-semibold text-slate-800">Resultado manual</h3><p className="text-sm text-slate-500">Anotación realizada por el especialista</p></div></div>
          <div className="relative">
            <img
              src={manualPreviewUrl}
              alt={`Resultado manual ${manualImageId}`}
              loading="lazy"
              className="mx-auto h-64 w-full rounded-md border border-gray-200 object-contain bg-black"
              onError={() => setShowManualBlock(false)}
            />
            {onOpenPreview && (
              <button
                type="button"
                onClick={() => onOpenPreview(manualPreviewUrl)}
                className="absolute bottom-3 right-3 rounded-full bg-white p-2 shadow transition hover:scale-105"
                aria-label="Ampliar imagen manual"
              >
                  <Maximize2 className="h-5 w-5 text-slate-700" />
              </button>
            )}
          </div>
          <div className="mt-3">
            <div ref={manualDownloadMenuRef} className="relative">
              <button
                type="button"
                onClick={() => toggleDownloadMenu("manual")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-700"
              >
                <Download className="h-4 w-4" />
                Descargar imagen manual
              </button>
              {showManualDownloadMenu && (
                <div className="absolute right-0 z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700" onClick={() => { setShowManualDownloadMenu(false); downloadDicom(manualImageId, "Resultado Manual") }}><Download className="h-4 w-4" /><span>Descargar DICOM</span></button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700" onClick={() => { setShowManualDownloadMenu(false); downloadPng(manualImageId, "Resultado Manual", manualOverride.version) }}><ImageIcon className="h-4 w-4" /><span>Descargar PNG</span></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editable && (
        <div className="mx-auto mt-6 w-full max-w-7xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-800">
                  Edición manual
                </h3>

                <p className="break-words text-sm text-slate-500">
                  Realice o modifique el mapa de calor sobre la imagen original.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPainterOpen(true)}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-sm font-medium text-white shadow transition hover:bg-amber-600 sm:w-auto sm:px-5 sm:text-base"
              >
                <Pencil className="h-5 w-5" />
                Editar mapa de calor
              </button>

            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <ResultBox item={item} openByDefault professional />
      </div>

      <ImagePainterModal
        isOpen={isPainterOpen}
        imageUrl={cleanPreviewUrl}
        imageId={cleanImageId}
        onClose={() => setIsPainterOpen(false)}
        onSaved={(savedImage) => {
          setShowManualBlock(true)
          setManualOverride({
            imageId: savedImage?.id || manualImageId,
            version: String(Date.now())
          })
        }}
      />
    </div>
  )
}