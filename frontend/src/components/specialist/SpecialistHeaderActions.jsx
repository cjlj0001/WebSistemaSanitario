import React from "react"

export default function SpecialistHeaderActions({ className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Área clínica</p>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Panel de análisis</h2>
      <p className="max-w-2xl text-sm text-slate-600">
        Revisa estudios, resultados IA y anotaciones manuales desde una vista unificada.
      </p>
    </div>
  )
}
