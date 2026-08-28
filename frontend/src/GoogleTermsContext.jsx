import React, { useState } from "react"
import { GoogleTermsContext } from "./googleTermsContext"

export function GoogleTermsProvider({ children }) {
  const [pendingGoogleToken, setPendingGoogleToken] = useState("")
  const [acceptedTermsGoogle, setAcceptedTermsGoogle] = useState(false)

  const beginGoogleTermsAcceptance = (idToken) => {
    setPendingGoogleToken(idToken)
    setAcceptedTermsGoogle(false)
  }

  const clearGoogleTermsAcceptance = () => {
    setPendingGoogleToken("")
    setAcceptedTermsGoogle(false)
  }

  return (
    <GoogleTermsContext.Provider
      value={{
        pendingGoogleToken,
        acceptedTermsGoogle,
        setAcceptedTermsGoogle,
        beginGoogleTermsAcceptance,
        clearGoogleTermsAcceptance,
      }}
    >
      {children}
    </GoogleTermsContext.Provider>
  )
}
