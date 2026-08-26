import React from "react"

export default function ResultEditPanel({
  editResultId,
  editResultForm,
  onEditResultIdChange,
  onEditResultFieldChange,
  onLoadResult,
  onSave,
  observacionesOnly = false,
}) {
  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold text-gray-900">
        {observacionesOnly ? "Editar observaciones" : "Editar resultado"}
      </summary>
      <section className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            value={editResultId}
            onChange={(event) => onEditResultIdChange(event.target.value)}
            placeholder="ID de resultado"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onLoadResult}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Cargar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {!observacionesOnly && (
            <>
              <input
                type="text"
                value={editResultForm.dniUsuario}
                onChange={(event) => onEditResultFieldChange("dniUsuario", event.target.value)}
                placeholder="DNI usuario"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={editResultForm.anomalia}
                onChange={(event) => onEditResultFieldChange("anomalia", event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecciona anomalia</option>
                <option value="Atelectasis">Atelectasis</option>
                <option value="Effusion">Effusion</option>
                <option value="Emphysema">Emphysema</option>
                <option value="No finding">No finding</option>
                <option value="Nodule">Nodule</option>
                <option value="Pneumonia">Pneumonia</option>
                <option value="Pneumothorax">Pneumothorax</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editResultForm.porcentajeAcierto}
                onChange={(event) => onEditResultFieldChange("porcentajeAcierto", event.target.value)}
                placeholder="Porcentaje acierto"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </>
          )}
          <textarea
            value={editResultForm.observaciones}
            onChange={(event) => onEditResultFieldChange("observaciones", event.target.value)}
            placeholder="Observaciones"
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-3 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {observacionesOnly ? "Guardar observaciones" : "Guardar resultado"}
        </button>
      </section>
    </details>
  )
}
