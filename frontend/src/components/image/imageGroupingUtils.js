export function groupImagesByOrthancStudyUid(items) {
  const source = Array.isArray(items) ? items : []
  const groups = new Map()

  for (const item of source) {
    const orthancStudyUid = item?.medicalImage?.orthancStudyUid
    if (!orthancStudyUid) continue
    if (!groups.has(orthancStudyUid)) groups.set(orthancStudyUid, [])
    groups.get(orthancStudyUid).push(item)
  }

  const result = []

  for (const [orthancStudyUid, itemsInStudy] of groups.entries()) {

    const idMap = new Map()
    const itemsSorted = [...itemsInStudy].sort((a, b) => {
      const aDate = a?.medicalImage?.fechaSubida ? new Date(a.medicalImage.fechaSubida).getTime() : 0
      const bDate = b?.medicalImage?.fechaSubida ? new Date(b.medicalImage.fechaSubida).getTime() : 0
      return aDate - bDate
    })
    for (const it of itemsSorted) {
      const id = it?.medicalImage?.id
      if (id != null) idMap.set(String(id), it)
    }

    const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, "")

    const findByTipo = (needle) => itemsSorted.find((it) => normalize(it?.medicalImage?.tipo) === normalize(needle))
    const findByTipoContains = (sub) => itemsSorted.find((it) => normalize(it?.medicalImage?.tipo).includes(normalize(sub)))

    let cleanItem = findByTipo("Limpia") || itemsSorted[0] || null

    let iaItem = null
    for (const it of itemsSorted) {
      const res = it?.result || {}
      const gId = res?.gradcamImageId || null
      if (gId && idMap.has(String(gId))) {
        iaItem = idMap.get(String(gId))
        break
      }
    }

    if (!iaItem) iaItem = findByTipo("Resultado IA") || findByTipoContains("ia") || null

    let manualItem = null
    for (const it of itemsSorted) {
      const res = it?.result || {}
      const mId = res?.manualImageId || null
      if (mId && idMap.has(String(mId))) {
        manualItem = idMap.get(String(mId))
        break
      }
    }
    if (!manualItem) manualItem = findByTipo("Resultado Manual") || findByTipoContains("manual") || null
    const preferredResult = (cleanItem?.result) || (iaItem?.result) || (manualItem?.result) || null

    const mergedResult = preferredResult
      ? {
          ...preferredResult,
          gradcamImageId: iaItem?.medicalImage?.id ?? preferredResult.gradcamImageId ?? null,
          manualImageId: manualItem?.medicalImage?.id ?? preferredResult.manualImageId ?? null,
          specialistName: manualItem?.medicalImage?.specialistName ?? preferredResult.specialistName ?? null,
        }
      : null

    const finalClean = cleanItem || itemsSorted[0] || null

    if (finalClean) {
      result.push({
        ...finalClean,
        _orthancStudyUid: orthancStudyUid,
        medicalImage: finalClean.medicalImage,
        result: mergedResult,
      })
    }
  }

  return result
}
