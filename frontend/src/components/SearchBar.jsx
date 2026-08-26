import React, { useState, useRef, useEffect } from "react"
import api from "../servicio/api"
import { ChevronDown, Filter, Search, X } from "lucide-react"
import {
    sharedUserFilters,
    sharedImageFilters,
    sharedImageTertiaryOptionsByFilter,
    parseImageSearchValue,
    filterImagesBySearchValue
} from "./search/searchPresets"

export default function UnifiedSearchBar({
    
    onUsersListed, 
    onImagesListed, 
    onSetNotice,
    onSetError, 
    onSetLoading, 
    userSuggestions = [],
    userSearching = false,
    onUserSuggestionClick,
    imageSearching = false,
    onImageSuggestionClick,

    userFilters = sharedUserFilters,
    imageFilters = sharedImageFilters,
    imageTertiaryOptionsByFilter = sharedImageTertiaryOptionsByFilter,
    onSearchModeChange,
    // initial search mode: 'usuario' | 'imagen' | 'estudio'
    initialSearchMode = "usuario",

}) {
    const [primaryOpen, setPrimaryOpen] = useState(false)
    const [secondaryOpen, setSecondaryOpen] = useState(false)
    const [tertiaryOpen, setTertiaryOpen] = useState(false)
    const [searchMode, setSearchMode] = useState(initialSearchMode)
    const primaryRef = useRef(null)
    const secondaryRef = useRef(null)
    const tertiaryRef = useRef(null)
    const primaryCloseTimerRef = useRef(null)
    const secondaryCloseTimerRef = useRef(null)
    const tertiaryCloseTimerRef = useRef(null)
    const userSearchTimeoutRef = useRef(null)
    const userSearchRequestRef = useRef(0)
    const imageSearchRequestRef = useRef(0)
    const [selectedTertiary, setSelectedTertiary] = useState({})


    const [internalUserSuggestions, setInternalUserSuggestions] = useState([])
    const [internalUserSearching, setInternalUserSearching] = useState(false)
    const [internalImageSearching, setInternalImageSearching] = useState(false)
    const [internalImageSearchBy, setInternalImageSearchBy] = useState(imageFilters?.[0]?.value || "")
    const [inputText, setInputText] = useState("")

    const getTertiaryOptions = () => {
        return imageTertiaryOptionsByFilter?.[internalImageSearchBy] || []
    }

    const showTertiaryDropdown =
        (searchMode === "imagen" || searchMode === "estudio") &&
        getTertiaryOptions().length > 0


    const currentFilters = searchMode === "usuario"
        ? userFilters
        : searchMode === "estudio"
            ? imageFilters.filter((filter) => filter.value !== "tipo")
            : imageFilters
    const currentSearchBy = searchMode === "usuario" ? null : internalImageSearchBy
    const currentSuggestions = searchMode === "usuario" ? (userSuggestions.length ? userSuggestions : internalUserSuggestions) : []
    const isSearching = searchMode === "usuario" ? (userSearching || internalUserSearching) : (imageSearching || internalImageSearching)
    const inputValue = inputText

    const currentFilterLabel =
        currentFilters.find((f) => f.value === currentSearchBy)?.label || "Seleccionar"
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (primaryRef.current && !primaryRef.current.contains(e.target)) {
                setPrimaryOpen(false)
            }
            if (secondaryRef.current && !secondaryRef.current.contains(e.target)) {
                setSecondaryOpen(false)
            }
            if (tertiaryRef.current && !tertiaryRef.current.contains(e.target)) {
                setTertiaryOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            if (primaryCloseTimerRef.current) {
                clearTimeout(primaryCloseTimerRef.current)
            }
            if (secondaryCloseTimerRef.current) {
                clearTimeout(secondaryCloseTimerRef.current)
            }
            if (tertiaryCloseTimerRef.current) {
                clearTimeout(tertiaryCloseTimerRef.current)
            }
            if (userSearchTimeoutRef.current) {
                clearTimeout(userSearchTimeoutRef.current)
            }
        }
    }, [])

    const buildImageSearchValue = (text, filters = selectedTertiary) => {
        const safeText = String(text ?? "")
        const safeFilters = filters && Object.keys(filters).length > 0 ? filters : {}
        return safeText || Object.keys(safeFilters).length > 0
            ? JSON.stringify({ text: safeText, filters: safeFilters })
            : ""
    }

    const handlePrimarySelect = (mode) => {
        if (userSearchTimeoutRef.current) {
            clearTimeout(userSearchTimeoutRef.current)
        }
        userSearchRequestRef.current += 1
        imageSearchRequestRef.current += 1
        setSearchMode(mode)
        // reset filters & input when switching primary mode
        setSelectedTertiary({})
        setInternalImageSearchBy(imageFilters?.[0]?.value || "")
        setInputText("")

        if (typeof onSearchModeChange === "function") {
            onSearchModeChange(mode)
        }

        // Trigger immediate listing for the selected mode
        if (mode === "usuario") {
            fetchUsers()
        } else {
            fetchAllImages()
        }
        setPrimaryOpen(false)
    }

    const safeSetNotice = (msg) => {
        if (typeof onSetNotice === "function") onSetNotice(msg)
    }

    const safeSetError = (msg) => {
        if (typeof onSetError === "function") onSetError(msg)
    }

    const safeSetLoading = (v) => {
        if (typeof onSetLoading === "function") onSetLoading(v)
    }

    async function fetchUsers(requestId = ++userSearchRequestRef.current) {
        safeSetError("")
        safeSetLoading(true)
        setInternalUserSearching(true)
        try {
            const response = await api.get("/api/users")
            const safeUsers = Array.isArray(response.data) ? response.data : []
            if (requestId !== userSearchRequestRef.current) return
            setInternalUserSuggestions([])
            if (typeof onUsersListed === "function") onUsersListed(safeUsers)
        } catch (err) {
            if (requestId !== userSearchRequestRef.current) return
            const detail = err?.response?.data?.detail
            safeSetError(detail || "No se pudo obtener la lista de usuarios")
        } finally {
            if (requestId === userSearchRequestRef.current) {
                setInternalUserSearching(false)
                safeSetLoading(false)
            }
        }
    }

    async function fetchAllImages(requestId = ++imageSearchRequestRef.current) {
        safeSetError("")
        safeSetLoading(true)
        setInternalImageSearching(true)
        try {
            const response = await api.get("/medicalImages")
            const safeImgs = Array.isArray(response.data) ? response.data : []
            if (requestId !== imageSearchRequestRef.current) return
            if (typeof onImagesListed === "function") onImagesListed(safeImgs)
        } catch (err) {
            if (requestId !== imageSearchRequestRef.current) return
            const detail = err?.response?.data?.detail
            safeSetError(detail || "No se pudo obtener la lista de imagenes")
        } finally {
            if (requestId === imageSearchRequestRef.current) {
                setInternalImageSearching(false)
                safeSetLoading(false)
            }
        }
    }

    useEffect(() => {
        if (searchMode === "usuario") {
            // fire and forget; fetchUsers will call onUsersListed
            fetchUsers()
        } else {
            fetchAllImages()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function searchUser(value) {
        const v = String(value || "").trim()
        const requestId = ++userSearchRequestRef.current
        if (!v) {
            await fetchUsers(requestId)
            return
        }
        safeSetError("")
        safeSetLoading(true)
        setInternalUserSearching(true)
        try {
            let detectiveSearchBy = "name"
            if (v.includes("@")) detectiveSearchBy = "email"
            else if (/^\d+$/.test(v)) detectiveSearchBy = "id"
            else if (/^\d{6,9}[A-Z]?$/i.test(v)) detectiveSearchBy = "dni"

            const encoded = encodeURIComponent(v)
            const path = detectiveSearchBy === "id" ? `/api/users/${encoded}` : `/api/users/${detectiveSearchBy}/${encoded}`
            const response = await api.get(path)
            const single = response.data
            if (requestId !== userSearchRequestRef.current) return
            setInternalUserSuggestions([single])
            if (typeof onUsersListed === "function") onUsersListed([single])
            safeSetNotice(`Usuario encontrado (búsqueda por ${detectiveSearchBy})`)
        } catch (err) {
            if (requestId !== userSearchRequestRef.current) return
            const detail = err?.response?.data?.detail
            safeSetError(detail || "No se encontró el usuario")
            setInternalUserSuggestions([])
            if (typeof onUsersListed === "function") onUsersListed([])
        } finally {
            if (requestId === userSearchRequestRef.current) {
                setInternalUserSearching(false)
                safeSetLoading(false)
            }
        }
    }

    async function fetchImagesByImageIdOrUserDni(value, scope = searchMode === "estudio" ? "estudio" : "imagen") {
        const requestId = ++imageSearchRequestRef.current
        const v = String(value || "").trim()
        safeSetError("")
        safeSetLoading(true)
        setInternalImageSearching(true)
        try {

            const response = await api.get("/medicalImages")
            const allImagesData = Array.isArray(response.data) ? response.data : []

            const { searchText, filtersObj } = parseImageSearchValue(v)
            const hasFilters = Object.keys(filtersObj || {}).length > 0

            if (!searchText && !hasFilters) {
                if (requestId !== imageSearchRequestRef.current) return
                if (typeof onImagesListed === "function") onImagesListed(allImagesData)
                return
            }

            const effectiveScope = scope === "estudio" ? "estudio" : "imagen"
            const filteredImages = filterImagesBySearchValue(allImagesData, v, effectiveScope)
            const visibleImages = filteredImages
            if (requestId !== imageSearchRequestRef.current) return
            if (typeof onImagesListed === "function") onImagesListed(visibleImages)
            // Notice messages removed to avoid persistent green messages in the UI
        } catch (err) {
            if (requestId !== imageSearchRequestRef.current) return
            const detail = err?.response?.data?.detail
            safeSetError(detail || "No se pudo listar imagenes por id de imagen o dni de usuario")
            if (typeof onImagesListed === "function") onImagesListed([])
        } finally {
            if (requestId === imageSearchRequestRef.current) {
                setInternalImageSearching(false)
                safeSetLoading(false)
            }
        }
    }

    const handleSearchValueChange = (value) => {
        setInputText(value)
        if (searchMode === "usuario") {
            if (userSearchTimeoutRef.current) {
                clearTimeout(userSearchTimeoutRef.current)
            }
            userSearchTimeoutRef.current = setTimeout(() => {
                searchUser(value)
            }, 180)
        }
    }

    const handleFilterSelect = (filterValue) => {
        setInternalImageSearchBy(filterValue)
        setSecondaryOpen(false)
    }

    const handleSearch = () => {
        const val = inputText
        if (searchMode === "usuario") {
            if (userSearchTimeoutRef.current) {
                clearTimeout(userSearchTimeoutRef.current)
            }
            searchUser(val)
            return
        }
        fetchImagesByImageIdOrUserDni(buildImageSearchValue(val))
    }

    const handleClearSearch = () => {
        setInputText("")
        if (searchMode === "usuario") {
            if (userSearchTimeoutRef.current) {
                clearTimeout(userSearchTimeoutRef.current)
            }
            fetchUsers()
            return
        }
        fetchImagesByImageIdOrUserDni(buildImageSearchValue(""))
    }

    const handleSuggestionClick = (item) => {
        if (searchMode === "usuario") {
            if (typeof onUserSuggestionClick === "function") onUserSuggestionClick(item)
            setInternalUserSuggestions([item])
            if (typeof onUsersListed === "function") onUsersListed([item])
        } else {
            if (typeof onImageSuggestionClick === "function") onImageSuggestionClick(item)
            if (typeof onImagesListed === "function") onImagesListed([item])
        }
    }

    return (
        <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center">
                <div
                    className="relative w-full flex-shrink-0 lg:w-44"
                    ref={primaryRef}
                    onMouseEnter={() => setPrimaryOpen(true)}
                    onMouseLeave={() => {
                        if (primaryCloseTimerRef.current) {
                            clearTimeout(primaryCloseTimerRef.current)
                        }
                        primaryCloseTimerRef.current = setTimeout(() => {
                            setPrimaryOpen(false)
                        }, 2000)
                    }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (primaryCloseTimerRef.current) {
                                clearTimeout(primaryCloseTimerRef.current)
                            }
                            setPrimaryOpen(true)
                        }}
                        className="inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                        <span className="truncate">
                            {searchMode === "usuario" ? "Buscar usuario" : (searchMode === "imagen" ? "Buscar imagen" : "Buscar estudio")}
                        </span>
                        <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 transition-transform ${primaryOpen ? "rotate-180" : ""}`} />
                    </button>

                    {primaryOpen && (
                        <div
                            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
                            onMouseEnter={() => {
                                if (primaryCloseTimerRef.current) {
                                    clearTimeout(primaryCloseTimerRef.current)
                                }
                            }}
                            onMouseLeave={() => {
                                if (primaryCloseTimerRef.current) {
                                    clearTimeout(primaryCloseTimerRef.current)
                                }
                                primaryCloseTimerRef.current = setTimeout(() => {
                                    setPrimaryOpen(false)
                                }, 2000)
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => handlePrimarySelect("usuario")}
                                className={`w-full px-3.5 py-2 text-left text-sm transition-colors ${
                                    searchMode === "usuario"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                Buscar usuario
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrimarySelect("imagen")}
                                className={`w-full border-t border-slate-200 px-3.5 py-2 text-left text-sm transition-colors ${
                                    searchMode === "imagen"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                Buscar imagen
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrimarySelect("estudio")}
                                className={`w-full border-t border-slate-200 px-3.5 py-2 text-left text-sm transition-colors ${
                                    searchMode === "estudio"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                Buscar estudio
                            </button>

                            {/* Gestión integrada movida a la lista de resultados (botones junto a cada usuario) */}
                        </div>
                    )}
                </div>

                {/* Secondary Dropdown: filter options for imagen and estudio */}
                {/* Primary now controls imagen vs estudio; removed secondary scope select as redundant */}

                {(searchMode === "imagen" || searchMode === "estudio") && (
                <div className="relative w-full flex-shrink-0 lg:w-52" ref={secondaryRef}>
                    <button
                        type="button"
                        onMouseEnter={() => setSecondaryOpen(true)}
                        onClick={() => setSecondaryOpen(true)}
                        className="inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                        <span className="truncate">{currentFilterLabel}</span>
                        <Filter className="ml-2 h-4 w-4 flex-shrink-0" />
                    </button>

                    {secondaryOpen && (
                        <div
                            onMouseEnter={() => {
                                if (secondaryCloseTimerRef.current) {
                                    clearTimeout(secondaryCloseTimerRef.current)
                                }
                            }}
                            onMouseLeave={() => {
                                if (secondaryCloseTimerRef.current) {
                                    clearTimeout(secondaryCloseTimerRef.current)
                                }
                                secondaryCloseTimerRef.current = setTimeout(() => {
                                    setSecondaryOpen(false)
                                }, 2000)
                            }}
                            className="absolute right-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
                        >
                            {currentFilters.map((filter) => (
                                <button
                                    type="button"
                                    key={filter.value}
                                    onClick={() => handleFilterSelect(filter.value)}
                                    className={`block w-full px-3.5 py-2 text-left text-sm transition-colors ${
                                        internalImageSearchBy === filter.value
                                            ? "bg-blue-50 text-blue-700 font-medium"
                                            : "text-slate-700 hover:bg-slate-50"
                                    } ${currentFilters.indexOf(filter) > 0 ? "border-t border-slate-200" : ""}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Tertiary Dropdown: Specific filter options (multi-select with chips) */}
                {showTertiaryDropdown && (
                    <div className="relative w-full flex-shrink-0 lg:w-44" ref={tertiaryRef}>
                        <button
                            type="button"
                            onMouseEnter={() => setTertiaryOpen(true)}
                            onClick={() => setTertiaryOpen(true)}
                            className="inline-flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            <span>Seleccionar</span>
                            <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 transition-transform ${tertiaryOpen ? "rotate-180" : ""}`} />
                        </button>

                        {tertiaryOpen && (
                            <div
                                onMouseEnter={() => {
                                    if (tertiaryCloseTimerRef.current) {
                                        clearTimeout(tertiaryCloseTimerRef.current)
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (tertiaryCloseTimerRef.current) {
                                        clearTimeout(tertiaryCloseTimerRef.current)
                                    }
                                    tertiaryCloseTimerRef.current = setTimeout(() => {
                                        setTertiaryOpen(false)
                                    }, 2000)
                                }}
                                className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
                            >
                                {getTertiaryOptions().map((option) => {
                                    const selectedList = selectedTertiary[internalImageSearchBy] || []
                                    const selected = selectedList.includes(option.value)
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => {
                                                const current = selectedTertiary || {}
                                                const list = Array.isArray(current[internalImageSearchBy]) ? current[internalImageSearchBy] : []
                                                const nextList = selected
                                                    ? list.filter((v) => v !== option.value)
                                                    : [...list, option.value]
                                                const next = { ...current, [internalImageSearchBy]: nextList }
                                                setSelectedTertiary(next)
                                                // Combine text + filters as structured JSON
                                                const combined = buildImageSearchValue(inputText, next)
                                                fetchImagesByImageIdOrUserDni(combined)
                                            }}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                                selected ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                        >
                                            <input type="checkbox" readOnly checked={selected} className="h-4 w-4 rounded border-slate-300" />
                                            <span>{option.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Search Input */}
                <div className="relative min-w-0 flex-1">
                <input
                    type="text"
                    aria-label={searchMode === "usuario" ? "Buscar usuario" : searchMode === "estudio" ? "Buscar por orthancStudyUid" : "Buscar por imagen"}
                    placeholder={searchMode === "usuario" ? "Busca por nombre, email, DNI o ID..." : searchMode === "estudio" ? "Busca por orthancStudyUid (y/o usa filtros)..." : "Busca por ID imagen o DNI usuario (y/o usa filtros)..."}
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value
                        handleSearchValueChange(val)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch()
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-20 text-sm text-slate-900 placeholder-slate-500 transition-colors hover:border-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-12 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        aria-label="Limpiar búsqueda"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                </div>

                {/* Search Button */}
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    title="Buscar"
                    aria-label="Buscar"
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-900 text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSearching ? (
                        <span className="inline-block animate-spin">↻</span>
                    ) : (
                        <Search className="h-5 w-5" aria-hidden="true" />
                    )}
                </button>
            </div>

            {/* Las sugerencias son exclusivas de la búsqueda de usuarios. */}
            {searchMode === "usuario" && currentSuggestions.length > 0 && (
                <div className="relative z-40 mt-3 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
                    {currentSuggestions.map((item, index) => (
                        <button
                            type="button"
                            key={index}
                            onClick={() => handleSuggestionClick(item)}
                            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            <span className="font-semibold">{item?.name || item?.id}</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item?.dni || "Sin DNI"}</span>
                        </button>
                    ))}
                </div>
            )}
            </div>

            {/* Selected tertiary chips - outside flex to prevent displacement */}
            {Object.keys(selectedTertiary).length > 0 && (
                <div className="flex flex-wrap gap-2 px-1 sm:px-3">
                    {Object.entries(selectedTertiary).flatMap(([cat, vals]) =>
                        (Array.isArray(vals) ? vals : []).map((val) => {
                            const opt = (imageTertiaryOptionsByFilter?.[cat] || []).find((o) => o.value === val)
                            return (
                                <span key={`${cat}-${val}`} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm">
                                    {opt ? opt.label : val}
                                    <button type="button" onClick={() => {
                                        const current = { ...selectedTertiary }
                                        const nextList = (current[cat] || []).filter((v) => v !== val)
                                        if (nextList.length > 0) current[cat] = nextList
                                        else delete current[cat]
                                        setSelectedTertiary(current)
                                        const combined = buildImageSearchValue(inputText, current)
                                        fetchImagesByImageIdOrUserDni(combined)
                                    }} className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full font-semibold leading-none hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label={`Eliminar filtro ${opt ? opt.label : val}`}>×</button>
                                </span>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
