import React, { useCallback, useEffect, useState } from "react"
import { Brain, CheckCircle2, RefreshCw } from "lucide-react"
import UnifiedSearchBar from "../components/SearchBar"
import UserDeletePanel from "../components/user/UserDeletePanel"
import UserEditPanel from "../components/user/UserEditPanel"
import ImageResult from "../components/image/ImageResult"
import UserResultsList from "../components/user/UserResultsList"
import api from "../servicio/api"
import { sharedUserFilters, sharedImageFilters, sharedImageTertiaryOptionsByFilter } from "../components/search/searchPresets"
import Logout from "../components/Logout"

export default function Admin() {
    const [users, setUsers] = useState([])
    const [images, setImages] = useState([])
    const [aiModels, setAiModels] = useState([])
    const [activeAiModel, setActiveAiModel] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [aiTransitioning, setAiTransitioning] = useState(false)
    const [pendingAiModel, setPendingAiModel] = useState(null)
    const [aiMessage, setAiMessage] = useState("")
    const [aiError, setAiError] = useState("")
    const [resultMode, setResultMode] = useState("users")
    const [imageViewMode, setImageViewMode] = useState("imagen")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")


    const [deleteBy, setDeleteBy] = useState("id")
    const [deleteValue, setDeleteValue] = useState("")

    const [editUserId, setEditUserId] = useState("")
    const [editForm, setEditForm] = useState({
        name: "",
        dni: "",
        email: "",
        password: "",
        fechaNacimiento: "",
        role: "usuarioBase"
    })

    const [showDeletePanel, setShowDeletePanel] = useState(false)
    const [showEditUserPanel, setShowEditUserPanel] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState(null)

    const clearMessages = useCallback(() => {
        setError("")
        setNotice("")
    }, [])

    const refreshAiModels = useCallback(async () => {
        setAiLoading(true)
        setAiError("")
        try {
            const response = await api.get("/api/ai/models")
            const models = Array.isArray(response.data?.models) ? response.data.models : []
            setAiModels(models)
            setActiveAiModel(response.data?.activeModelKey ?? "")
            const transitioning = Boolean(response.data?.isTransitioning)
            setAiTransitioning(transitioning)
            if (transitioning) {
                setAiMessage("Se está completando un cambio de modelo. Las nuevas predicciones se reanudarán automáticamente al finalizar.")
            } else {
                setAiMessage("")
            }
        } catch (err) {
            const detail = err?.response?.data?.detail
            setAiError(detail || "No se pudo obtener la lista de IA disponibles")
            setAiModels([])
            setActiveAiModel("")
            setAiTransitioning(false)
        } finally {
            setAiLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshAiModels()
    }, [refreshAiModels])

    const refreshUsers = useCallback(async () => {
        clearMessages()
        setLoading(true)
        try {
            const response = await api.get("/api/users")
            const safeUsers = Array.isArray(response.data) ? response.data : []
            setUsers(safeUsers)
            setResultMode("users")
        } catch (err) {
            const detail = err?.response?.data?.detail
            setError(detail || "No se pudo obtener la lista de usuarios")
            setUsers([])
        } finally {
            setLoading(false)
        }
    }, [clearMessages])


    const handleSearchModeChange = useCallback((mode) => {
        clearMessages()
        if (mode === "usuario") {
            setResultMode("users")
            setImages([])
        } else {
            setResultMode("images")
            setUsers([])
            setImageViewMode(mode === "estudio" ? "estudio" : "imagen")
        }
    }, [clearMessages])

    // Search behaviour is handled inside UnifiedSearchBar; parent receives lists via callbacks below

    const loadUserToEdit = async () => {
        clearMessages()
        if (!editUserId.trim()) {
            setError("Indica el id del usuario a editar")
            return
        }

        setLoading(true)
        try {
            const response = await api.get(`/api/users/${encodeURIComponent(editUserId.trim())}`)
            const user = response.data
            setEditForm({
                name: user.name ?? "",
                dni: user.dni ?? "",
                email: user.email ?? "",
                password: "",
                fechaNacimiento: user.fechaNacimiento ?? "",
                role: user.role ?? "usuarioBase"
            })
            setNotice("Usuario cargado en el formulario de edición")
        } catch (fetchError) {
            const detail = fetchError?.response?.data?.detail
            setError(detail || "No se pudo cargar el usuario para editar")
        } finally {
            setLoading(false)
        }
    }

    const updateUser = async () => {
        clearMessages()
        if (!editUserId.trim()) {
            setError("Indica el id del usuario a editar")
            return
        }

        const requiredFields = [editForm.name, editForm.dni, editForm.email, editForm.fechaNacimiento, editForm.role]
        if (requiredFields.some((field) => !String(field).trim())) {
            setError("Completa todos los campos de edición")
            return
        }

        setLoading(true)
        try {
            const payload = {
                name: editForm.name.trim(),
                dni: editForm.dni.trim(),
                email: editForm.email.trim(),
                fechaNacimiento: editForm.fechaNacimiento,
                role: editForm.role
            }
            if (editForm.password && String(editForm.password).trim()) {
                payload.password = editForm.password
            }

            await api.put(`/api/users/${encodeURIComponent(editUserId.trim())}`, payload)
            setNotice("Usuario actualizado correctamente")
            await refreshUsers()
        } catch (fetchError) {
            const detail = fetchError?.response?.data?.detail
            setError(detail || "No se pudo actualizar el usuario")
        } finally {
            setLoading(false)
        }
    }

    const deleteUser = async () => {
        clearMessages()
        if (!deleteValue.trim()) {
            setError("Introduce un valor para borrar")
            return
        }

        setLoading(true)
        try {
            const encoded = encodeURIComponent(deleteValue.trim())
            const path = deleteBy === "id" ? `/api/users/${encoded}` : `/api/users/${deleteBy}/${encoded}`
            await api.delete(path)
            setNotice("Usuario borrado correctamente")
            setDeleteValue("")
            await refreshUsers()
        } catch (fetchError) {
            const detail = fetchError?.response?.data?.detail
            setError(detail || "No se pudo borrar el usuario")
        } finally {
            setLoading(false)
        }
    }

    const deleteImage = async (imageId, confirmed = false) => {
        clearMessages()
        const normalizedImageId = String(imageId || "").trim()
        if (!normalizedImageId) {
            setError("No se ha encontrado el identificador de la imagen")
            return false
        }
        if (!confirmed) {
            setDeleteConfirmation({ type: "image", id: normalizedImageId })
            return false
        }

        setLoading(true)
        try {
            const response = await api.delete(`/medicalImages/${encodeURIComponent(normalizedImageId)}`)
            const refreshedImages = await api.get("/medicalImages")
            setImages(Array.isArray(refreshedImages.data) ? refreshedImages.data : [])
            setNotice(
                response.data?.studyDissolved
                    ? "Imagen borrada; el estudio se ha eliminado y las imágenes restantes quedan sueltas."
                    : "Imagen borrada correctamente"
            )
            return true
        } catch (fetchError) {
            const detail = fetchError?.response?.data?.detail
            setError(detail || "No se pudo borrar la imagen")
            return false
        } finally {
            setLoading(false)
        }
    }

    const deleteStudy = async (orthancStudyUid, confirmed = false) => {
        clearMessages()
        const normalizedOrthancStudyUid = String(orthancStudyUid || "").trim()
        if (!normalizedOrthancStudyUid) {
            setError("No se ha encontrado el orthancStudyUid del estudio")
            return
        }
        if (!confirmed) {
            setDeleteConfirmation({ type: "study", id: normalizedOrthancStudyUid })
            return false
        }

        setLoading(true)
        try {
            await api.delete(`/medicalImages/study/${encodeURIComponent(normalizedOrthancStudyUid)}`)
            setNotice("Estudio borrado correctamente")
            setImages((prev) => (
                Array.isArray(prev)
                    ? prev.filter((item) => String(item?.medicalImage?.orthancStudyUid || item?._orthancStudyUid || "") !== normalizedOrthancStudyUid)
                    : prev
            ))
        } catch (fetchError) {
            const detail = fetchError?.response?.data?.detail
            setError(detail || "No se pudo borrar el estudio")
        } finally {
            setLoading(false)
        }
    }

    const confirmDeletion = async () => {
        const pendingDeletion = deleteConfirmation
        if (!pendingDeletion || loading) return

        setDeleteConfirmation(null)
        if (pendingDeletion.type === "image") {
            await deleteImage(pendingDeletion.id, true)
            return
        }
        await deleteStudy(pendingDeletion.id, true)
    }

    const activateAiModel = async (nextModelKey) => {
        if (!nextModelKey || nextModelKey === activeAiModel) {
            return
        }

        setAiLoading(true)
        setAiError("")
        setAiTransitioning(true)
        setAiMessage("El cambio está en curso. Se completarán las predicciones ya iniciadas antes de activar el nuevo modelo.")
        try {
            const response = await api.put("/api/ai/models/active", { modelKey: nextModelKey })
            const models = Array.isArray(response.data?.models) ? response.data.models : []
            setAiModels(models)
            setActiveAiModel(response.data?.activeModelKey ?? nextModelKey)
            setAiTransitioning(Boolean(response.data?.isTransitioning))
            const selectedModel = models.find((model) => model.modelKey === (response.data?.activeModelKey ?? nextModelKey))
            setPendingAiModel(null)
            setAiMessage(`${selectedModel?.label ?? "La IA seleccionada"} se ha activado correctamente y ya se utilizará en las nuevas predicciones.`)
        } catch (err) {
            const detail = err?.response?.data?.detail
            setAiError(detail || "No se pudo cambiar la IA activa")
        } finally {
            setAiLoading(false)
            setAiTransitioning(false)
        }
    }

    const requestAiModelChange = (model) => {
        if (aiLoading || aiTransitioning || model.modelKey === activeAiModel) return
        setAiError("")
        setAiMessage("")
        setPendingAiModel(model)
    }

    return (
    <div className="min-h-screen bg-gray-100 px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full rounded-xl bg-white p-5 shadow-lg sm:p-6">
            <header className="mb-6 flex items-start justify-between gap-4">

                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        PANEL DE ADMINISTRACIÓN
                    </h1>
                </div>

                <Logout className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100" />

            </header>

                <div className="space-y-6">

                <section className="rounded-none border border-sky-200 bg-white">

                    <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-5">

                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                            <div className="flex items-start gap-4">

                                <div className="rounded-xl bg-white/15 p-3">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>

                                <div>

                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                                        Inteligencia artificial
                                    </p>

                                    <h3 className="text-xl font-semibold text-white">
                                        Motor de inteligencia artificial
                                    </h3>

                                    <p className="mt-1 text-sm text-sky-100">
                                        Seleccione el modelo que se utilizará para generar las nuevas predicciones. Los estudios existentes no se modificarán.
                                    </p>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={refreshAiModels}
                                disabled={aiLoading}
                                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/25 disabled:opacity-60"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${
                                        aiLoading ? "animate-spin" : ""
                                    }`}
                                />

                                Actualizar modelos

                            </button>

                        </div>

                    </div>

                    <div className="p-6">
                        {aiError && (
                            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{aiError}</p>
                        )}

                        {pendingAiModel && (
                            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                                <p>¿Seguro que quieres cambiar el modelo a <span className="font-semibold">{pendingAiModel.label}</span>? Se usará solo en las nuevas predicciones.</p>
                                <div className="flex shrink-0 gap-2">
                                    <button type="button" onClick={() => setPendingAiModel(null)} disabled={aiLoading || aiTransitioning} className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60">Cancelar</button>
                                    <button type="button" onClick={() => activateAiModel(pendingAiModel.modelKey)} disabled={aiLoading || aiTransitioning} className="rounded-lg bg-sky-600 px-3 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-60">Sí, cambiar</button>
                                </div>
                            </div>
                        )}

                        {aiModels.length === 0 ? (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No hay modelos de IA disponibles.</p>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {aiModels.map((model) => {
                                    const isActive = model.modelKey === activeAiModel
                                    return (
                                        <button
                                            key={model.modelKey}
                                            type="button"
                                            onClick={() => requestAiModelChange(model)}
                                            disabled={aiLoading || aiTransitioning || isActive}
                                            className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-default ${
                                                isActive
                                                    ? "border-sky-300 bg-sky-50 shadow-sm"
                                                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50"
                                            }`}
                                        >
                                            <span className={`rounded-lg p-2 ${isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700"}`}>
                                                <Brain className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-slate-900">{model.label}</span>
                                                <span className="mt-0.5 block text-xs text-slate-500">{isActive ? "Modelo activo para nuevas predicciones" : "Seleccionar este modelo"}</span>
                                            </span>
                                            {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" aria-label="Modelo activo" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {aiTransitioning && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <RefreshCw className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                                <p>Actualizando el motor de IA. Las predicciones en curso se completarán antes de reanudar las nuevas solicitudes.</p>
                            </div>
                        )}

                        {activeAiModel && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                                <p>{aiMessage || `${aiModels.find((model) => model.modelKey === activeAiModel)?.label ?? "La IA seleccionada"} está en funcionamiento para las nuevas predicciones.`}</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-emerald-200 bg-white">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Administración del sistema</p>
                        <h3 className="mt-1 text-xl font-semibold text-white">Gestión del sistema</h3>
                        <p className="mt-1 text-sm text-emerald-100">Consulta y administra usuarios, imágenes y estudios médicos.</p>
                    </div>

                    <div className="p-6">
                    <UnifiedSearchBar
                        onSearchModeChange={handleSearchModeChange}
                        onUsersListed={(list) => {
                            setUsers(Array.isArray(list) ? list : [])
                            setImages([])
                            setResultMode("users")
                        }}
                        onImagesListed={(list) => {
                            setImages(Array.isArray(list) ? list : [])
                            setUsers([])
                            setResultMode("images")
                        }}
                        onSetNotice={setNotice}
                        onSetError={setError}
                        onSetLoading={setLoading}
                        userFilters={sharedUserFilters}
                        imageFilters={sharedImageFilters}
                        imageTertiaryOptionsByFilter={sharedImageTertiaryOptionsByFilter}
                        onListUsers={undefined}
                        onListAllImages={undefined}
                        onReset={() => {
                            setUsers([])
                            setImages([])
                            setResultMode("users")
                        }}
                        onOpenDeletePanel={() => {
                            setDeleteValue("")
                            setDeleteBy("id")
                            setShowDeletePanel(true)
                        }}
                        onOpenEditUserPanel={() => {
                            setEditUserId("")
                            setEditForm({ name: "", dni: "", email: "", password: "", fechaNacimiento: "", role: "usuarioBase" })
                            setShowEditUserPanel(true)
                        }}
                    />
                    </div>
                </section>

                {(error || notice) && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            error
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {error || notice}
                    </div>
                )}

                {showDeletePanel ? (
                        <section className="border-b border-slate-200 pb-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Borrar usuario</h3>
                                <button
                                    onClick={() => setShowDeletePanel(false)}
                                    className="text-2xl font-light text-slate-500 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <UserDeletePanel
                                deleteBy={deleteBy}
                                deleteValue={deleteValue}
                                onDeleteByChange={setDeleteBy}
                                onDeleteValueChange={setDeleteValue}
                                onDelete={deleteUser}
                            />
                        </section>
                    ) : showEditUserPanel ? (
                        <section className="border-b border-slate-200 pb-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Editar usuario</h3>
                                <button
                                    onClick={() => setShowEditUserPanel(false)}
                                    className="text-2xl font-light text-slate-500 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <UserEditPanel
                                editUserId={editUserId}
                                editForm={editForm}
                                onEditUserIdChange={setEditUserId}
                                onEditFieldChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
                                onLoadUser={loadUserToEdit}
                                onSave={updateUser}
                            />
                        </section>
                    ) : (
                        <section>
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Información del sistema</p>
                                <h3 className="mt-1 text-xl font-semibold text-slate-900">Resultados</h3>
                            </div>
                            {resultMode === "images" ? (
                                <ImageResult
                                    images={images}
                                    loading={loading}
                                    imageViewMode={imageViewMode}
                                    onDeleteImage={deleteImage}
                                    onDeleteStudy={deleteStudy}
                                />
                            ) : (
                                <UserResultsList
                                    users={users}
                                    loading={loading}
                                    onSaveUser={async (id, formData) => {
                                        clearMessages()
                                        if (!id) {
                                            setError("Id de usuario inválido")
                                            return
                                        }

                                        const requiredFields = [formData.name, formData.dni, formData.email, formData.fechaNacimiento, formData.role]
                                        if (requiredFields.some((f) => !String(f || "").trim())) {
                                            setError("Completa todos los campos de edición")
                                            return
                                        }

                                        setLoading(true)
                                        try {
                                            const payload = {
                                                name: String(formData.name).trim(),
                                                dni: String(formData.dni).trim(),
                                                email: String(formData.email).trim(),
                                                fechaNacimiento: formData.fechaNacimiento,
                                                role: formData.role
                                            }
                                            if (formData.password && String(formData.password).trim()) payload.password = formData.password

                                            await api.put(`/api/users/${encodeURIComponent(String(id))}`, payload)
                                            setNotice("Usuario actualizado correctamente")
                                            await refreshUsers()
                                        } catch (fetchError) {
                                            const detail = fetchError?.response?.data?.detail
                                            setError(detail || "No se pudo actualizar el usuario")
                                            throw fetchError
                                        } finally {
                                            setLoading(false)
                                        }
                                    }}
                                    onDeleteUser={async (id) => {
                                        clearMessages()
                                        setLoading(true)
                                        try {
                                            await api.delete(`/api/users/${encodeURIComponent(String(id))}`)
                                            setNotice("Usuario borrado correctamente")
                                            await refreshUsers()
                                        } catch (fetchError) {
                                            const detail = fetchError?.response?.data?.detail
                                            setError(detail || "No se pudo borrar el usuario")
                                            throw fetchError
                                        } finally {
                                            setLoading(false)
                                        }
                                    }}
                                />
                            )}
                        </section>
                    )}
                </div>
                {deleteConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
                        <div role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Acción irreversible</p>
                            <h2 id="delete-confirmation-title" className="mt-2 text-xl font-bold text-slate-900">
                                {deleteConfirmation.type === "study" ? "¿Borrar este estudio?" : "¿Borrar esta imagen?"}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {deleteConfirmation.type === "study"
                                    ? "Se eliminarán definitivamente el estudio y todas las imágenes que contiene. Esta acción no se puede deshacer."
                                    : `Se eliminará definitivamente la imagen #${deleteConfirmation.id}. Esta acción no se puede deshacer.`}
                            </p>
                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setDeleteConfirmation(null)} disabled={loading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                                    Cancelar
                                </button>
                                <button type="button" onClick={confirmDeletion} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                                    {loading ? "Borrando..." : "Sí, borrar definitivamente"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    </div>
    )
}
