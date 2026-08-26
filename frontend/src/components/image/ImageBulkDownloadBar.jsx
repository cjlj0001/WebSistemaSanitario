import React, { useState } from "react"
import { Archive, Download } from "lucide-react"
import { downloadImageCollection } from "./imageDownloadUtils"
import api from "../../servicio/api"
import { getUserRoleFromToken } from "../security/tokenRole"

export default function ImageBulkDownloadBar({
    images = [],
    imageViewMode = "imagen",
}) {
    const [downloadingFormat, setDownloadingFormat] = useState("")

    const count = Array.isArray(images) ? images.length : 0

    if (count === 0) return null

    const isStudyMode = imageViewMode === "estudio"
    const itemLabel = isStudyMode ? "estudios" : "imágenes"

    const handleDownload = async (format) => {
        setDownloadingFormat(format)

        try {
            const result = await downloadImageCollection(images, format, imageViewMode)
            const unavailableIds = result.failedEntries
                .filter((entry) => entry.status === 404 && entry.imageId)
                .map((entry) => entry.imageId)
            const isAdmin = getUserRoleFromToken(localStorage.getItem("accessToken") || "") === "admin"
            let cleanedCount = 0

            if (isAdmin && unavailableIds.length > 0) {
                const cleanup = await Promise.allSettled(
                    unavailableIds.map((imageId) => api.delete(`/medicalImages/${encodeURIComponent(imageId)}/unavailable`))
                )
                cleanedCount = cleanup.filter((entry) => entry.status === "fulfilled").length
            }
            if (result.failedEntries.length > 0) {
                alert(
                    `Se ha descargado el ZIP con ${result.downloaded} archivo(s). ` +
                    `${result.failedEntries.length} no se pudieron incluir porque ya no estan disponibles (Error ${result.failedEntries[0].status || "desconocido"}).` +
                    (cleanedCount > 0 ? ` Se han eliminado ${cleanedCount} referencia(s) obsoleta(s).` : "")
                )
            }
        } catch (error) {
            alert(
                error?.message ||
                `No se pudieron descargar las ${itemLabel} filtradas`
            )
        } finally {
            setDownloadingFormat("")
        }
    }

    return (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Archive className="h-4 w-4 text-emerald-600" />

                    {count} {itemLabel} filtrad{isStudyMode ? "os" : "as"}
                </p>

                <p className="text-xs text-slate-600">
                    {isStudyMode
                        ? "El ZIP contendrá una carpeta por estudio con sus imágenes original, IA y manual."
                        : "El ZIP contendrá las imágenes filtradas, sin carpetas."}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => handleDownload("dicom")}
                    disabled={downloadingFormat !== ""}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                    <Download className="h-4 w-4" />

                    {downloadingFormat === "dicom"
                        ? `Descargando ${count} ${itemLabel} DICOM...`
                        : `Descargar ${count} ${itemLabel} DICOM`}
                </button>

                <button
                    type="button"
                    onClick={() => handleDownload("png")}
                    disabled={downloadingFormat !== ""}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                    <Download className="h-4 w-4" />

                    {downloadingFormat === "png"
                        ? `Descargando ${count} ${itemLabel} PNG...`
                        : `Descargar ${count} ${itemLabel} PNG`}
                </button>
            </div>
        </div>
    )
}
