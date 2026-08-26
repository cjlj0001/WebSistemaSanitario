import React, { useState } from "react"
import ImageBulkDownloadBar from "./ImageBulkDownloadBar"
import { groupImagesByOrthancStudyUid } from "./imageGroupingUtils"
import { getUserRoleFromToken } from "../security/tokenRole"
import StudyCard from "./StudyCard"
import ImageCard from "./ImageCard"

export default function ImageResult({
  images,
  loading,
  variant = "default",
  imageViewMode = "imagen",
  onDeleteImage = null,
  onDeleteStudy = null,
  compact = false,
}) {
  const asArray = Array.isArray(images) ? images : []
  const grouped = imageViewMode === "estudio" ? groupImagesByOrthancStudyUid(asArray) : []
  const [ungroupedStudyUids, setUngroupedStudyUids] = useState(() => new Set())
  const renderImages = imageViewMode === "estudio"
    ? [
        ...grouped.filter((item) => !ungroupedStudyUids.has(item?._orthancStudyUid)),
        ...asArray.filter((item) => ungroupedStudyUids.has(item?.medicalImage?.orthancStudyUid)),
      ]
    : asArray
  const role = getUserRoleFromToken(localStorage.getItem("accessToken") || "")
  const [fullPreviewUrl, setFullPreviewUrl] = useState(null)

  return (
    <div className={`${compact ? "mt-0" : "mt-6"} rounded-lg border border-gray-200 p-4`}>
      {(role === "admin" || role === "especialista") && <ImageBulkDownloadBar images={renderImages} imageViewMode={imageViewMode} />}

      {!loading && renderImages.length === 0 && <p className="text-gray-600">No hay imágenes para mostrar.</p>}

      {renderImages.length > 0 && (
        <div className="space-y-3">
          {renderImages.map((item) => {
            const studyUid = item?._orthancStudyUid || item?.medicalImage?.orthancStudyUid
            const isStudy = imageViewMode === "estudio" && Boolean(item?._orthancStudyUid) && !ungroupedStudyUids.has(studyUid)

            return isStudy ? (
              <StudyCard
                key={item?._orthancStudyUid || item?.medicalImage?.id}
                item={item}
                editable={variant === "specialist"}
                onOpenPreview={setFullPreviewUrl}
                allowStudyPdfDownload={role === "usuarioBase"}
                onDeleteStudy={role === "admin" ? onDeleteStudy : null}
              />
            ) : (
              <ImageCard
                key={item?.medicalImage?.id}
                item={item}
                onOpenPreview={setFullPreviewUrl}
                onDelete={role === "admin" && onDeleteImage ? async (imageId) => {
                  const deleted = await onDeleteImage(imageId)
                  if (deleted && studyUid) {
                    setUngroupedStudyUids((previous) => new Set(previous).add(studyUid))
                  }
                } : null}
              />
            )
          })}
        </div>
      )}

      {fullPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4">
          <button
            type="button"
            onClick={() => setFullPreviewUrl(null)}
            className="
              absolute
              right-6
              top-6
              z-50
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              bg-white
              text-4xl
              font-semibold
              leading-none
              text-slate-700
              shadow-2xl
              transition-all
              duration-200
              hover:scale-110
              hover:bg-slate-100
              hover:text-slate-900
              focus:outline-none
              focus-visible:ring-4
              focus-visible:ring-white/50
            "
            aria-label="Cerrar vista ampliada"
          >
            <span className="-mt-1">×</span>
          </button>

          <img
            src={fullPreviewUrl}
            alt="Vista ampliada"
            className="
              max-h-[90vh]
              max-w-[95%]
              rounded-md
              object-contain
              shadow-2xl
            "
          />
        </div>
      )}
    </div>
  )
}
