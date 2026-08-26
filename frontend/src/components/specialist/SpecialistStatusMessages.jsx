import React from "react"

export default function SpecialistStatusMessages({ loading, error, notice }) {
  const hasMessage = loading || Boolean(error) || Boolean(notice)

  if (!hasMessage) {
    return null
  }

  return (
    <div className="space-y-2" aria-live="polite">
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Procesando petición al backend...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {!error && notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
    </div>
  )
}
