import React, { useState } from "react"

const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeDateValue(value) {
  const trimmed = String(value ?? "").trim()
  return DATE_FORMAT_PATTERN.test(trimmed) ? trimmed : ""
}

function isValidDateInput(value) {
  if (!DATE_FORMAT_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

export default function UserBox({ user, onSave, onDelete, isAlternate, showActions = true, showRole = true }) {
  const userRole = user?.role || "usuarioBase"
  const roleLabel = {
    admin: "Admin",
    especialista: "Especialista",
    usuarioBase: "Usuario base"
  }[userRole] || userRole
  const roleColor = {
    admin: "bg-red-100 text-red-700",
    especialista: "bg-indigo-100 text-indigo-700",
    usuarioBase: "bg-slate-100 text-slate-700"
  }[userRole] || "bg-slate-100 text-slate-700"

  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: user.name || "",
    dni: user.dni || "",
    email: user.email || "",
    password: "",
    fechaNacimiento: normalizeDateValue(user.fechaNacimiento),
    role: user.role || "usuarioBase"
  })

  const startEdit = () => {
    setForm({
      name: user.name || "",
      dni: user.dni || "",
      email: user.email || "",
      password: "",
      fechaNacimiento: normalizeDateValue(user.fechaNacimiento),
      role: user.role || "usuarioBase"
    })
    setEditing(true)
  }

  return (
    <div className={`border-b-2 border-slate-300 px-5 py-4 relative transition-colors shadow-lg rounded-lg mb-3 ${isAlternate ? "bg-slate-100 hover:bg-slate-200" : "bg-white hover:bg-gray-50"}`}>
      <div className="absolute right-3 top-3 flex gap-2">
        {!editing && showActions ? (
          <>
            <button
              title="Editar usuario"
              onClick={startEdit}
              className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
            >
              ✎
            </button>

            <button
              title="Borrar usuario"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              🗑️
            </button>
          </>
        ) : editing && showActions ? (
          <button
            title="Cancelar edición"
            onClick={() => setEditing(false)}
            className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          >
            ✕
          </button>
        ) : null}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-3 pr-20">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm border-t border-gray-100 pt-3">
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium">ID</span>
              <span className="text-gray-900 font-medium">{user.id}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium">DNI</span>
              <span className="text-gray-900 font-medium">{user.dni}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs font-medium">NACIMIENTO</span>
              <span className="text-gray-900 font-medium">{user.fechaNacimiento || "No disponible"}</span>
            </div>
          </div>

          {showRole && (
            <div className="absolute bottom-3 right-3">
              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-sm text-slate-700">Nombre</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-slate-700">DNI</label>
            <input value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Email</label>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Nacimiento</label>
            <input
              type="date"
              value={form.fechaNacimiento}
              min="1900-01-01"
              max="2100-12-31"
              onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          {showRole && (
            <div>
            <label className="block text-sm text-slate-700">Rol</label>
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="w-full rounded border px-2 py-1">
              <option value="admin">Admin</option>
              <option value="especialista">Especialista</option>
              <option value="usuarioBase">Usuario base</option>
            </select>
          </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (onSave) {
                  setLoading(true)
                  try {
                    if (!isValidDateInput(form.fechaNacimiento)) {
                      throw new Error("La fecha debe tener formato YYYY-MM-DD y ser valida")
                    }
                    await onSave(user.id, form)
                    setEditing(false)
                  } catch (error) {
                    // Error was already displayed by the parent component
                    console.error("Save error:", error)
                  } finally {
                    setLoading(false)
                  }
                } else {
                  setEditing(false)
                }
              }}
              disabled={loading}
              className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-400"
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="absolute inset-0 bg-black/10 rounded-b-lg flex items-center justify-center z-50">
          <div className="bg-white rounded-md border-2 border-red-200 shadow-lg p-4 max-w-xs">
            <p className="text-sm font-semibold text-gray-900 mb-4">¿Seguro que quiere borrar a {user.name}?</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (onDelete) {
                    setLoading(true)
                    try {
                      await onDelete()
                    } finally {
                      setLoading(false)
                      setConfirming(false)
                    }
                  } else {
                    setConfirming(false)
                  }
                }}
                disabled={loading}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-400"
              >
                {loading ? "Borrando..." : "Sí, borrar"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
