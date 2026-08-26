import React from "react"
import { getUserRoleFromToken } from "./tokenRole"

function Role({ allowedRoles = [], children }) {
  const accessToken = localStorage.getItem("accessToken") || ""
  const userRole = getUserRoleFromToken(accessToken)

  if (!allowedRoles.includes(userRole)) {
    return null
  }

  return <>{children}</>
}

export default Role