import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import api from "../servicio/api"
import { getUserRoleFromToken } from "../components/security/tokenRole"

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [resetStep, setResetStep] = useState("login")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const [acceptedTermsGoogle, setAcceptedTermsGoogle] = useState(false)
  const [pendingGoogleToken, setPendingGoogleToken] = useState("")
  const [googleFirstAccess, setGoogleFirstAccess] = useState(false)
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  const completeLogin = (accessToken, tokenType) => {
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
  }

  const completeGoogleLogin = async (idToken, acceptTerms = false) => {
    if (!idToken) {
      setError("Google no devolvió un token válido")
      return
    }

    setError("")
    setLoading(true)
    try {
      const response = await api.post("/auth/google", { idToken, acceptTerms })
      const { access_token: accessToken, token_type: tokenType } = response.data
      completeLogin(accessToken, tokenType)
    } catch (err) {
      if (err.response?.status === 428) {
        setPendingGoogleToken(idToken)
        setAcceptedTermsGoogle(false)
        setError("")
        setInfo("Para completar tu primer acceso con Google, revisa y acepta los términos y condiciones.")
        return
      }
      setError(err.response?.data?.detail || "No se pudo iniciar sesión con Google")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (credentialResponse) => {
    setGoogleFirstAccess(true)
    completeGoogleLogin(credentialResponse?.credential)
  }

  const handleGoogleError = () => {
    setGoogleFirstAccess(false)
    setError("No se pudo completar la autenticación de Google")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append("username", email)
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
    setLoading(true)

    try {
      const response = await api.post("/auth/password-reset/request", {
        email: resetEmail,
      })
      setInfo(response.data?.message || "Se ha enviado un codigo de recuperacion")
      setResetStep("confirm")
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo iniciar la recuperacion de contraseña")
    } finally {
      setLoading(false)
    }
  }

  const confirmPasswordReset = async (e) => {
    e.preventDefault()
    setError("")
    setInfo("")

    if (newPassword !== repeatPassword) {
      setError("Las contraseñas no coinciden")
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
      setError(err.response?.data?.detail || "No se pudo actualizar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = () => {
    setError("")
    setInfo("")
    setResetStep("login")
    setResetCode("")
    setNewPassword("")
    setRepeatPassword("")
  }

  const messageBox = error || info
  const messageClass = error
    ? "bg-red-100 border-red-400 text-red-700"
    : "bg-green-100 border-green-400 text-green-700"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white min-h-96 py-16 px-12 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {resetStep === "login"
            ? "Iniciar sesión"
            : resetStep === "request"
            ? "Recuperación de contraseña"
            : "Cambiar contraseña"}
        </h2>

        {messageBox && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-lg border p-4 shadow-sm ${
              error
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-green-300 bg-green-50 text-green-800"
            }`}
          >

            <div>
              <p className="font-semibold">
                {error ? "Ha ocurrido un error" : "Operación realizada correctamente"}
              </p>
              <p className="text-sm">{messageBox}</p>
            </div>
          </div>
        )}

        {resetStep === "login" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-md font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={googleFirstAccess}
                className="w-full border rounded p-2 mt-1 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-md font-medium">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={googleFirstAccess}
                className="w-full border rounded p-2 mt-1 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleFirstAccess}
              className="w-full text-lg bg-green-700 text-white py-2 rounded hover:bg-green-500 disabled:bg-gray-400"
            >
              {loading ? "Iniciando sesion..." : "Iniciar sesión"}
            </button>

            <button
              type="button"
              disabled={googleFirstAccess}
              onClick={() => {
                setResetEmail(email)
                setResetStep("request")
                setError("")
                setInfo("")
              }}
              className="w-full text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
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
                        <Link to="/términos-y-condiciones" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                          términos y condiciones de uso
                        </Link>.
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={!acceptedTermsGoogle || loading}
                      onClick={() => completeGoogleLogin(pendingGoogleToken, true)}
                      className="w-full rounded bg-green-700 py-2 font-medium text-white hover:bg-green-600 disabled:bg-gray-400"
                    >
                      Aceptar y continuar
                    </button>
                  </div>
                )}
              </>
            )}

            <p className="text-center text-sm mt-4">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="text-blue-600 hover:underline">
                Regístrate
              </Link>
            </p>
          </form>
        ) : resetStep === "request" ? (
          <form onSubmit={startPasswordReset} className="space-y-4">
            <div>
              <label className="block text-md font-medium">Correo electrónico</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="w-full border rounded p-2 mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-lg bg-green-700 text-white py-2 rounded hover:bg-green-500 disabled:bg-gray-400"
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
          <form onSubmit={confirmPasswordReset} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 text-center">
                Introduzca el código de verificación que hemos enviado a <strong>{resetEmail}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-md font-medium">Código de verificación</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                minLength="6"
                maxLength="6"
                pattern="[0-9]{6}"
                className="w-full border rounded p-2 mt-1 tracking-[0.35em] text-center"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>

            <div>
              <label className="block text-md font-medium">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border rounded p-2 mt-1"
              />
            </div>

            <div>
              <label className="block text-md font-medium">Repita la contraseña</label>
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
                className="w-full border rounded p-2 mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-lg bg-green-700 text-white py-2 rounded hover:bg-green-500 disabled:bg-gray-400"
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
