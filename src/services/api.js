import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'pp_access_token'
export const REFRESH_TOKEN_KEY = 'pp_refresh_token'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
})

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function persistTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken && !config.skipAuthHeader) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = getRefreshToken()

    const shouldRefresh = Boolean(
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._authRetry &&
      refreshToken,
    )

    if (!shouldRefresh) {
      return Promise.reject(error)
    }

    originalRequest._authRetry = true

    try {
      refreshPromise ??= axios.post(
        `${API_BASE_URL}/token/refresh/`,
        { refresh: refreshToken },
        {
          timeout: 15_000,
          headers: { Accept: 'application/json' },
        },
      )

      const { data } = await refreshPromise

      // O backend usa rotação de refresh token. Quando vier um refresh novo,
      // ele precisa substituir imediatamente o anterior já colocado na blacklist.
      persistTokens({
        access: data.access,
        refresh: data.refresh || refreshToken,
      })

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${data.access}`

      return api(originalRequest)
    } catch (refreshError) {
      clearTokens()
      redirectToLoginAfterExpiredSession()
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }
  },
)

function redirectToLoginAfterExpiredSession() {
  if (typeof window === 'undefined') return

  const publicAuthPaths = new Set([
    '/login',
    '/cadastro',
    '/confirmar-email',
    '/recuperar-senha',
    '/redefinir-senha',
  ])

  if (!publicAuthPaths.has(window.location.pathname)) {
    window.location.replace('/login?motivo=sessao-expirada')
  }
}

export default api
