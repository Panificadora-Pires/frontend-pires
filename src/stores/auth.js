import { defineStore } from 'pinia'

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  persistTokens,
} from '@/services/api'
import { authService } from '@/services/auth.service'

const ACTIVATION_STORAGE_KEY = 'pp_pending_activation'
const PASSWORD_RESET_STORAGE_KEY = 'pp_pending_password_reset'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    carregando: false,
    erro: null,
    sessaoInicializada: false,
  }),

  getters: {
    autenticado: (state) => Boolean(state.usuario),
    isAdmin: (state) => Boolean(state.usuario?.is_staff),
  },

  actions: {
    async login(email, password) {
      return this._executar(async () => {
        const { data } = await authService.login({
          email: email.trim().toLowerCase(),
          password,
        })

        persistTokens(data)
        await this.buscarUsuarioLogado()

        return { usuario: this.usuario }
      })
    },

    async register(userData) {
      return this._executar(async () => {
        const payload = {
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          phone: userData.phone,
          password: userData.password,
        }

        const { data } = await authService.register(payload)

        salvarJsonSessao(ACTIVATION_STORAGE_KEY, {
          email: payload.email,
          requestId: data.verification_id,
          emailSent: data.email_sent,
          expiresAt: Date.now() + Number(data.expires_in_seconds || 0) * 1000,
          retryAfterSeconds: 0,
          requestedAt: Date.now(),
        })

        return data
      })
    },

    async confirmarAtivacao(code) {
      const pendencia = this.obterAtivacaoPendente()

      if (!pendencia?.requestId) {
        return {
          ok: false,
          erro: 'Solicite um novo código de confirmação.',
          campos: {},
        }
      }

      return this._executar(async () => {
        const { data } = await authService.confirmActivation({
          request_id: pendencia.requestId,
          code,
        })

        sessionStorage.removeItem(ACTIVATION_STORAGE_KEY)
        return data
      })
    },

    async reenviarAtivacao(email) {
      return this._executar(async () => {
        const emailNormalizado = email.trim().toLowerCase()
        const { data } = await authService.resendActivation(emailNormalizado)

        salvarJsonSessao(ACTIVATION_STORAGE_KEY, {
          email: emailNormalizado,
          requestId: data.verification_id,
          emailSent: true,
          retryAfterSeconds: Number(data.retry_after_seconds || 0),
          requestedAt: Date.now(),
        })

        return data
      })
    },

    obterAtivacaoPendente() {
      return lerJsonSessao(ACTIVATION_STORAGE_KEY)
    },

    limparAtivacaoPendente() {
      sessionStorage.removeItem(ACTIVATION_STORAGE_KEY)
    },

    async solicitarRedefinicaoSenha(email) {
      return this._executar(async () => {
        const emailNormalizado = email.trim().toLowerCase()
        const { data } = await authService.requestPasswordReset(emailNormalizado)

        salvarJsonSessao(PASSWORD_RESET_STORAGE_KEY, {
          email: emailNormalizado,
          requestId: data.verification_id,
          retryAfterSeconds: Number(data.retry_after_seconds || 0),
          requestedAt: Date.now(),
        })

        return data
      })
    },

    obterRedefinicaoPendente() {
      return lerJsonSessao(PASSWORD_RESET_STORAGE_KEY)
    },

    limparRedefinicaoPendente() {
      sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY)
    },

    async redefinirSenha({ code, newPassword }) {
      const pendencia = this.obterRedefinicaoPendente()

      if (!pendencia?.requestId) {
        return {
          ok: false,
          erro: 'Solicite um novo código de recuperação.',
          campos: {},
        }
      }

      return this._executar(async () => {
        const { data } = await authService.confirmPasswordReset({
          request_id: pendencia.requestId,
          code,
          new_password: newPassword,
        })

        sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY)
        this._limparSessaoLocal()

        return data
      })
    },

    async loginWithGoogle(credential) {
      if (!credential) {
        return {
          ok: false,
          erro: 'O Google não retornou uma credencial válida.',
          campos: {},
        }
      }

      return this._executar(async () => {
        const { data } = await authService.googleLogin(credential)

        persistTokens(data)
        await this.buscarUsuarioLogado()

        return { usuario: this.usuario }
      })
    },

    async buscarUsuarioLogado() {
      const { data } = await authService.getProfile()
      this.usuario = data
      return data
    },

    async atualizarPerfil(payload) {
      return this._executar(async () => {
        const { data } = await authService.updateProfile(payload)
        this.usuario = data
        return data
      })
    },

    async restaurarSessao() {
      if (this.sessaoInicializada) {
        return this.autenticado
      }

      this.sessaoInicializada = true

      if (!getAccessToken() && !getRefreshToken()) {
        this.usuario = null
        return false
      }

      try {
        await this.buscarUsuarioLogado()
        return true
      } catch {
        this._limparSessaoLocal()
        return false
      }
    },

    async logout() {
      const refresh = getRefreshToken()

      try {
        if (refresh) {
          await authService.logout(refresh)
        }
      } catch {
        // A sessão local precisa ser encerrada mesmo se o refresh já estiver
        // expirado, revogado ou se o backend estiver temporariamente indisponível.
      } finally {
        this._limparSessaoLocal()
      }
    },

    _limparSessaoLocal() {
      this.usuario = null
      this.erro = null
      clearTokens()
    },

    async _executar(callback) {
      this.carregando = true
      this.erro = null

      try {
        const data = await callback()
        return { ok: true, data, campos: {} }
      } catch (error) {
        const normalizado = normalizarErroApi(error)
        this.erro = normalizado.mensagem

        return {
          ok: false,
          erro: normalizado.mensagem,
          campos: normalizado.campos,
          status: error.response?.status ?? null,
        }
      } finally {
        this.carregando = false
      }
    },
  },
})

function normalizarErroApi(error) {
  if (!error.response) {
    return {
      mensagem: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      campos: {},
    }
  }

  if (error.response.status === 429) {
    return {
      mensagem: 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
      campos: {},
    }
  }

  const data = error.response.data
  const campos = {}

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [campo, valor] of Object.entries(data)) {
      if (['detail', 'error', 'message', 'non_field_errors'].includes(campo)) {
        continue
      }

      campos[campo] = primeiraMensagem(valor)
    }
  }

  let mensagem =
    primeiraMensagem(data?.error) ||
    primeiraMensagem(data?.detail) ||
    primeiraMensagem(data?.non_field_errors) ||
    primeiraMensagem(data?.message)

  if (!mensagem && error.response.status === 401) {
    mensagem = 'E-mail ou senha incorretos, ou a conta ainda não foi confirmada.'
  }

  if (!mensagem) {
    mensagem = Object.values(campos).find(Boolean) || 'Não foi possível concluir a operação.'
  }

  return { mensagem, campos }
}

function primeiraMensagem(valor) {
  if (Array.isArray(valor)) {
    return primeiraMensagem(valor[0])
  }

  if (typeof valor === 'string') {
    return valor
  }

  return ''
}

function salvarJsonSessao(chave, valor) {
  sessionStorage.setItem(chave, JSON.stringify(valor))
}

function lerJsonSessao(chave) {
  try {
    const valor = sessionStorage.getItem(chave)
    return valor ? JSON.parse(valor) : null
  } catch {
    sessionStorage.removeItem(chave)
    return null
  }
}
