import React from "react"

const DATE_MIN = "1900-01-01"
const DATE_MAX = "2100-12-31"

export default function UserEditPanel({
  editUserId,
  editForm,
  onEditUserIdChange,
  onEditFieldChange,
  onLoadUser,
  onSave
}) {
  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold text-gray-900">
        Editar usuario
      </summary>
      <section className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            value={editUserId}
            onChange={(event) => onEditUserIdChange(event.target.value)}
            placeholder="ID para editar"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onLoadUser}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Cargar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <input
            type="text"
            value={editForm.name}
            onChange={(event) => onEditFieldChange("name", event.target.value)}
            placeholder="Nombre"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={editForm.dni}
            onChange={(event) => onEditFieldChange("dni", event.target.value)}
            placeholder="DNI"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={editForm.email}
            onChange={(event) => onEditFieldChange("email", event.target.value)}
            placeholder="Email"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {/* Password is not editable by admins from this panel */}
          <input
            type="date"
            value={editForm.fechaNacimiento}
            min={DATE_MIN}
            max={DATE_MAX}
            onChange={(event) => onEditFieldChange("fechaNacimiento", event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={editForm.role}
            onChange={(event) => onEditFieldChange("role", event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="usuarioBase">usuarioBase</option>
            <option value="especialista">especialista</option>
            <option value="admin">admin</option>
          </select>
        </div>
        {/* Admins are not allowed to change user passwords here */}

        <button
          type="button"
          onClick={onSave}
          className="mt-3 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Guardar cambios
        </button>
      </section>
    </details>
  )
}

