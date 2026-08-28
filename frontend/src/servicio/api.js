import axios from "axios"

const api = axios.create({
  // In the packaged application Nginx proxies the backend routes at the same
  // origin. An empty base avoids prefixing paths that already include /api.
  baseURL: import.meta.env.VITE_BACKEND_URL || ""
})

api.interceptors.request.use((config) => {
  const requestUrl = String(config?.url || "")
  const isPublicAuthRoute =
    requestUrl === "/auth/token" ||
    requestUrl === "/auth/google" ||
    requestUrl === "/auth/password-reset/request" ||
    requestUrl === "/auth/password-reset/confirm"
  const storedAccessToken = localStorage.getItem("accessToken")
  const storedTokenType = localStorage.getItem("tokenType") || "bearer"

  if (storedAccessToken && !isPublicAuthRoute) {
    config.headers = config.headers || {}
    config.headers.Authorization = `${storedTokenType} ${storedAccessToken}`
  } else if (config.headers) {
    delete config.headers.Authorization
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("tokenType")
      delete api.defaults.headers.common.Authorization
    }

    return Promise.reject(error)
  }
)

export default api
