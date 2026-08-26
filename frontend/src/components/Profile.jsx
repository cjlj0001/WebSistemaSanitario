import React from "react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, UserRound } from "lucide-react"

import Logout from "./Logout"

export default function Profile({ disabled = false, dark = false }) {
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  return (
    <div ref={menuRef} className="relative z-30">
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          setOpenMenu((prev) => !prev)
        }}
        disabled={disabled}
        aria-disabled={disabled}
        className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-slate-700 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${dark ? "border-white/20 bg-white/15 text-white hover:bg-white/25" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"}`}
        aria-label="Abrir menu de perfil"
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${dark ? "bg-white/20" : "bg-emerald-100"}`}><UserRound className={`h-4 w-4 ${dark ? "text-white" : "text-emerald-700"}`} /></span>
        <span className="hidden text-sm font-medium sm:inline">Perfil</span><ChevronDown className={`h-4 w-4 transition-transform ${openMenu ? "rotate-180" : ""}`} />
      </button>

      {openMenu && !disabled && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 sm:w-72">
          <div className="px-3 pb-2 pt-1"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cuenta</p></div>
          <Link
            to="/profile"
            onClick={() => setOpenMenu(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><UserRound className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">Mis datos</span>
          </Link>

          <div className="my-2 border-t border-slate-100" />
          <Logout
            onLogout={() => setOpenMenu(false)}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:ring-red-400"
          />
        </div>
      )}
    </div>
  )
}
