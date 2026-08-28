import React, { useCallback, useEffect, useRef, useState } from "react"
import { CircleAlert } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { GoogleLogin, useGoogleLogin } from "@react-oauth/google"
import api from "../servicio/api"
import { getUserRoleFromToken } from "../components/security/tokenRole"
import { useGoogleTerms } from "../useGoogleTerms"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const preservesGoogleTermsState = useRef(false)
  const passwordResetRequestRef = useRef(0)
  const [email, setEmail] = useState(() => location.state?.registeredEmail || "")
  const [password, setPassword] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [resetStep, setResetStep] = useState("login")
  const [error, setError] = useState("")
  const [resetFieldErrors, setResetFieldErrors] = useState({})
  const [info, setInfo] = useState(() => (
    location.state?.registrationCompleted
      ? "Registro completado correctamente. Ya puede iniciar sesión."
      : ""
  ))
  const [loading, setLoading] = useState(false)
  const {
    acceptedTermsGoogle,
    beginGoogleTermsAcceptance,
    clearGoogleTermsAcceptance,
    pendingGoogleToken,
    setAcceptedTermsGoogle,
  } = useGoogleTerms()
  const googleFirstAccess = Boolean(pendingGoogleToken)
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  const resetInputClassName = (fieldName) => `w-full rounded-lg border px-3 py-1.5 text-slate-900 shadow-sm outline-none transition focus:ring-2 ${
    resetFieldErrors[fieldName]
      ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-100"
      : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
  }`

  const clearResetFieldError = (fieldName) => {
    setResetFieldErrors((previous) => {
      if (!previous[fieldName]) return previous
      const next = { ...previous }
      delete next[fieldName]
      return next
    })
  }

  useEffect(() => {
    return () => {
      if (!preservesGoogleTermsState.current) {
        clearGoogleTermsAcceptance()
      }
    }
  }, [])

  const keepGoogleTermsState = () => {
    preservesGoogleTermsState.current = true
  }

  const completeLogin = useCallback((accessToken, tokenType) => {
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("tokenType", tokenType)
    api.defaults.headers.common.Authorization = `${tokenType} ${accessToken}`

    const role = getUserRoleFromToken(accessToken)
    if (role === "admin") {
      navigate("/admin")
    } else if (role === "especialista") {
      navigate("/specialist")
    } else {
      navigate("/upload")
    }
  }, [navigate])

  const completeGoogleLogin = useCallback(async (idToken, acceptTerms = false, googleAccessToken = "") => {
    if (!idToken) {
      setError("Google no devolvió un token válido")
      return
    }

    setError("")
    setLoading(true)
    try {
      const response = await api.post("/auth/google", {
        idToken,
        acceptTerms,
        ...(googleAccessToken ? { googleAccessToken } : {}),
      })
      const { access_token: accessToken, token_type: tokenType } = response.data
      clearGoogleTermsAcceptance()
      completeLogin(accessToken, tokenType)
    } catch (err) {
      if (err.response?.status === 428) {
        beginGoogleTermsAcceptance(idToken)
        setError("")
        setInfo(err.response?.data?.detail || "Complete los datos solicitados para acceder con Google.")
        return
      }
      setError(err.response?.data?.detail || "No se pudo iniciar sesión con Google")
    } finally {
      setLoading(false)
    }
  }, [beginGoogleTermsAcceptance, clearGoogleTermsAcceptance, completeLogin])

  const requestGoogleBirthDatePermission = useGoogleLogin({
    scope: "openid email https://www.googleapis.com/auth/user.birthday.read",
    onSuccess: (tokenResponse) => {
      completeGoogleLogin(pendingGoogleToken, true, tokenResponse.access_token)
    },
    onError: () => {
      completeGoogleLogin(pendingGoogleToken, true)
    },
    onNonOAuthError: () => {
      completeGoogleLogin(pendingGoogleToken, true)
    },
  })

  const handleGoogleSuccess = useCallback((credentialResponse) => {
    completeGoogleLogin(credentialResponse?.credential)
  }, [completeGoogleLogin])

  const handleGoogleError = useCallback(() => {
    setError("No se pudo completar la autenticación de Google")
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Escriba un correo electrónico válido con @ y dominio, por ejemplo nombre@dominio.com.")
      return
    }
    if (!password) {
      setError("Escriba la contraseña asociada a este correo para poder iniciar sesión.")
      return
    }

    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append("username", normalizedEmail)
      formData.append("password", password)

      const response = await api.post("/auth/token", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })

      const { access_token: accessToken, token_type: tokenType } = response.data
      completeLogin(accessToken, tokenType)
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo iniciar sesion")
    } finally {
      setLoading(false)
    }
  }

  const startPasswordReset = async (e) => {
    e.preventDefault()
    setError("")
    setInfo("")
    const normalizedEmail = resetEmail.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setResetFieldErrors({ email: true })
      setError("Escriba un correo válido con @ y dominio, por ejemplo nombre@dominio.com.")
      return
    }

    setResetFieldErrors({})
    setLoading(true)
    const requestId = ++passwordResetRequestRef.current

    try {
      const response = await api.post("/auth/password-reset/request", {
        email: normalizedEmail,
      })
      if (requestId !== passwordResetRequestRef.current) return
      setResetEmail(normalizedEmail)
      setInfo(response.data?.message || "Se ha enviado un codigo de recuperacion")
      setResetStep("confirm")
    } catch (err) {
      if (requestId !== passwordResetRequestRef.current) return
      setResetFieldErrors({ email: true })
      setError(err.response?.data?.detail || "No se pudo iniciar la recuperacion de contraseña")
    } finally {
      if (requestId === passwordResetRequestRef.current) setLoading(false)
    }
  }

  const confirmPasswordReset = async (e) => {
    e.preventDefault()
    setError("")
    setInfo("")

    const validationErrors = {}
    if (!/^\d{6}$/.test(resetCode)) validationErrors.code = true
    if (newPassword.length < 8 || newPassword.length > 32) validationErrors.newPassword = true

    if (Object.keys(validationErrors).length > 0) {
      setResetFieldErrors(validationErrors)
      setError(
        validationErrors.code
          ? "El código debe contener exactamente 6 números. Revise el correo recibido e inténtelo de nuevo."
          : "La nueva contraseña debe tener entre 8 y 32 caracteres."
      )
      return
    }

    if (newPassword !== repeatPassword) {
      setResetFieldErrors({ repeatPassword: true })
      setError("Las contraseñas no coinciden. Repita exactamente la misma contraseña en ambos campos.")
      return
    }

    setLoading(true)
    try {
      const response = await api.post("/auth/password-reset/confirm", {
        email: resetEmail,
        code: resetCode,
        newPassword,
      })
      setInfo(response.data?.message || "Contraseña actualizada correctamente")
      setResetStep("login")
      setPassword("")
      setNewPassword("")
      setRepeatPassword("")
      setResetCode("")
      setEmail(resetEmail)
    } catch (err) {
      setResetFieldErrors({ code: true })
      setError(err.response?.data?.detail || "No se pudo actualizar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    passwordResetRequestRef.current += 1
    setError("")
    setInfo("")
    setLoading(false)
    setResetStep("login")
    setResetCode("")
    setResetEmail("")
    setNewPassword("")
    setRepeatPassword("")
    setResetFieldErrors({})
  }

  const openPasswordReset = () => {
    passwordResetRequestRef.current += 1
    setResetEmail(email.trim().toLowerCase())
    setResetStep("request")
    setError("")
    setInfo("")
    setLoading(false)
    setResetFieldErrors({})
    setResetCode("")
    setNewPassword("")
    setRepeatPassword("")
  }

  const messageBox = error || info

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white px-6 py-5 shadow-lg sm:px-8 sm:py-6">
        <h2 className="mb-1 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          {resetStep === "login"
            ? "Iniciar sesión"
            : resetStep === "request"
            ? "Recuperación de contraseña"
            : "Cambiar contraseña"}
        </h2>

        {messageBox && (
          <div
            className={`flex items-start gap-3 shadow-sm ${
              error
                ? "mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-red-800"
                : "mb-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-800"
            }`}
          >

            {error && <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
            <div>
              <p className="font-semibold">
                {error ? "Ha ocurrido un error" : "Operación realizada correctamente"}
              </p>
              <p className="text-sm">{messageBox}</p>
            </div>
          </div>
        )}

        {resetStep === "login" ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={googleFirstAccess}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={googleFirstAccess}
                className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleFirstAccess}
              className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Iniciando sesion..." : "Iniciar sesión"}
            </button>

            <button
              type="button"
              disabled={googleFirstAccess}
              onClick={openPasswordReset}
              className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              ¿Olvidaste tu contraseña?
            </button>

            {googleEnabled && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-gray-300" />
                  <span className="text-xs uppercase text-gray-500">o</span>
                  <span className="h-px flex-1 bg-gray-300" />
                </div>

                <div className="flex justify-center">
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                </div>

                {pendingGoogleToken && (
                  <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={acceptedTermsGoogle}
                        onChange={(e) => setAcceptedTermsGoogle(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <span>
                        He leído y acepto los{" "}
                        <Link
                          to="/terminos-y-condiciones"
                          state={{ origin: "google" }}
                          onClick={keepGoogleTermsState}
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          términos y condiciones de uso
                        </Link>.
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={!acceptedTermsGoogle || loading}
                      onClick={() => requestGoogleBirthDatePermission()}
                      className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Aceptar, autorizar Google y continuar
                    </button>
                  </div>
                )}
              </>
            )}

            <p className="text-center text-sm mt-4">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="font-medium text-blue-600 hover:underline">
                Regístrate
              </Link>
            </p>
          </form>
        ) : resetStep === "request" ? (
          <form onSubmit={startPasswordReset} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value)
                  clearResetFieldError("email")
                }}
                required
                aria-invalid={Boolean(resetFieldErrors.email)}
                className={`mt-1 ${resetInputClassName("email")}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Enviando codigo..." : "Enviar código"}
            </button>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full text-sm font-medium text-blue-600 hover:underline"
            >
              Volver a inicio de sesión
            </button>
          </form>
        ) : (
          <form onSubmit={confirmPasswordReset} noValidate className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 text-center">
                Introduzca el código de verificación que hemos enviado a <strong>{resetEmail}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Código de verificación</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => {
                  setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  clearResetFieldError("code")
                }}
                required
                minLength="6"
                maxLength="6"
                pattern="[0-9]{6}"
                aria-invalid={Boolean(resetFieldErrors.code)}
                className={`mt-1 tracking-[0.35em] text-center ${resetInputClassName("code")}`}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  clearResetFieldError("newPassword")
                }}
                required
                aria-invalid={Boolean(resetFieldErrors.newPassword)}
                className={`mt-1 ${resetInputClassName("newPassword")}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Repita la contraseña</label>
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => {
                  setRepeatPassword(e.target.value)
                  clearResetFieldError("repeatPassword")
                }}
                required
                aria-invalid={Boolean(resetFieldErrors.repeatPassword)}
                className={`mt-1 ${resetInputClassName("repeatPassword")}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Actualizando..." : "Cambiar contraseña"}
            </button>

            <button
              type="button"
              onClick={backToLogin}
              className="w-full text-sm font-medium text-blue-600 hover:underline"
            >
              Volver a inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
