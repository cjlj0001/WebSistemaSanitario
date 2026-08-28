import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, CalendarDays, IdCard, Mail, UserRound } from "lucide-react"
import api from "../servicio/api"

function formatDate(value) {
  if (!value) return "No disponible"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-ES")
}

const fields = [
  { key: "name", label: "Nombre", Icon: UserRound },
  { key: "dni", label: "DNI", Icon: IdCard },
  { key: "email", label: "Correo electrónico", Icon: Mail, wide: true },
  { key: "fechaNacimiento", label: "Fecha de nacimiento", Icon: CalendarDays, format: formatDate },
]

export default function DataUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      try {
        const response = await api.get("/auth/me")
        if (isMounted) setUser(response.data)
      } catch (fetchError) {
        if (isMounted) setError(fetchError?.response?.data?.detail || "No se pudieron cargar tus datos")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadProfile()
    return () => { isMounted = false }
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-6">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <header className="flex items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
          <div className="rounded-xl bg-white/15 p-3"><UserRound className="h-7 w-7 text-white" /></div>
          <div><h1 className="text-xl font-bold text-white">Mis datos</h1><p className="text-sm text-emerald-100">Información de tu perfil</p></div>
        </header>

        <div className="p-6">
          {loading && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">Cargando perfil...</div>}
          {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{error}</div>}

          {!loading && !error && user && (
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ key, label, Icon, wide, format }) => (
                <article key={key} className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 ${wide ? "sm:col-span-2" : ""}`}>
                  <div className="rounded-lg bg-emerald-100 p-2">{React.createElement(Icon, { className: "h-5 w-5 text-emerald-700" })}</div>
                  <div className="min-w-0"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="truncate font-medium text-slate-800">{format ? format(user[key]) : user[key] || "-"}</p></div>
                </article>
              ))}
            </div>
          )}

          <Link to="/upload" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-base font-medium text-white transition hover:bg-emerald-700">
            <ArrowLeft className="h-5 w-5" />Volver a subida de imágenes
          </Link>
        </div>
      </section>
    </main>
  )
}
