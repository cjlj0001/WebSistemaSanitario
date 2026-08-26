import React from "react"
import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import api from "../servicio/api"

export default function Logout({ className = "", onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("tokenType")
    delete api.defaults.headers.common.Authorization
    onLogout?.()
    navigate("/login", { replace: true })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${className}`}
      aria-label="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Cerrar sesión
    </button>
  )
}
