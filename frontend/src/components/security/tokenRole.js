const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    )

    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export const getJwtPayloadFromToken = (token) => decodeJwtPayload(token || "")

export const getSessionExpiresAtFromToken = (token) => {
  const tokenPayload = decodeJwtPayload(token || "")
  const exp = Number(tokenPayload?.exp ?? 0)
  if (!Number.isFinite(exp) || exp <= 0) return null
  return new Date(exp * 1000)
}

export const getUserRoleFromToken = (token) => {
  const tokenPayload = decodeJwtPayload(token || "")
  return tokenPayload?.role ?? null
}
