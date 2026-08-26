import React, { useState } from "react"

export default function UserSearchPanel({
  searchBy,
  searchValue,
  onSearchByChange,
  onSearchValueChange,
  onSearch,
  suggestions = [],
  onSuggestionClick,
  isSearching = false,
}) {
  const isDynamicMode = searchBy === "name" || searchBy === "dni"
  const [activeIndex, setActiveIndex] = useState(-1)
  const resolvedActiveIndex = activeIndex >= suggestions.length ? -1 : activeIndex

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

  return (
    <details className="rounded-lg border border-gray-200" open>
      <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold text-gray-900">
        Buscar usuario
      </summary>
      <section className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <select
            value={searchBy}
            onChange={(event) => onSearchByChange(event.target.value)}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="name">Nombre</option>
            <option value="id">ID</option>
            <option value="dni">DNI</option>
            <option value="email">Email</option>
          </select>
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={`Buscar por ${searchBy}`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {isDynamicMode && searchValue.trim().length > 0 && (
          <div className="mb-3 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {isSearching ? "Buscando coincidencias..." : `${suggestions.length} coincidencia(s)`}
            </div>
            {suggestions.length > 0 ? (
              suggestions.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSuggestionClick?.(user)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    resolvedActiveIndex === index ? "bg-indigo-50" : "bg-white"
                  }`}
                >
                  <span className="font-semibold text-gray-900">{user.name}</span>
                  <span className="text-gray-600">DNI: {user.dni}</span>
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
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Buscar
          </button>
        )}
      </section>
    </details>
  )
}
