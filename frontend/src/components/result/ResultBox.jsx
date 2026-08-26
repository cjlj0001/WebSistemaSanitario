import React, { useEffect, useMemo, useState } from "react"
import {
    Activity,
    CheckCircle2,
    ClipboardCheck,
    Pencil,
    Save,
    X,
} from "lucide-react"
import api from "../../servicio/api"
import { getUserRoleFromToken } from "../security/tokenRole"

const DISEASE_OPTIONS = [
    "Atelectasis",
    "Effusion",
    "Emphysema",
    "No finding",
    "Nodule",
    "Pneumonia",
    "Pneumothorax",
]

const createEmptyRankingDraft = () =>
    DISEASE_OPTIONS.map(() => ({
        enfermedad: "",
        probabilidad: "",
    }))

export default function ResultBox({
    item,
    openByDefault = false,
    professional = false,
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingRanking, setIsEditingRanking] = useState(false)
    const [rankingDraft, setRankingDraft] = useState(createEmptyRankingDraft)
    const [rankingSaving, setRankingSaving] = useState(false)
    const [rankingNotice, setRankingNotice] = useState("")
    const [rankingOverride, setRankingOverride] = useState(null)

    const [observaciones, setObservaciones] = useState("")
    const [validationStatus, setValidationStatus] = useState("NO")
    const [validationSaving, setValidationSaving] = useState(false)
    const [validationNotice, setValidationNotice] = useState("")

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [previewVisible, setPreviewVisible] = useState(true)

    const resultId = item?.result?.id
    const medicalImageId = item?.medicalImage?.id

    const specialistName =
        item?.result?.specialistName ||
        item?.medicalImage?.specialistName ||
        ""

    const previewUrl = medicalImageId
        ? `${api.defaults.baseURL}/medicalImages/${encodeURIComponent(
              medicalImageId
          )}/preview`
        : ""

    const role = useMemo(() => {
        const accessToken = localStorage.getItem("accessToken") || ""
        return getUserRoleFromToken(accessToken)
    }, [])

    const canEditObservaciones =
        role === "especialista" && Boolean(resultId)

    const canEditRanking =
        role === "especialista" && Boolean(resultId)

    const canEditValidation =
        role === "especialista" && Boolean(medicalImageId)

    const ranking = useMemo(() => {
        const rankingSource =
            rankingOverride ?? item?.result?.rankingProbabilidades

        const rawRanking = Array.isArray(rankingSource)
            ? rankingSource
            : []

        return rawRanking
            .map((entry) => {
                if (Array.isArray(entry)) {
                    return {
                        enfermedad: String(entry[0] ?? "").trim(),
                        probabilidad: Number(entry[1] ?? 0),
                    }
                }

                if (entry && typeof entry === "object") {
                    return {
                        enfermedad: String(
                            entry?.enfermedad ??
                                entry?.label ??
                                entry?.anomalia ??
                                ""
                        ).trim(),
                        probabilidad: Number(
                            entry?.probabilidad ??
                                entry?.probability ??
                                entry?.value ??
                                0
                        ),
                    }
                }

                return {
                    enfermedad: "",
                    probabilidad: 0,
                }
            })
            .filter(
                (entry) =>
                    entry.enfermedad &&
                    Number.isFinite(entry.probabilidad)
            )
            .sort((a, b) => b.probabilidad - a.probabilidad)
    }, [item?.result?.rankingProbabilidades, rankingOverride])

    useEffect(() => {
        setObservaciones(item?.result?.observaciones || "")
        setIsEditing(false)
        setIsEditingRanking(false)
        setRankingDraft(createEmptyRankingDraft())
        setRankingNotice("")
        setRankingOverride(null)
        setError("")
    }, [resultId, item?.result?.observaciones])

    useEffect(() => {
        setValidationStatus(
            String(item?.medicalImage?.validado ?? "NO")
        )
        setValidationNotice("")
    }, [medicalImageId, item?.medicalImage?.validado])

    useEffect(() => {
        setPreviewVisible(true)
    }, [medicalImageId])

    const saveObservaciones = async () => {
        if (!resultId) return

        setSaving(true)
        setError("")

        try {
            const response = await api.put(
                `/api/results/${encodeURIComponent(resultId)}`,
                {
                    observaciones: observaciones.trim() || null,
                }
            )

            setObservaciones(response.data?.observaciones || "")
            setIsEditing(false)
        } catch (updateError) {
            const detail = updateError?.response?.data?.detail
            setError(
                detail ||
                    "No se pudieron guardar las observaciones"
            )
        } finally {
            setSaving(false)
        }
    }

    const saveRanking = async () => {
        if (!resultId) return

        const completedRows = []

        for (let i = 0; i < rankingDraft.length; i += 1) {
            const disease = String(
                rankingDraft[i]?.enfermedad ?? ""
            ).trim()

            const probabilityRaw = String(
                rankingDraft[i]?.probabilidad ?? ""
            ).trim()

            if (!disease && !probabilityRaw) {
                continue
            }

            if (!disease || !probabilityRaw) {
                setError(
                    "En cada fila iniciada debes completar enfermedad y probabilidad"
                )
                return
            }

            const probability = Number(probabilityRaw)

            if (!Number.isFinite(probability)) {
                setError("La probabilidad debe ser numerica")
                return
            }

            if (probability < 0 || probability > 100) {
                setError(
                    "La probabilidad debe estar entre 0 y 100"
                )
                return
            }

            completedRows.push({
                enfermedad: disease,
                probabilidad: probability,
            })
        }

        if (completedRows.length === 0) {
            setError(
                "Debes indicar al menos una enfermedad con su probabilidad (mayor probabilidad)"
            )
            return
        }

        const sortedRows = [...completedRows].sort(
            (a, b) => b.probabilidad - a.probabilidad
        )

        setRankingSaving(true)
        setError("")
        setRankingNotice("")

        try {
            await api.put(
                `/api/results/${encodeURIComponent(resultId)}`,
                {
                    rankingProbabilidades: sortedRows.map((row) => [
                        row.enfermedad,
                        row.probabilidad,
                    ]),
                }
            )

            setRankingOverride(sortedRows)
            setRankingNotice(
                "Ranking de probabilidades actualizado correctamente"
            )
            setIsEditingRanking(false)
            setRankingDraft(createEmptyRankingDraft())
        } catch (updateError) {
            const detail = updateError?.response?.data?.detail

            setError(
                detail ||
                    "No se pudo actualizar el ranking de probabilidades"
            )
        } finally {
            setRankingSaving(false)
        }
    }

    const formatProbability = (value) => {
        const normalized = Number(value)

        if (!Number.isFinite(normalized)) {
            return "-"
        }

        const percent =
            normalized <= 1 ? normalized * 100 : normalized

        return `${percent.toFixed(2)}%`
    }

    const saveValidationStatus = async () => {
        if (!medicalImageId) return

        setValidationSaving(true)
        setError("")
        setValidationNotice("")

        try {
            const response = await api.put(
                `/medicalImages/${encodeURIComponent(
                    medicalImageId
                )}/validation`,
                {
                    validado: validationStatus,
                }
            )

            setValidationStatus(
                String(
                    response?.data?.validado ??
                        validationStatus
                )
            )

            setValidationNotice(
                "Estado de validacion actualizado correctamente"
            )
        } catch (updateError) {
            const detail = updateError?.response?.data?.detail

            setError(
                detail ||
                    "No se pudo actualizar el estado de validacion"
            )
        } finally {
            setValidationSaving(false)
        }
    }

    const renderResultContent = () => (
        <div className="w-full space-y-4">

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Validación de imagen
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                            Estado clínico:{" "}
                            <span className="font-bold text-slate-900">
                                {validationStatus}
                            </span>
                        </p>
                    </div>

                    {canEditValidation && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <select
                                value={validationStatus}
                                onChange={(event) =>
                                    setValidationStatus(
                                        event.target.value
                                    )
                                }
                                disabled={validationSaving}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:w-auto"
                            >
                                <option value="SI">
                                    Validada
                                </option>

                                <option value="NO">
                                    No validada
                                </option>

                                <option value="PARCIAL">
                                    Parcial
                                </option>
                            </select>

                            <button
                                type="button"
                                onClick={saveValidationStatus}
                                disabled={validationSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                                <Save className="h-4 w-4" />

                                {validationSaving
                                    ? "Guardando..."
                                    : "Guardar estado"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {item.result ? (
                <div className="space-y-3">

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                            <span className="font-semibold text-slate-800">
                                Resultado:
                            </span>{" "}
                            #{item.result.id}
                        </p>

                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                            <span className="font-semibold text-slate-800">
                                Paciente:
                            </span>{" "}
                            {item.result.dniUsuario || "-"}
                        </p>
                    </div>

                    {specialistName && (
                        <p className="text-sm text-gray-700">
                            <span className="font-semibold">
                                Especialista:
                            </span>{" "}
                            {specialistName}
                        </p>
                    )}

                    {ranking.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
                                <Activity className="h-4 w-4" />

                                <p className="text-sm font-semibold">
                                    Ranking de probabilidades
                                </p>
                            </div>

                            <div className="space-y-2 p-4">

                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Hallazgo principal
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-900">
                                        {ranking[0].enfermedad}
                                    </p>

                                    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-white">
                                        {formatProbability(
                                            ranking[0].probabilidad
                                        )}
                                    </span>
                                </div>

                                {ranking.length > 1 && (
                                    <div className="pt-1">

                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Resto del ranking
                                        </p>

                                        <ul className="space-y-1.5">
                                            {ranking
                                                .slice(1)
                                                .map(
                                                    (
                                                        entry,
                                                        index
                                                    ) => (
                                                        <li
                                                            key={`${entry.enfermedad}-${index}`}
                                                            className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                                                        >
                                                            <span>
                                                                {index +
                                                                    2}
                                                                .{" "}
                                                                {
                                                                    entry.enfermedad
                                                                }
                                                            </span>

                                                            <span className="font-semibold">
                                                                {formatProbability(
                                                                    entry.probabilidad
                                                                )}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700">
                            No hay ranking de probabilidades disponible.
                        </p>
                    )}

                    {canEditRanking && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                            {!isEditingRanking ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingRanking(true)
                                        setRankingDraft(
                                            createEmptyRankingDraft()
                                        )
                                        setRankingNotice("")
                                        setError("")
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Editar ranking
                                </button>
                            ) : (
                                <div className="space-y-2">

                                    <p className="text-sm text-gray-700">
                                        Completa solo las filas que
                                        quieras. Debes indicar al menos
                                        una enfermedad con su
                                        probabilidad.
                                    </p>

                                    <div className="space-y-2">
                                        {rankingDraft.map(
                                            (row, index) => (
                                                <div
                                                    key={`ranking-row-${index}`}
                                                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]"
                                                >
                                                    <select
                                                        value={
                                                            row.enfermedad
                                                        }
                                                        onChange={(
                                                            event
                                                        ) => {
                                                            const value =
                                                                event
                                                                    .target
                                                                    .value

                                                            setRankingDraft(
                                                                (
                                                                    prev
                                                                ) =>
                                                                    prev.map(
                                                                        (
                                                                            entry,
                                                                            entryIndex
                                                                        ) =>
                                                                            entryIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...entry,
                                                                                      enfermedad:
                                                                                          value,
                                                                                  }
                                                                                : entry
                                                                    )
                                                            )
                                                        }}
                                                        disabled={
                                                            rankingSaving
                                                        }
                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                                    >
                                                        <option value="">
                                                            Selecciona
                                                            enfermedad
                                                        </option>

                                                        {DISEASE_OPTIONS.map(
                                                            (
                                                                option
                                                            ) => (
                                                                <option
                                                                    key={
                                                                        option
                                                                    }
                                                                    value={
                                                                        option
                                                                    }
                                                                >
                                                                    {
                                                                        option
                                                                    }
                                                                </option>
                                                            )
                                                        )}
                                                    </select>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={
                                                            row.probabilidad
                                                        }
                                                        onChange={(
                                                            event
                                                        ) => {
                                                            const value =
                                                                event
                                                                    .target
                                                                    .value

                                                            setRankingDraft(
                                                                (
                                                                    prev
                                                                ) =>
                                                                    prev.map(
                                                                        (
                                                                            entry,
                                                                            entryIndex
                                                                        ) =>
                                                                            entryIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...entry,
                                                                                      probabilidad:
                                                                                          value,
                                                                                  }
                                                                                : entry
                                                                    )
                                                            )
                                                        }}
                                                        disabled={
                                                            rankingSaving
                                                        }
                                                        placeholder="Probabilidad %"
                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                                    />
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">

                                        <button
                                            type="button"
                                            onClick={saveRanking}
                                            disabled={rankingSaving}
                                            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:bg-slate-400"
                                        >
                                            <Save className="h-4 w-4" />

                                            {rankingSaving
                                                ? "Guardando..."
                                                : "Guardar ranking"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingRanking(false)
                                                setRankingDraft(
                                                    createEmptyRankingDraft()
                                                )
                                                setRankingNotice("")
                                                setError("")
                                            }}
                                            disabled={rankingSaving}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancelar
                                        </button>

                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!isEditing && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Observaciones clínicas
                            </p>

                            <p className="text-sm leading-6 text-slate-700">
                                {observaciones ||
                                    "Sin observaciones"}
                            </p>
                        </div>
                    )}

                    {isEditing && canEditObservaciones && (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

                            <p className="text-sm font-semibold text-slate-900">
                                Editar observaciones clínicas
                            </p>

                            <textarea
                                value={observaciones}
                                onChange={(event) =>
                                    setObservaciones(
                                        event.target.value
                                    )
                                }
                                rows={3}
                                placeholder="Escribe observaciones"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            />

                            <div className="flex gap-2">

                                <button
                                    type="button"
                                    onClick={saveObservaciones}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:bg-slate-400"
                                >
                                    <Save className="h-4 w-4" />

                                    {saving
                                        ? "Guardando..."
                                        : "Guardar"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setObservaciones(
                                            item?.result
                                                ?.observaciones || ""
                                        )
                                        setIsEditing(false)
                                        setError("")
                                    }}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
                                >
                                    <X className="h-4 w-4" />
                                    Cancelar
                                </button>

                            </div>
                        </div>
                    )}

                    {canEditObservaciones && !isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                        >
                            <Pencil className="h-4 w-4" />
                            Editar observaciones
                        </button>
                    )}

                    {error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-600">
                    Esta imagen no tiene resultado asociado.
                </p>
            )}
        </div>
    )

    if (professional) {
        return (
            <section className="w-full overflow-visible rounded-2xl border border-slate-200 bg-white shadow-md">

                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                            <ClipboardCheck className="h-5 w-5 text-emerald-700" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                Resultado asociado
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                                Análisis, validación y anotaciones clínicas
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-6 md:p-7">
                    {renderResultContent()}
                </div>
            </section>
        )
    }

    return (
        <section className="w-full overflow-visible rounded-2xl border border-slate-200 bg-white shadow-md">

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                        <ClipboardCheck className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                            Resultado asociado
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                            Análisis del estudio
                        </h3>
                    </div>

                </div>
            </div>

            <div className="p-5 sm:p-6 md:p-7">
                {renderResultContent()}
            </div>

        </section>
    )
}