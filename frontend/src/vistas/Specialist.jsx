import React, { useState } from "react"
import UnifiedSearchBar from "../components/SearchBar"
import ImageResult from "../components/image/ImageResult"
import UserResultsList from "../components/user/UserResultsList"
import SpecialistStatusMessages from "../components/specialist/SpecialistStatusMessages"
import {sharedUserFilters, sharedImageFilters, sharedImageTertiaryOptionsByFilter} from "../components/search/searchPresets"
import Logout from "../components/Logout"

export default function Specialist() {
    const [users, setUsers] = useState([])
    const [images, setImages] = useState([])
    const [resultMode, setResultMode] = useState("users")
    const [imageViewMode, setImageViewMode] = useState("estudio")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-4 sm:px-6 lg:px-8">
            <div className="w-full rounded-xl bg-white p-5 shadow-lg sm:p-6">

                <header className="mb-6 flex items-start justify-between gap-4">

                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            PANEL DE ANÁLISIS
                        </h1>
                    </div>

                    <Logout className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100" />

                </header>

                <div className="space-y-6">

                    <section className="rounded-xl border border-emerald-200 bg-white">

                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">

                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                                Área de especialista
                            </p>

                            <h3 className="mt-1 text-xl font-semibold text-white">
                                Búsqueda y análisis de estudios
                            </h3>

                            <p className="mt-1 text-sm text-emerald-100">
                                Busca por usuario, imagen o estudio y revisa los resultados disponibles.
                            </p>

                        </div>

                        <div className="overflow-visible p-6">
                            <UnifiedSearchBar
                                initialSearchMode="estudio"

                                onSearchModeChange={(mode) => {
                                    if (mode === "usuario") {
                                        setResultMode("users")
                                        setImages([])
                                    } else {
                                        setResultMode("images")
                                        setUsers([])
                                        setImageViewMode(
                                            mode === "estudio"
                                                ? "estudio"
                                                : "imagen"
                                        )
                                    }
                                }}

                                onUsersListed={(list) => {
                                    setUsers(
                                        Array.isArray(list)
                                            ? list
                                            : []
                                    )
                                    setImages([])
                                    setResultMode("users")
                                }}

                                onImagesListed={(list) => {
                                    setImages(
                                        Array.isArray(list)
                                            ? list
                                            : []
                                    )
                                    setUsers([])
                                    setResultMode("images")
                                }}

                                onSetNotice={setNotice}
                                onSetError={setError}
                                onSetLoading={setLoading}

                                userFilters={sharedUserFilters}
                                imageFilters={sharedImageFilters}
                                imageTertiaryOptionsByFilter={
                                    sharedImageTertiaryOptionsByFilter
                                }
                            />
                        </div>

                    </section>

                    {(loading || error || notice) && (
                        <SpecialistStatusMessages
                            loading={loading}
                            error={error}
                            notice={notice}
                        />
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white">

                        <div className="border-b border-slate-200 px-6 py-5">

                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                Información del sistema
                            </p>

                            <h3 className="mt-1 text-xl font-semibold text-slate-900">
                                Resultados
                            </h3>

                        </div>

                        <div className="overflow-visible p-6">

                            {resultMode === "images" ? (
                                <ImageResult
                                    images={images}
                                    loading={loading}
                                    variant="specialist"
                                    imageViewMode={imageViewMode}
                                    compact
                                />
                            ) : (
                                <UserResultsList
                                    users={users}
                                    loading={loading}
                                    showActions={false}
                                    showRole={false}
                                    compact
                                />
                            )}

                        </div>

                    </section>

                </div>
            </div>
        </div>
    )
}