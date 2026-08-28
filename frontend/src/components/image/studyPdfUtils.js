import { jsPDF } from "jspdf"
import logoUrl from "../../assets/iconouja.png"
import { getUserIdentifierLabel } from "../user/userIdentifier"

function formatDate(value) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString("es-ES")
}

function formatReportDate(value) {
  if (!value) return "SINFECHA"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "SINFECHA"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}${month}${day}`
}

function getManualSpecialistName(studyItem) {
  return (
    studyItem?.result?.specialistName ||
    studyItem?.medicalImage?.specialistName ||
    "No informado"
  )
}

function flattenResultFields(result) {
  if (!result || typeof result !== "object") {
    return []
  }

  const skipKeys = new Set([
    "gradcamImageId",
    "manualImageId",
    "specialistName",
  ])

  const output = []

  for (const [key, value] of Object.entries(result)) {
    if (skipKeys.has(key)) continue
    if (value == null) continue
    if (typeof value === "object") continue

    output.push([getResultFieldLabel(key, value), String(value)])
  }

  return output
}

function getResultFieldLabel(key, value) {
  const labels = {
    id: "Identificador del resultado",
    idUsuario: "Identificador interno del usuario",
    dniUsuario: getUserIdentifierLabel(value),
    observaciones: "Observaciones clínicas",
  }

  if (labels[key]) return labels[key]

  return String(key)
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      resolve(String(reader.result || ""))
    }

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen"))
    }

    reader.readAsDataURL(blob)
  })
}

async function imageUrlToDataUrl(url) {
  if (!url) return ""

  const resp = await fetch(url)

  if (!resp.ok) {
    throw new Error(`Error ${resp.status}`)
  }

  const blob = await resp.blob()

  return blobToDataUrl(blob)
}

function ensurePageSpace(
  doc,
  neededHeight,
  cursorY,
  margin,
  pageHeight
) {
  if (cursorY + neededHeight <= pageHeight - margin) {
    return cursorY
  }

  doc.addPage()

  return margin
}

function writeSectionTitle(
  doc,
  title,
  cursorY,
  margin,
  pageWidth,
  pageHeight
) {
  const nextY = ensurePageSpace(
    doc,
    10,
    cursorY,
    margin,
    pageHeight
  )

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)

  doc.text(title, margin, nextY)

  doc.setDrawColor(215, 220, 224)
  doc.setLineWidth(0.25)

  doc.line(
    margin,
    nextY + 2,
    pageWidth - margin,
    nextY + 2
  )

  return nextY + 8
}

function writeKeyValue(
  doc,
  key,
  value,
  cursorY,
  margin,
  pageWidth,
  pageHeight
) {
  const maxTextWidth = pageWidth - margin * 2

  const safeValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "-"
      : String(value)

  const lines = doc.splitTextToSize(safeValue, maxTextWidth)

  let y = ensurePageSpace(
    doc,
    lines.length * 5 + 8,
    cursorY,
    margin,
    pageHeight
  )

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)

  doc.text(String(key).toLocaleUpperCase("es-ES"), margin, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.setTextColor(55, 65, 81)

  doc.text(lines, margin, y + 4)

  return y + lines.length * 5 + 4
}

function fitImage(
  imgWidth,
  imgHeight,
  maxWidth,
  maxHeight
) {
  if (!imgWidth || !imgHeight) {
    return {
      width: maxWidth,
      height: maxHeight,
    }
  }

  const ratio = Math.min(
    maxWidth / imgWidth,
    maxHeight / imgHeight
  )

  return {
    width: imgWidth * ratio,
    height: imgHeight * ratio,
  }
}

function addFittedImage(
  doc,
  dataUrl,
  x,
  y,
  maxWidth,
  maxHeight,
  format = "PNG"
) {
  if (!dataUrl) return null

  const props = doc.getImageProperties(dataUrl)

  const fitted = fitImage(
    props.width,
    props.height,
    maxWidth,
    maxHeight
  )

  doc.addImage(
    dataUrl,
    format,
    x,
    y,
    fitted.width,
    fitted.height
  )

  return fitted
}

async function addStudyImagePage(
  doc,
  title,
  url
) {
  doc.addPage()

  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const contentTop = 39

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59)

  doc.text(title, margin, contentTop)

  doc.setDrawColor(215, 220, 224)
  doc.setLineWidth(0.25)

  doc.line(
    margin,
    contentTop + 3,
    pageWidth - margin,
    contentTop + 3
  )

  if (!url) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)

    doc.text(
      "No disponible",
      margin,
      contentTop + 14
    )

    return
  }

  try {
    const dataUrl = await imageUrlToDataUrl(url)

    const props = doc.getImageProperties(dataUrl)

    const maxWidth = pageWidth - margin * 2

    const maxHeight =
      pageHeight -
      contentTop -
      32

    const fitted = fitImage(
      props.width,
      props.height,
      maxWidth,
      maxHeight
    )

    const x =
      margin +
      (maxWidth - fitted.width) / 2

    const y =
      contentTop +
      10 +
      (maxHeight - fitted.height) / 2

    doc.addImage(
      dataUrl,
      props.fileType || "PNG",
      x,
      y,
      fitted.width,
      fitted.height
    )
  } catch {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)

    doc.text(
      "No se pudo cargar esta imagen para el PDF.",
      margin,
      contentTop + 14
    )
  }
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch(logoUrl)

    if (!response.ok) {
      return ""
    }

    return await blobToDataUrl(
      await response.blob()
    )
  } catch {
    return ""
  }
}

function decoratePage(
  doc,
  {
    pageNumber,
    totalPages,
    logoDataUrl,
    specialistName,
    reportCode,
    studyItem,
  }
) {
  const margin = 12

  const pageWidth =
    doc.internal.pageSize.getWidth()

  const pageHeight =
    doc.internal.pageSize.getHeight()

  const headerBottom = 29
  const footerY = pageHeight - 12

  doc.setFillColor(248, 250, 247)

  doc.rect(
    0,
    0,
    pageWidth,
    33,
    "F"
  )

  doc.setDrawColor(191, 155, 48)
  doc.setLineWidth(0.8)

  doc.line(
    margin,
    6,
    pageWidth - margin,
    6
  )

  doc.setDrawColor(205, 210, 214)
  doc.setLineWidth(0.3)

  doc.line(
    margin,
    headerBottom,
    pageWidth - margin,
    headerBottom
  )

  if (logoDataUrl) {
    try {
      addFittedImage(
        doc,
        logoDataUrl,
        margin,
        8,
        34,
        18
      )
    } catch (error) {
      void error
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)

  doc.text(
    "Informe clínico",
    margin + 40,
    13
  )

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)

  doc.text(
    "Documento formal para archivo, revisión e impresión.",
    margin + 40,
    18
  )

  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)

  doc.text(
    `Código: ${reportCode}`,
    margin + 40,
    23
  )

  const studyUid =
    studyItem?.medicalImage?.orthancStudyUid ??
    studyItem?._orthancStudyUid ??
    "-"

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)

  doc.text(
    String(studyUid),
    pageWidth - margin,
    12,
    {
      align: "right",
      maxWidth: 67,
    }
  )

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(30, 41, 59)

  doc.text(
    "Revisado por:",
    pageWidth - margin - 67,
    20
  )

  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)

  doc.text(
    specialistName,
    pageWidth - margin,
    20,
    {
      align: "right",
      maxWidth: 60,
    }
  )

  doc.setDrawColor(205, 210, 214)
  doc.setLineWidth(0.3)

  doc.line(
    margin,
    pageHeight - 18,
    pageWidth - margin,
    pageHeight - 18
  )

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)

  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    margin,
    footerY
  )

  doc.text(
    "Documento confidencial para uso clínico.",
    pageWidth / 2,
    footerY,
    {
      align: "center",
    }
  )

  doc.text(
    "Uso profesional",
    pageWidth - margin,
    footerY,
    {
      align: "right",
    }
  )

  if (pageNumber === 1) {
    const signatureX = pageWidth - 84
    const signatureY = pageHeight - 50

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)

    doc.text(
      "Revisión clínica",
      signatureX,
      signatureY
    )

    doc.setDrawColor(120, 120, 120)
    doc.setLineWidth(0.3)

    doc.line(
      signatureX,
      signatureY + 3,
      signatureX + 52,
      signatureY + 3
    )

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)

    doc.text(
      specialistName,
      signatureX,
      signatureY + 9
    )

    doc.setDrawColor(120, 120, 120)

    doc.roundedRect(
      signatureX + 60,
      signatureY - 2,
      18,
      18,
      3,
      3
    )

    doc.setFontSize(7)

    doc.text(
      "SELLO",
      signatureX + 69,
      signatureY + 8,
      {
        align: "center",
      }
    )
  }
}

export async function downloadStudyPdf({
  studyItem,
  cleanPreviewUrl,
  iaPreviewUrl,
  manualPreviewUrl,
}) {
  const medicalImage =
    studyItem?.medicalImage || {}

  const result =
    studyItem?.result || {}

  const specialistName =
    getManualSpecialistName(studyItem)

  const reportCode =
    `EST-${medicalImage?.id || "SIN-ID"}-${formatReportDate(
      medicalImage?.fechaSubida
    )}`

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const margin = 12

  const pageWidth =
    doc.internal.pageSize.getWidth()

  const pageHeight =
    doc.internal.pageSize.getHeight()

  const contentTop = 40

  let y = contentTop

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)

  doc.text(
    "Informe clínico",
    margin,
    y
  )

  y += 7

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)

  doc.text(
    "Resumen formal del estudio con resultados e imágenes clínicas.",
    margin,
    y
  )

  y += 12

  y = writeSectionTitle(
    doc,
    "Datos del estudio",
    y,
    margin,
    pageWidth,
    pageHeight
  )

  const studyRows = [
    [
      "Identificador del estudio",
      medicalImage?.orthancStudyUid ||
        studyItem?._orthancStudyUid ||
        "-",
    ],
    [
      "Usuario",
      medicalImage?.nombreUsuario || "-",
    ],
    [
      getUserIdentifierLabel(medicalImage?.dniUsuario),
      medicalImage?.dniUsuario || "-",
    ],
    [
      "Fecha de subida",
      formatDate(medicalImage?.fechaSubida),
    ],
  ]

  for (const [key, value] of studyRows) {
    y = writeKeyValue(
      doc,
      key,
      value,
      y,
      margin,
      pageWidth,
      pageHeight
    )
  }

  y += 3

  y = writeSectionTitle(
    doc,
    "Resultado clínico",
    y,
    margin,
    pageWidth,
    pageHeight
  )

  y = writeKeyValue(
    doc,
    "Especialista que realizó la modificación",
    specialistName,
    y,
    margin,
    pageWidth,
    pageHeight
  )

  const resultRows =
    flattenResultFields(result)

  if (resultRows.length === 0) {
    y = writeKeyValue(
      doc,
      "Estado",
      "Sin datos de resultado",
      y,
      margin,
      pageWidth,
      pageHeight
    )
  } else {
    for (const [key, value] of resultRows) {
      y = writeKeyValue(
        doc,
        key,
        value,
        y,
        margin,
        pageWidth,
        pageHeight
      )
    }
  }


  y += 3

  y = writeSectionTitle(
    doc,
    "Observación clínica",
    y,
    margin,
    pageWidth,
    pageHeight
  )

  y = writeKeyValue(
    doc,
    "Finalidad",
    "Documento preparado para impresión, archivo o revisión clínica.",
    y,
    margin,
    pageWidth,
    pageHeight
  )

  await addStudyImagePage(
    doc,
    "Imagen original",
    cleanPreviewUrl
  )

  await addStudyImagePage(
    doc,
    "Resultado del análisis IA",
    iaPreviewUrl
  )

  await addStudyImagePage(
    doc,
    "Resultado de la anotación manual",
    manualPreviewUrl
  )

  const logoDataUrl =
    await loadLogoDataUrl()

  const totalPages =
    doc.getNumberOfPages()

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber += 1
  ) {
    doc.setPage(pageNumber)

    decoratePage(doc, {
      pageNumber,
      totalPages,
      logoDataUrl,
      specialistName,
      reportCode,
      studyItem,
    })
  }

  doc.save(`informe_${reportCode}.pdf`)
}
