export const sharedUserFilters = [
    { value: "all", label: "Todos" },
    { value: "name", label: "Nombre" },
    { value: "id", label: "ID" },
    { value: "dni", label: "DNI" },
    { value: "email", label: "Email" }
]

export const sharedImageFilters = [
    { value: "tipo", label: "Tipo de imagen" },
    { value: "anomalia", label: "Anomalía" },
    { value: "rangoEdad", label: "Rango edad" },
    { value: "validado", label: "Validado" }
]

export const sharedImageSearchScopes = [
    { value: "imagen", label: "Por imagen" },
    { value: "estudio", label: "Por estudio" }
]

export const sharedImageTertiaryOptionsByFilter = {
    tipo: [
        { value: "Limpia", label: "Original" },
        { value: "Resultado IA", label: "IA" },
        { value: "Resultado Manual", label: "Manual" }
    ],
    anomalia: [
        { value: "Atelectasia", label: "Atelectasia" },
        { value: "Derrame pleural", label: "Derrame pleural" },
        { value: "Enfisema", label: "Enfisema" },
        { value: "Sin hallazgos", label: "Sin hallazgos" },
        { value: "Nódulo", label: "Nódulo" },
        { value: "Neumonía", label: "Neumonía" },
        { value: "Neumotórax", label: "Neumotórax" }
    ],
    rangoEdad: [
        { value: "0-18", label: "0-18" },
        { value: "18-40", label: "18-40" },
        { value: "40-65", label: "40-65" },
        { value: "65+", label: "65+" }
    ],
    validado: [
        { value: "SI", label: "Validada" },
        { value: "NO", label: "No validada" },
        { value: "PARCIAL", label: "Parcial" }
    ]
}

export function normalizeSearchToken(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function getTopRankingAnomaly(item) {
    const ranking = Array.isArray(item?.result?.rankingProbabilidades) ? item.result.rankingProbabilidades : []
    if (ranking.length === 0) return ""

    const first = ranking[0]
    if (Array.isArray(first)) {
        return String(first[0] ?? "").trim()
    }
    if (first && typeof first === "object") {
        return String(first?.enfermedad ?? first?.label ?? first?.anomalia ?? "").trim()
    }
    return ""
}

export function parseImageSearchValue(rawValue) {
    const value = String(rawValue ?? "")
    let searchText = ""
    let filtersObj = {}

    try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === "object") {
            searchText = String(parsed.text ?? "").trim()
            if (parsed.filters) {
                if (Array.isArray(parsed.filters)) {
                    filtersObj = { any: parsed.filters }
                } else if (typeof parsed.filters === "object") {
                    filtersObj = parsed.filters
                }
            }
        }
    } catch {
        searchText = value.trim()
    }

    return { searchText, filtersObj }
}

export function matchesImageFilterValue(item, filterKey, rawValue) {
    const value = String(rawValue ?? "")
    const normalizedValue = normalizeSearchToken(value)

    const tipoImagen = normalizeSearchToken(item?.medicalImage?.tipo)
    const rangoEdad = String(item?.medicalImage?.rangoEdad ?? "")
    const validado = normalizeSearchToken(item?.medicalImage?.validado)
    const anomalia = normalizeSearchToken(getTopRankingAnomaly(item))

    if (filterKey === "tipo") return tipoImagen === normalizedValue
    if (filterKey === "rangoEdad") return rangoEdad === value
    if (filterKey === "validado") return validado === normalizedValue
    if (filterKey === "anomalia") return anomalia === normalizedValue
    if (filterKey === "any") {
        return [tipoImagen, rangoEdad, validado, anomalia].some((entry) =>
            String(entry).toLowerCase() === String(value).toLowerCase()
        )
    }

    return false
}

export function filterImagesBySearchValue(items, rawValue, searchScope = "imagen", exactText = false) {
    const source = Array.isArray(items) ? items : []
    const { searchText, filtersObj } = parseImageSearchValue(rawValue)
    const hasFilters = Object.keys(filtersObj || {}).length > 0

    if (!searchText && !hasFilters) {
        return source
    }

    const normalizedScope = searchScope === "estudio" ? "estudio" : "imagen"
    const normalizedText = normalizeSearchToken(searchText)
    const matchesTextValue = (value) => {
        const normalizedValue = normalizeSearchToken(value)
        return exactText
            ? normalizedValue === normalizedText
            : normalizedValue.includes(normalizedText)
    }

    return source.filter((item) => {
        const matchesFilters = Object.entries(filtersObj || {}).some(([filterKey, rawValues]) => {
            const values = Array.isArray(rawValues) ? rawValues : [rawValues]
            return values.some((filterValue) => matchesImageFilterValue(item, filterKey, filterValue))
        })

        let matchesText = true
        if (searchText) {
            const matchesUserName = matchesTextValue(item?.medicalImage?.nombreUsuario)
            const matchesUserIdentifier = matchesTextValue(item?.medicalImage?.dniUsuario)
            if (normalizedScope === "estudio") {
                // The user identifier is a DNI or a generated Google ID (GOOGLE-...).
                // All of these fields identify a study from the unified search box.
                matchesText = [
                    item?.medicalImage?.nombreUsuario,
                    item?.medicalImage?.dniUsuario,
                    item?.medicalImage?.orthancStudyUid,
                ].some(matchesTextValue)
            } else {
                matchesText = matchesTextValue(item?.medicalImage?.id) ||
                    matchesUserName || matchesUserIdentifier
            }
        }

        if (searchText && hasFilters) return matchesText && matchesFilters
        if (searchText) return matchesText
        return matchesFilters
    })
}
