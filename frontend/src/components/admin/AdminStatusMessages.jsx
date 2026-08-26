import React from "react"

export default function AdminStatusMessages({ loading, error, notice }) {
  return (
    <div className="mt-5 space-y-2">
      {loading && <p className="text-sm text-gray-600">Procesando petición al backend...</p>}
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && notice && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    </div>
  )
}
