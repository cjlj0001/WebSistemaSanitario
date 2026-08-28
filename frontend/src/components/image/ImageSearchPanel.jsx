import React, { useState } from "react"

export default function ImageSearchPanel({
  searchBy,
  searchValue,
  onSearchByChange,
  onSearchValueChange,
  onSearch,
  suggestions = [],
  onSuggestionClick,
  isSearching = false,
  allowTypeFilter = false,
  allowAnomalyFilter = false,
  allowAgeRangeFilter = false,
  allowValidationFilter = false,
}) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const resolvedActiveIndex = activeIndex >= suggestions.length ? -1 : activeIndex
  const isDynamicMode = searchBy === "id" || searchBy === "dni"

  const handleInputKeyDown = (event) => {
    if (!isDynamicMode || !searchValue.trim()) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (suggestions.length === 0) return
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (suggestions.length === 0) return
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
      return
    }

    if (event.key === "Enter") {
      if (resolvedActiveIndex >= 0 && suggestions[resolvedActiveIndex]) {
        event.preventDefault()
        onSuggestionClick?.(suggestions[resolvedActiveIndex])
      }
      return
    }

    if (event.key === "Escape") {
      setActiveIndex(-1)
    }
  }

  const anomalyOptions = [
    "Atelectasia",
    "Derrame pleural",
    "Enfisema",
    "Sin hallazgos",
    "Nódulo",
    "Neumonía",
    "Neumotórax",
  ]

  const placeholder =
    searchBy === "id"
      ? "Buscar por id de imagen"
      : searchBy === "dni"
        ? "Buscar por dni de usuario"
        : searchBy === "anomalia"
          ? "Buscar por tipo de anomalia"
          : searchBy === "rangoEdad"
            ? "Buscar por rango de edad"
            : searchBy === "validado"
              ? "Buscar por estado de validacion"
          : "Buscar imagenes"

  return (
    <details className="rounded-lg border border-gray-200" open>
      <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold text-gray-900">
        Buscar imagenes
      </summary>
      <section className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <select
            value={searchBy}
            onChange={(event) => onSearchByChange(event.target.value)}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="id">ID imagen</option>
            <option value="dni">DNI usuario</option>
            {allowTypeFilter && <option value="tipo">Tipo imagen</option>}
            {allowAnomalyFilter && <option value="anomalia">Tipo anomalia</option>}
            {allowAgeRangeFilter && <option value="rangoEdad">Rango edad</option>}
            {allowValidationFilter && <option value="validado">Validacion</option>}
          </select>

          {allowTypeFilter && searchBy === "tipo" ? (
            <select
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona tipo de imagen</option>
              <option value="Limpia">Limpia</option>
              <option value="Resultado IA">Resultado IA</option>
              <option value="Resultado Manual">Resultado Manual</option>
            </select>
          ) : allowAnomalyFilter && searchBy === "anomalia" ? (
            <select
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona tipo de anomalia</option>
              {anomalyOptions.map((anomalia) => (
                <option key={anomalia} value={anomalia}>{anomalia}</option>
              ))}
            </select>
          ) : allowAgeRangeFilter && searchBy === "rangoEdad" ? (
            <select
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona rango de edad</option>
              <option value="0-18">0-18</option>
              <option value="18-40">18-40</option>
              <option value="40-65">40-65</option>
              <option value="65+">65+</option>
            </select>
          ) : allowValidationFilter && searchBy === "validado" ? (
            <select
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona estado de validacion</option>
              <option value="SI">Validada</option>
              <option value="NO">No validada</option>
              <option value="PARCIAL">Parcial</option>
            </select>
          ) : (
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </div>

        {isDynamicMode && searchValue.trim().length > 0 && (
          <div className="mb-3 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {isSearching ? "Buscando coincidencias..." : `${suggestions.length} coincidencia(s)`}
            </div>
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <button
                  key={item?.medicalImage?.id ?? `${item?.medicalImage?.dniUsuario}-${index}`}
                  type="button"
                  onClick={() => onSuggestionClick?.(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    resolvedActiveIndex === index ? "bg-emerald-50" : "bg-white"
                  }`}
                >
                  <span className="font-semibold text-gray-900">Imagen #{item?.medicalImage?.id}</span>
                  <span className="text-gray-600">DNI: {item?.medicalImage?.dniUsuario ?? "-"}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-gray-600">Sin coincidencias.</p>
            )}
          </div>
        )}

        {!isDynamicMode && (
          <button
            type="button"
            onClick={onSearch}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Buscar imagenes
          </button>
        )}
      </section>
    </details>
  )
}
