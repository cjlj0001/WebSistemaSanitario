import React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../servicio/api"

export default function Registro() {
  const navigate = useNavigate()

  const [nombre, setNombre] = useState("")
  const [dni, setDni] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!acceptedTerms) {
      setError("Debe aceptar los términos y condiciones de uso para crear una cuenta")
      return
    }

    setLoading(true)

    const usuario = {
      name: nombre,
      dni: dni,
      email: email,
      password: password,
      fechaNacimiento: fechaNacimiento,
      termsAccepted: acceptedTerms,
    }

    try {
      const response = await api.post("/api/users", usuario)
      console.log("Usuario registrado exitosamente:", response.data)
      
      setNombre("")
      setDni("")
      setEmail("")
      setPassword("")
      setFechaNacimiento("")
      setAcceptedTerms(false)
      

      navigate("/login")
    } catch (err) {
      setError(err.response?.data?.detail || "Error al registrar usuario")
      console.error("Error en registro:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-gray-100 p-4">

      <div className="w-full max-w-lg rounded-2xl bg-white px-8 py-6 shadow-lg">

        <h2 className="mb-4 text-center text-3xl font-bold">
          Registro de usuario
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          <div>
            <label className="block text-md font-medium">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <div>
            <label className="block text-md font-medium">
              DNI
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <div>
            <label className="block text-md font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <div>
            <label className="block text-md font-medium">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <div>
            <label className="block text-md font-medium">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded p-2 mt-1"
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>
              He leído y acepto los{" "}
              <Link
                to="/términos-y-condiciones"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                términos y condiciones de uso
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-500 disabled:bg-gray-400"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>

          <p className="text-center text-sm mt-4">
            ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 hover:underline">Inicia sesión</Link>
          </p>

        </form>

      </div>

    </div>
  )
}
