import api from './api'

const publicRequest = {
  skipAuthHeader: true,
  skipAuthRefresh: true,
}

export const authService = {
  login: (credentials) => api.post('/token/', credentials, publicRequest),

  register: (data) => api.post('/registro/', data, publicRequest),

  confirmActivation: (data) =>
    api.post('/verificacao/confirmar/', data, publicRequest),

  resendActivation: (email) =>
    api.post('/verificacao/reenviar/', { email }, publicRequest),

  requestPasswordReset: (email) =>
    api.post('/senha/esqueci/', { email }, publicRequest),

  confirmPasswordReset: (data) =>
    api.post('/senha/redefinir/', data, publicRequest),

  googleLogin: (credential) =>
    api.post('/social/google/', { credential }, publicRequest),

  refreshToken: (refresh) =>
    api.post('/token/refresh/', { refresh }, publicRequest),

  verifyToken: (token) =>
    api.post('/token/verify/', { token }, publicRequest),

  logout: (refresh) =>
    api.post('/token/logout/', { refresh }, publicRequest),

  getProfile: () => api.get('/usuarios/me/'),

  updateProfile: (data) => api.patch('/usuarios/me/', data),

  adminInviteRegister: (data) =>
    api.post('/admin-cadastro/', data, publicRequest),
}
