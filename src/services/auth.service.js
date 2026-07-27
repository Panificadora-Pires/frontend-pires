import api from './api'

export const authService = {
  login: (credentials) => api.post('/token/', credentials),
  register: (data) => api.post('/registro/', data),
  refreshToken: (refresh) => api.post('/token/refresh/', { refresh }),
  getProfile: () => api.get('/usuarios/me/'),
  googleLogin: (credential) => api.post('/social/login/google/', { credential }), // Envia o token do Google
  adminRegister: (data) => api.post('/admin-register/', data),
}