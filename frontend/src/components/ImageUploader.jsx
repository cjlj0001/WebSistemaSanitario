import React, { useEffect, useRef, useState } from "react"
import api from "../servicio/api"

const acceptedExtensions = new Set([
  "jpeg",
  "jpg",
  "bmp",
  "png",
  "gif",
  "tiff",
  "tif",
  "dcm",
])

function ImageUploader({
  onLoadingChange,
  onUploaded,
  className = "",
}) {
  const [userDni, setUserDni] = useState("")
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      setLoadingProfile(true)

      try {
        const response = await api.get("/auth/me")

        if (isMounted) {
          setUserDni(response.data?.dni || "")
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              "No se pudo cargar el DNI del perfil"
          )
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const pickFile = (selectedFile) => {
    if (!selectedFile) {
      return
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase()

    if (!acceptedExtensions.has(extension)) {
      setFile(null)
      setSuccess("")
      setError(
        "Formato no compatible. Usa JPG, PNG, BMP, GIF, TIFF o DICOM"
      )
      return
    }

    setFile(selectedFile)
    setError("")
    setSuccess("")
  }

  const handleFileChange = (event) => {
    pickFile(event.target.files?.[0] || null)
    event.target.value = ""
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)

    if (loading || loadingProfile) {
      return
    }

    pickFile(event.dataTransfer.files?.[0] || null)
  }

  const openFilePicker = () => {
    if (loading || loadingProfile) {
      return
    }

    fileInputRef.current?.click()
  }

  const handleConvert = async () => {
    if (!userDni.trim()) {
      setError("No se pudo obtener el DNI del perfil")
      return
    }

    if (!file) {
      setError("Selecciona un archivo primero")
      return
    }

    setLoading(true)
    onLoadingChange?.(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await api.post(
        `/medicalImages/user/${encodeURIComponent(userDni.trim())}`,
        formData,
        {
          responseType: "json",
        }
      )

      const uploadedResultId =
        response.data?.result?.id ?? null

      const uploadedOrthancStudyUid =
        response.data?.gradcamImage?.orthancStudyUid ||
        response.data?.originalImage?.orthancStudyUid ||
        null

      let studyItems = []

      try {
        const refreshed = await api.get("/medicalImages/me")

        const allImages = Array.isArray(refreshed.data)
          ? refreshed.data
          : []

        studyItems = allImages.filter((item) => {
          const medicalImage = item?.medicalImage || {}

          return (
            (uploadedResultId != null &&
              medicalImage.idResult === uploadedResultId) ||
            (uploadedOrthancStudyUid &&
              medicalImage.orthancStudyUid ===
                uploadedOrthancStudyUid)
          )
        })
      } catch {
        studyItems = []
      }

      if (studyItems.length === 0) {
        studyItems = Array.isArray(response.data)
          ? response.data
          : [response.data].filter(Boolean)
      }

      onUploaded?.(studyItems)

      setFile(null)
      setSuccess("Imagen subida correctamente")
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Error al subir imagen a Orthanc"
      )
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const uploaderDisabled = loading || loadingProfile

  return (
    <div
      className={`
        flex
        w-full
        min-w-0
        flex-col
        gap-2
        ${className}
      `}
    >
      <div
        role="button"
        tabIndex={uploaderDisabled ? -1 : 0}
        onClick={() => {
          if (uploaderDisabled) {
            return
          }

          openFilePicker()
        }}
        onKeyDown={(event) => {
          if (uploaderDisabled) {
            return
          }

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault()
            openFilePicker()
          }
        }}
        onDragOver={(event) => {
          if (uploaderDisabled) {
            return
          }

          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => {
          if (uploaderDisabled) {
            return
          }

          setIsDragging(false)
        }}
        onDrop={handleDrop}
        className={`
          flex
          min-h-[20rem]
          w-full
          min-w-0
          cursor-pointer
          flex-col
          items-center
          justify-center
          rounded-[2rem]
          border-2
          border-dashed
          px-5
          py-7
          text-center
          transition-all
          duration-200

          sm:min-h-[23rem]
          sm:px-8
          sm:py-8

          lg:min-h-[25rem]

          ${
            uploaderDisabled
              ? "cursor-not-allowed border-slate-200 bg-white/80 opacity-70"
              : isDragging
                ? "border-emerald-600 bg-emerald-50 shadow-lg shadow-emerald-100"
                : "border-emerald-200 bg-gradient-to-b from-white via-emerald-50/40 to-white hover:border-emerald-400 hover:bg-emerald-50/70 hover:shadow-md hover:shadow-emerald-100/50"
          }
        `}
      >
        {/* ICONO */}
        <div
          className="
            mb-5
            flex
            h-16
            w-16
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-emerald-100
            shadow-sm
            ring-4
            ring-white

            sm:mb-6
            sm:h-20
            sm:w-20
            sm:ring-8
          "
        >
          <svg
            viewBox="0 0 24 24"
            className="
              h-8
              w-8
              text-emerald-700

              sm:h-10
              sm:w-10
            "
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
          </svg>
        </div>

        {/* TÍTULO */}
        <h3
          className="
            text-xl
            font-semibold
            tracking-tight
            text-slate-900

            sm:text-2xl
          "
        >
          Arrastra tu imagen aquí
        </h3>

        <p
          className="
            mt-2
            max-w-lg
            text-sm
            leading-6
            text-slate-600

            sm:mt-3
            sm:text-base
            sm:leading-7
          "
        >
          También puede hacer clic para seleccionar un archivo.
        </p>

        <p
          className="
            mt-4
            max-w-full
            break-words
            rounded-full
            border
            border-emerald-100
            bg-emerald-50
            px-3
            py-1.5
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-emerald-700

            sm:mt-5
            sm:px-4
            sm:py-2
            sm:text-xs
            sm:tracking-[0.18em]
          "
        >
          Formatos admitidos: JPG, PNG, BMP, GIF, TIFF y DICOM
        </p>

        {/* ARCHIVO SELECCIONADO */}
        {file && (
          <p
            className="
              mt-3
              max-w-full
              break-words
              rounded-xl
              border
              border-emerald-100
              bg-white
              px-4
              py-2
              text-sm
              font-medium
              text-slate-700
              shadow-sm

              sm:mt-4
              sm:py-3
            "
            style={{
              overflowWrap: "anywhere",
            }}
          >
            Archivo seleccionado: {file.name}
          </p>
        )}
      </div>

      {(error || success) && (
        <div
          className="
            w-full
            min-w-0
          "
          aria-live="polite"
        >
          {error && (
            <p
              role="alert"
              className="
                w-full
                min-w-0
                break-words
                rounded-xl
                border
                border-red-100
                bg-red-50
                px-4
                py-3
                text-sm
                leading-5
                text-red-700
              "
              style={{
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </p>
          )}

          {!error && success && (
            <p
              className="
                w-full
                min-w-0
                break-words
                rounded-xl
                border
                border-emerald-100
                bg-emerald-50
                px-4
                py-3
                text-sm
                leading-5
                text-emerald-700
              "
              style={{
                overflowWrap: "anywhere",
              }}
            >
              {success}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleConvert}
        disabled={
          loading ||
          loadingProfile ||
          !file ||
          !userDni
        }
        className="
          inline-flex
          min-h-12
          w-full
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-emerald-600
          px-5
          py-3
          text-base
          font-semibold
          leading-tight
          text-white
          shadow-sm
          transition

          hover:bg-emerald-700
          hover:shadow-md

          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-emerald-400
          focus-visible:ring-offset-2

          disabled:cursor-not-allowed
          disabled:bg-slate-300
          disabled:hover:shadow-sm

          sm:text-lg
        "
      >
        {loading
          ? "Subiendo..."
          : "Subir imagen médica"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpeg,.jpg,.bmp,.png,.gif,.tiff,.tif,.dcm"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploaderDisabled}
      />
    </div>
  )
}

export default ImageUploader