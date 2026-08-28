import React, { useEffect, useMemo, useRef, useState } from "react"
import ResultBox from "../result/ResultBox"
import api from "../../servicio/api"
import { downloadSingleImage } from "./imageDownloadUtils"
import { getUserIdentifierLabel } from "../user/userIdentifier"
import { Brain, CalendarDays, Download, IdCard, Image as ImageIcon, Maximize2, Pencil, Trash2, User } from "lucide-react"

function buildPreviewUrl(imageId) { return imageId ? `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/preview` : "" }
export default function ImageCard({ item, onOpenPreview = null, onDelete }) {
  const cleanImageId = item?.medicalImage?.id
  const imageType = item?.medicalImage?.tipo || "Limpia"
  const isAiResult = imageType === "Resultado IA"
  const isManualResult = imageType === "Resultado Manual"
  const imageTitle = isAiResult ? "Resultado IA" : isManualResult ? "Resultado manual" : "Imagen original"
  const imageDescription = isAiResult
    ? "Análisis generado automáticamente"
    : isManualResult
      ? "Anotación realizada por el especialista"
      : "Imagen subida por el usuario"
  const TypeIcon = isAiResult ? Brain : isManualResult ? Pencil : ImageIcon
  const colorTheme = isAiResult
    ? {
        header: "from-sky-600 to-blue-600",
        headerDetail: "text-sky-100",
        action: "bg-sky-600 hover:bg-sky-700",
        menuAction: "hover:bg-sky-50 hover:text-sky-700",
      }
    : isManualResult
      ? {
          header: "from-amber-500 to-orange-600",
          headerDetail: "text-amber-100",
          action: "bg-amber-600 hover:bg-amber-700",
          menuAction: "hover:bg-amber-50 hover:text-amber-700",
        }
      : {
          header: "from-emerald-600 to-teal-600",
          headerDetail: "text-emerald-100",
          action: "bg-emerald-600 hover:bg-emerald-700",
          menuAction: "hover:bg-emerald-50 hover:text-emerald-700",
        }
  const previewUrl = useMemo(() => buildPreviewUrl(cleanImageId), [cleanImageId])
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef(null)

  useEffect(() => {
    const closeDownloadMenu = (event) => {
      if (!downloadMenuRef.current?.contains(event.target)) {
        setShowDownloadMenu(false)
      }
    }

    document.addEventListener("mousedown", closeDownloadMenu)
    return () => document.removeEventListener("mousedown", closeDownloadMenu)
  }, [])

  const handleDownload = async (format) => {
    try {
      await downloadSingleImage(item, format)
    } catch (err) {
      alert(`No se pudo descargar la imagen ${format === "png" ? "PNG" : "DICOM"}: ${err?.message || "Error desconocido"}`)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className={`relative flex items-center gap-4 bg-gradient-to-r px-6 py-5 ${colorTheme.header}`}>
        <div className="rounded-xl bg-white/15 p-3"><ImageIcon className="h-7 w-7 text-white" /></div>
        <div>
          <h2 className="text-xl font-bold text-white">Imagen médica</h2>
          <p className={`text-sm ${colorTheme.headerDetail}`}>Imagen #{cleanImageId}</p>
        </div>
        {onDelete && (
          <button type="button" onClick={() => onDelete(cleanImageId)} className="absolute right-5 top-1/2 -translate-y-1/2 rounded-lg bg-white/15 p-2.5 text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-white" aria-label={`Borrar imagen ${cleanImageId}`} title="Borrar imagen">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-6 md:grid-cols-3">
        <div className="flex items-center gap-3"><User className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">Usuario</p><p className="font-medium text-slate-800">{item?.medicalImage?.nombreUsuario || "-"}</p></div></div>
        <div className="flex items-center gap-3"><IdCard className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">{getUserIdentifierLabel(item?.medicalImage?.dniUsuario)}</p><p className="font-medium text-slate-800">{item?.medicalImage?.dniUsuario || "-"}</p></div></div>
        <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-emerald-600" /><div><p className="text-xs uppercase tracking-wide text-slate-500">Fecha de subida</p><p className="font-medium text-slate-800">{new Date(item?.medicalImage?.fechaSubida).toLocaleString()}</p></div></div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isAiResult ? "bg-sky-100" : isManualResult ? "bg-amber-100" : "bg-emerald-100"}`}><TypeIcon className={`h-5 w-5 ${isAiResult ? "text-sky-700" : isManualResult ? "text-amber-700" : "text-emerald-700"}`} /></div>
            <div><h3 className="font-semibold text-slate-800">{imageTitle}</h3><p className="text-sm text-slate-500">{imageDescription}</p></div>
          </div>

          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt={`Vista previa imagen ${cleanImageId}`}
                loading="lazy"
                className="h-64 w-full rounded-md border border-gray-200 bg-black object-contain"
              />
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={() => onOpenPreview(previewUrl)}
                  className="absolute bottom-3 right-3 rounded-full bg-white p-2 shadow transition hover:scale-105"
                  aria-label="Ampliar imagen"
                >
                  <Maximize2 className="h-5 w-5 text-slate-700" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500">
              Sin imagen disponible
            </div>
          )}

          <div ref={downloadMenuRef} className="relative mt-3">
            <button
              type="button"
              onClick={() => setShowDownloadMenu((visible) => !visible)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition ${colorTheme.action}`}
              aria-expanded={showDownloadMenu}
              aria-haspopup="menu"
            >
              <Download className="h-4 w-4" />
              Descargar {isAiResult ? "resultado IA" : isManualResult ? "resultado manual" : "imagen"}
            </button>

            {showDownloadMenu && (
              <div role="menu" className="absolute top-full z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition ${colorTheme.menuAction}`}
                  onClick={() => { setShowDownloadMenu(false); handleDownload("dicom") }}
                >
                  <Download className="h-4 w-4" />
                  Descargar DICOM
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition ${colorTheme.menuAction}`}
                  onClick={() => { setShowDownloadMenu(false); handleDownload("png") }}
                >
                  <ImageIcon className="h-4 w-4" />
                  Descargar PNG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 pt-0">
        <ResultBox item={item} />
      </div>
    </div>
  )
}
