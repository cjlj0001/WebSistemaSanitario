import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import api from "../servicio/api"
import ImageResult from "../components/image/ImageResult"

export default function Resultados() {
    const navigate = useNavigate()

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        let mounted = true

        const fetchData = async () => {
            setLoading(true)
            setError("")

            try {
                const res = await api.get("/medicalImages/me")

                if (!mounted) return

                setItems(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                if (!mounted) return

                setError(
                    err?.response?.data?.detail ||
                    err?.message ||
                    "Error al obtener imágenes"
                )
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            mounted = false
        }
    }, [])

    return (
        <main className="min-h-screen w-full bg-slate-100 px-4 py-4 sm:px-6 lg:px-8">
            <div className="w-full rounded-xl bg-white p-5 shadow-lg sm:p-6">

                <header className="mb-6 flex items-start justify-between gap-4">

                    <div className="min-w-0 flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">
                            RESULTADOS DE ESTUDIOS
                        </h1>
                    </div>

                    <div className="shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    if (window.history.length > 2) {
                                        navigate(-1)
                                    } else {
                                        navigate("/upload")
                                    }
                                } catch {
                                    window.location.href = "/upload"
                                }
                            }}
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-red-200
                                bg-red-50
                                px-4
                                py-2
                                text-sm
                                font-semibold
                                text-red-700
                                transition
                                hover:bg-red-100
                                focus:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-red-300
                            "
                        >
                            <ArrowLeft className="h-4 w-4 shrink-0" />
                            <span>Volver atrás</span>
                        </button>
                    </div>

                </header>

                <div className="space-y-6">

                    {error && (
                        <p
                            role="alert"
                            className="
                                w-full
                                rounded-xl
                                border
                                border-red-200
                                bg-red-50
                                px-4
                                py-3
                                text-sm
                                leading-5
                                text-red-700
                                [overflow-wrap:anywhere]
                            "
                        >
                            {error}
                        </p>
                    )}

                    <section className="w-full overflow-visible rounded-xl border border-emerald-200 bg-white shadow-sm">

                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">

                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                                Información clínica
                            </p>

                            <h2 className="mt-1 text-xl font-semibold text-white">
                                Estudios médicos disponibles
                            </h2>

                            <p className="mt-1 text-sm text-emerald-100">
                                Consulte los estudios médicos disponibles y sus resultados.
                            </p>

                        </div>

                        <div className="overflow-visible p-6">
                            <ImageResult
                                images={items}
                                loading={loading}
                                variant="default"
                                imageViewMode="estudio"
                            />
                        </div>

                    </section>

                </div>

            </div>
        </main>
    )
}