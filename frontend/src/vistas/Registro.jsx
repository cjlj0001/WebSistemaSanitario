import React, { useState } from "react"
import { CircleAlert } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import api from "../servicio/api"

const getRegistrationErrorMessage = (error) => {
  const detail = error?.response?.data?.detail

  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail)) {
    return "Revise los datos introducidos. Algunos campos no tienen un formato válido."
  }

  return "No se pudo completar el registro. Revise sus datos e inténtelo de nuevo."
}

export default function Registro() {
  const navigate = useNavigate()
  const location = useLocation()
  const registrationDraft = location.state?.registrationDraft || {}

  const [nombre, setNombre] = useState(() => registrationDraft.nombre || "")
  const [dni, setDni] = useState(() => registrationDraft.dni || "")
  const [email, setEmail] = useState(() => registrationDraft.email || "")
  const [password, setPassword] = useState(() => registrationDraft.password || "")
  const [fechaNacimiento, setFechaNacimiento] = useState(() => registrationDraft.fechaNacimiento || "")
  const [acceptedTerms, setAcceptedTerms] = useState(() => Boolean(registrationDraft.acceptedTerms))
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const currentDraft = { nombre, dni, email, password, fechaNacimiento, acceptedTerms }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    const validationErrors = {}
    if (!nombre.trim()) validationErrors.nombre = "Indique su nombre completo."
    if (!dni.trim()) {
      validationErrors.dni = "Indique su DNI."
    } else if (!/^\d{8}[a-zA-Z]$/.test(dni.trim())) {
      validationErrors.dni = "El DNI debe contener 8 números y una letra."
    }
    if (!email.trim()) {
      validationErrors.email = "Indique su correo electrónico."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      validationErrors.email = "Introduzca un correo electrónico válido."
    }
    if (!fechaNacimiento) {
      validationErrors.fechaNacimiento = "Indique su fecha de nacimiento."
    } else if (fechaNacimiento < "1900-01-01" || fechaNacimiento > "2050-12-31") {
      validationErrors.fechaNacimiento = "La fecha debe estar entre 1900 y 2050."
    }
    if (!password) {
      validationErrors.password = "Indique una contraseña."
    } else if (password.length < 8 || password.length > 32) {
      validationErrors.password = "La contraseña debe tener entre 8 y 32 caracteres."
    }
    if (!acceptedTerms) validationErrors.acceptedTerms = "Debe aceptar los términos y condiciones de uso."

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError("Revise los campos marcados para completar el registro.")
      return
    }

    setFieldErrors({})
    setLoading(true)
    try {
      await api.post("/api/users", {
        name: nombre.trim(),
        dni: dni.trim(),
        email: email.trim(),
        password,
        fechaNacimiento,
        termsAccepted: true,
      })
      navigate("/login", {
        state: { registrationCompleted: true, registeredEmail: email.trim() },
      })
    } catch (requestError) {
      const message = getRegistrationErrorMessage(requestError)
      const normalizedMessage = message.toLocaleLowerCase()
      const requestFieldErrors = {}
      if (normalizedMessage.includes("dni")) requestFieldErrors.dni = message
      if (normalizedMessage.includes("email") || normalizedMessage.includes("correo")) requestFieldErrors.email = message
      if (normalizedMessage.includes("contraseña") || normalizedMessage.includes("contrasena")) requestFieldErrors.password = message
      setFieldErrors(requestFieldErrors)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const inputClassName = (fieldName) => `mt-0.5 w-full rounded-lg border px-3 py-1.5 text-slate-900 shadow-sm outline-none transition focus:ring-2 ${
    fieldErrors[fieldName]
      ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-100"
      : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
  }`

  const updateField = (fieldName, setValue) => (event) => {
    setValue(event.target.value)
    setFieldErrors((previous) => {
      if (!previous[fieldName]) return previous
      const next = { ...previous }
      delete next[fieldName]
      return next
    })
  }

  return (
    <div className="flex h-[100dvh] items-center justify-center overflow-hidden bg-slate-100 p-3 sm:p-4">
      <div className="max-h-full w-full max-w-lg rounded-2xl bg-white px-6 py-5 shadow-lg sm:px-8 sm:py-6">
        <h2 className="mb-1 text-center text-2xl font-bold text-slate-900 sm:text-3xl">Registro de usuario</h2>
        <p className="mb-4 text-center text-sm text-slate-500">Complete sus datos para crear una cuenta.</p>

        {error && (
          <div role="alert" className="mb-3 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-red-800 shadow-sm">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">No se pudo completar el registro</p>
              <p className="mt-0.5 text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-2">
          <div>
            <label htmlFor="register-name" className={`block text-sm font-medium ${fieldErrors.nombre ? "text-red-700" : "text-slate-700"}`}>Nombre completo</label>
            <input id="register-name" type="text" value={nombre} onChange={updateField("nombre", setNombre)} className={inputClassName("nombre")} aria-invalid={Boolean(fieldErrors.nombre)} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="register-dni" className={`block text-sm font-medium ${fieldErrors.dni ? "text-red-700" : "text-slate-700"}`}>DNI</label>
            <input id="register-dni" type="text" value={dni} onChange={updateField("dni", setDni)} className={inputClassName("dni")} aria-invalid={Boolean(fieldErrors.dni)} autoComplete="off" placeholder="12345678A" />
          </div>
          <div>
            <label htmlFor="register-email" className={`block text-sm font-medium ${fieldErrors.email ? "text-red-700" : "text-slate-700"}`}>Correo electrónico</label>
            <input id="register-email" type="email" value={email} onChange={updateField("email", setEmail)} className={inputClassName("email")} aria-invalid={Boolean(fieldErrors.email)} autoComplete="email" />
          </div>
          <div>
            <label htmlFor="register-birth-date" className={`block text-sm font-medium ${fieldErrors.fechaNacimiento ? "text-red-700" : "text-slate-700"}`}>Fecha de nacimiento</label>
            <input id="register-birth-date" type="date" min="1900-01-01" max="2050-12-31" value={fechaNacimiento} onChange={updateField("fechaNacimiento", setFechaNacimiento)} className={inputClassName("fechaNacimiento")} aria-invalid={Boolean(fieldErrors.fechaNacimiento)} />
          </div>
          <div>
            <label htmlFor="register-password" className={`block text-sm font-medium ${fieldErrors.password ? "text-red-700" : "text-slate-700"}`}>Contraseña</label>
            <input id="register-password" type="password" value={password} onChange={updateField("password", setPassword)} className={inputClassName("password")} aria-invalid={Boolean(fieldErrors.password)} autoComplete="new-password" />
            <p className="mt-0.5 text-xs text-slate-500">Entre 8 y 32 caracteres.</p>
          </div>

          <label className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${fieldErrors.acceptedTerms ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.target.checked); setFieldErrors((previous) => { const next = { ...previous }; delete next.acceptedTerms; return next }) }} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600" />
            <span>
              He leído y acepto los {" "}
              <Link to="/terminos-y-condiciones" state={{ origin: "register", registrationDraft: currentDraft }} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                términos y condiciones de uso
              </Link>.
            </span>
          </label>

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>

          <p className="pt-1 text-center text-sm text-slate-600">
            ¿Ya tiene cuenta? <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">Inicie sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
