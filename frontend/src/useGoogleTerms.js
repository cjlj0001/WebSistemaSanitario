import { useContext } from "react"
import { GoogleTermsContext } from "./googleTermsContext"

export function useGoogleTerms() {
  const context = useContext(GoogleTermsContext)

  if (!context) {
    throw new Error("useGoogleTerms must be used inside GoogleTermsProvider")
  }

  return context
}
