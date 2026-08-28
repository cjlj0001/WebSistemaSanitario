export function getUserIdentifierLabel(value) {
  return String(value || "").trim().toUpperCase().startsWith("GOOGLE-")
    ? "ID de Google"
    : "DNI"
}
