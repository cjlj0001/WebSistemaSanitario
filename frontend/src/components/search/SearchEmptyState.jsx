import React from "react"
import { SearchX } from "lucide-react"

export default function SearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-slate-200 p-3 text-slate-600">
        <SearchX className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="font-semibold text-slate-800">No se encontraron resultados</p>
      <p className="mt-1 text-sm text-slate-500">Prueba con otro nombre o ajusta los criterios de búsqueda.</p>
    </div>
  )
}
