import React from "react"

export default function UserDeletePanel({ deleteBy, deleteValue, onDeleteByChange, onDeleteValueChange, onDelete }) {
  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold text-gray-900">
        Borrar usuario
      </summary>
      <section className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <select
            value={deleteBy}
            onChange={(event) => onDeleteByChange(event.target.value)}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="id">ID</option>
            <option value="dni">DNI</option>
            <option value="email">Email</option>
          </select>
          <input
            type="text"
            value={deleteValue}
            onChange={(event) => onDeleteValueChange(event.target.value)}
            placeholder={`Valor para borrar por ${deleteBy}`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Borrar
        </button>
      </section>
    </details>
  )
}
