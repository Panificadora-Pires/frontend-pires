import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://backend-pires.class.fabricadesoftware.ifc.edu.br/api',
})

// Anexa o access token em toda requisição autenticada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Se o access token expirou (401), tenta renovar com o refresh token
// uma única vez antes de desistir e forçar logout.
let renovandoToken = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requisicaoOriginal = error.config

    if (error.response?.status === 401 && !requisicaoOriginal._retentativa) {
      requisicaoOriginal._retentativa = true
      const refreshToken = localStorage.getItem('pp_refresh_token')

      if (!refreshToken) {
        limparSessao()
        return Promise.reject(error)
      }

      try {
        renovandoToken =
          renovandoToken ||
          axios.post(`${api.defaults.baseURL}/token/refresh/`, { refresh: refreshToken })

        const { data } = await renovandoToken
        renovandoToken = null

        localStorage.setItem('pp_access_token', data.access)
        requisicaoOriginal.headers.Authorization = `Bearer ${data.access}`
        return api(requisicaoOriginal)
      } catch (erroRefresh) {
        renovandoToken = null
        limparSessao()
        return Promise.reject(erroRefresh)
      }
    }

    return Promise.reject(error)
  }
)

function limparSessao() {
  localStorage.removeItem('pp_access_token')
  localStorage.removeItem('pp_refresh_token')
  window.location.href = '/login'
}

export default api
