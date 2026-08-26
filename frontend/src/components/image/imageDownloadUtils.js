import { zipSync } from "fflate"
import api from "../../servicio/api"

function getToken() {
  return localStorage.getItem("accessToken") || ""
}

function sanitizeFileName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80)
}

function getDownloadExtension(format) {
  return format === "dicom" ? ".dcm" : ".png"
}

export function getImageId(item) {
  return item?.medicalImage?.id ?? null
}

function getImageLabel(item, fallbackLabel) {
  const tipo = String(item?.medicalImage?.tipo || "").trim()
  if (tipo === "Limpia") return "01_original"
  if (tipo === "Resultado IA") return "02_ia"
  if (tipo === "Resultado Manual") return "03_manual"
  return tipo ? sanitizeFileName(tipo) : fallbackLabel
}

function getDownloadTag(item, fallbackLabel = "imagen") {
  const imageId = getImageId(item)
  return sanitizeFileName([getImageLabel(item, fallbackLabel), imageId].filter(Boolean).join("_"))
}

export function buildTraceableImageFileName(item, format, fallbackLabel = "imagen") {
  return `${getDownloadTag(item, fallbackLabel)}${getDownloadExtension(format)}`
}

function buildStudyFolderName(item, index = 0) {
  return `estudio_${getImageId(item) || index + 1}`
}

function getArchiveName(format, scope) {
  const now = new Date()
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-")
  const time = [String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")].join("-")
  return `${scope === "estudio" ? "estudios" : "imagenes"}_${format}_${date}_${time}`
}

function buildDicomUrl(imageId) {
  return `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/download`
}

function buildPngUrl(imageId, cacheKey = "") {
  const base = `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(imageId)}/preview`
  return cacheKey ? `${base}?v=${encodeURIComponent(cacheKey)}` : base
}

async function fetchBlob(url, headers = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const error = new Error(`Error ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.blob()
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revocar la URL en el mismo turno puede cancelar descargas grandes en
  // algunos navegadores antes de que empiecen a leer el blob (por ejemplo,
  // los ZIP de una búsqueda). Se deja terminar el clic primero.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadSingleImage(item, format, cacheKey = "") {
  const imageId = getImageId(item)
  if (!imageId) return
  const headers = format === "dicom" ? { Authorization: `Bearer ${getToken()}` } : {}
  if (format === "dicom" && !getToken()) throw new Error("Debes iniciar sesión para descargar DICOM")
  const url = format === "dicom" ? buildDicomUrl(imageId) : buildPngUrl(imageId, cacheKey)
  const blob = await fetchBlob(url, headers)
  downloadBlob(blob, buildTraceableImageFileName(item, format, `imagen_${imageId}`))
}

function buildStudyEntries(item, format) {
  const headers = format === "dicom" ? { Authorization: `Bearer ${getToken()}` } : {}
  if (format === "dicom" && !getToken()) throw new Error("Debe iniciar sesión para descargar DICOM")
  const entries = []
  const add = (imageId, label, cacheKey = "") => {
    if (!imageId) return
    entries.push({
      imageId,
      filename: `${label}_${imageId}${getDownloadExtension(format)}`,
      url: format === "dicom" ? buildDicomUrl(imageId) : buildPngUrl(imageId, cacheKey),
      headers,
    })
  }
  add(item?.medicalImage?.id, "01_original")
  add(item?.result?.gradcamImageId, "02_ia")
  add(item?.result?.manualImageId, "03_manual", item?.result?.manualVersion || "")
  return entries
}

async function addToArchive(files, path, entry) {
  const blob = await fetchBlob(entry.url, entry.headers)
  files[path] = new Uint8Array(await blob.arrayBuffer())
}

export async function downloadImageCollection(items, format, scope = "imagen") {
  const validItems = (Array.isArray(items) ? items : []).filter((item) => getImageId(item))
  if (validItems.length === 0) return

  const isStudyDownload = scope === "estudio"
  const archiveName = getArchiveName(format, scope)
  const files = {}
  const failedEntries = []

  for (let index = 0; index < validItems.length; index += 1) {
    const item = validItems[index]
    const folder = isStudyDownload ? buildStudyFolderName(item, index) : ""
    const entries = isStudyDownload
      ? buildStudyEntries(item, format)
      : [{
          filename: buildTraceableImageFileName(item, format, `imagen_${index + 1}`),
          imageId: getImageId(item),
          url: format === "dicom" ? buildDicomUrl(getImageId(item)) : buildPngUrl(getImageId(item)),
          headers: format === "dicom" ? { Authorization: `Bearer ${getToken()}` } : {},
        }]

    if (format === "dicom" && !getToken()) throw new Error("Debes iniciar sesión para descargar DICOM")
    for (const entry of entries) {
      const path = folder ? `${folder}/${entry.filename}` : entry.filename
      try {
        await addToArchive(files, path, entry)
      } catch (error) {
        // Una referencia borrada de Orthanc no debe impedir descargar las
        // demas imagenes validas del resultado.
        failedEntries.push({ imageId: entry.imageId, filename: entry.filename, status: error?.status || 0 })
      }
    }
  }

  if (Object.keys(files).length === 0) {
    const status = failedEntries[0]?.status
    throw new Error(status ? `No se pudo descargar ninguna imagen (Error ${status})` : "No se pudo descargar ninguna imagen")
  }

  const zipBytes = zipSync(files, { level: 6 })
  downloadBlob(
    new Blob([zipBytes], { type: "application/zip" }),
    `${archiveName}.zip`
  )

  return { downloaded: Object.keys(files).length, failedEntries }
}
