import { defineStore } from "pinia";

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getSessionVersion,
  persistTokens,
} from "@/services/api";
import { authService } from "@/services/auth.service";
import { useCartStore } from "@/stores/cart";

const ACTIVATION_STORAGE_KEY = "pp_pending_activation";
const PASSWORD_RESET_STORAGE_KEY = "pp_pending_password_reset";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    usuario: null,
    carregando: false,
    erro: null,
    sessaoInicializada: false,
    geracaoOperacao: 0,
    pendenciasTemporarias: {},
    chaveOperacao: null,
  }),

  getters: {
    autenticado: (state) => Boolean(state.usuario),
    isAdmin: (state) => Boolean(state.usuario?.is_staff),
  },

  actions: {
    async login(email, password) {
      return this._executar(async (contexto) => {
        const { data } = await authService.login({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!contexto.atual()) return;
        useCartStore().sincronizarConta(null);
        this.usuario = null;
        persistTokens(data);
        contexto.versao = getSessionVersion();
        await this.buscarUsuarioLogado(contexto);

        return { usuario: this.usuario };
      }, `login:${email.trim().toLowerCase()}`);
    },

    async register(userData) {
      return this._executar(async (contexto) => {
        const payload = {
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          phone: userData.phone,
          password: userData.password,
        };

        const { data } = await authService.register(payload);

        if (!contexto.atual()) return;
        this._salvarPendencia(ACTIVATION_STORAGE_KEY, {
          email: payload.email,
          requestId: data.verification_id,
          emailSent: data.email_sent,
          expiresAt: Date.now() + Number(data.expires_in_seconds || 0) * 1000,
          retryAfterSeconds: 0,
          requestedAt: Date.now(),
        });

        return data;
      });
    },

    async confirmarAtivacao(code) {
      const pendencia = this.obterAtivacaoPendente();

      if (!pendencia?.requestId) {
        return {
          ok: false,
          erro: "Solicite um novo código de confirmação.",
          campos: {},
        };
      }

      return this._executar(async (contexto) => {
        const { data } = await authService.confirmActivation({
          request_id: pendencia.requestId,
          code,
        });

        if (!contexto.atual() || this.obterAtivacaoPendente()?.requestId !== pendencia.requestId) return;
        this.limparAtivacaoPendente();
        return data;
      });
    },

    async reenviarAtivacao(email) {
      return this._executar(async (contexto) => {
        const emailNormalizado = email.trim().toLowerCase();
        const { data } = await authService.resendActivation(emailNormalizado);

        if (!contexto.atual()) return;
        this._salvarPendencia(ACTIVATION_STORAGE_KEY, {
          email: emailNormalizado,
          requestId: data.verification_id,
          emailSent: null,
          retryAfterSeconds: Number(data.retry_after_seconds || 0),
          requestedAt: Date.now(),
        });

        return data;
      });
    },

    obterAtivacaoPendente() {
      return this._lerPendencia(ACTIVATION_STORAGE_KEY);
    },

    limparAtivacaoPendente() {
      this._removerPendencia(ACTIVATION_STORAGE_KEY);
    },

    async solicitarRedefinicaoSenha(email) {
      return this._executar(async (contexto) => {
        const emailNormalizado = email.trim().toLowerCase();
        const { data } =
          await authService.requestPasswordReset(emailNormalizado);

        if (!contexto.atual()) return;
        this._salvarPendencia(PASSWORD_RESET_STORAGE_KEY, {
          email: emailNormalizado,
          message: data.message,
          requestId: data.verification_id,
          retryAfterSeconds: Number(data.retry_after_seconds || 0),
          requestedAt: Date.now(),
        });

        return data;
      });
    },

    obterRedefinicaoPendente() {
      return this._lerPendencia(PASSWORD_RESET_STORAGE_KEY);
    },

    limparRedefinicaoPendente() {
      this._removerPendencia(PASSWORD_RESET_STORAGE_KEY);
    },

    async redefinirSenha({ code, newPassword }) {
      const pendencia = this.obterRedefinicaoPendente();

      if (!pendencia?.requestId) {
        return {
          ok: false,
          erro: "Solicite um novo código de recuperação.",
          campos: {},
        };
      }

      return this._executar(async (contexto) => {
        const { data } = await authService.confirmPasswordReset({
          request_id: pendencia.requestId,
          code,
          new_password: newPassword,
        });

        if (!contexto.atual() || this.obterRedefinicaoPendente()?.requestId !== pendencia.requestId) return;
        this.limparRedefinicaoPendente();
        this._limparSessaoLocal();
        contexto.versao = getSessionVersion();
        contexto.operacao = this.geracaoOperacao;

        return data;
      });
    },

    async loginWithGoogle(credential) {
      if (!credential) {
        return {
          ok: false,
          erro: "O Google não retornou uma credencial válida.",
          campos: {},
        };
      }

      return this._executar(async (contexto) => {
        const { data } = await authService.googleLogin(credential);

        if (!contexto.atual()) return;
        useCartStore().sincronizarConta(null);
        this.usuario = null;
        persistTokens(data);
        contexto.versao = getSessionVersion();
        await this.buscarUsuarioLogado(contexto);

        return { usuario: this.usuario };
      });
    },

    async buscarUsuarioLogado(contexto = null) {
      const versao = getSessionVersion();
      const { data } = await authService.getProfile();
      if (versao !== getSessionVersion() || (contexto && !contexto.atual())) return null;
      this.usuario = data;
      useCartStore().sincronizarConta(data?.id);
      return data;
    },

    async atualizarPerfil(payload) {
      return this._executar(async (contexto) => {
        const { data } = await authService.updateProfile(payload);
        if (!contexto.atual()) return;
        this.usuario = data;
        useCartStore().sincronizarConta(data?.id);
        return data;
      });
    },

    async restaurarSessao() {
      if (this.sessaoInicializada) {
        return this.autenticado;
      }

      const versao = getSessionVersion();
      this.sessaoInicializada = true;

      if (!getAccessToken() && !getRefreshToken()) {
        this.usuario = null;
        useCartStore().sincronizarConta(null);
        return false;
      }

      try {
        await this.buscarUsuarioLogado();
        if (versao !== getSessionVersion()) return this.autenticado;
        return true;
      } catch (error) {
        if (versao !== getSessionVersion()) return this.autenticado;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          this._limparSessaoLocal();
        } else {
          // Falha temporária: não renderiza itens sem perfil confirmado,
          // mas preserva o rascunho da aba para que o F5 seguinte restaure.
          this.usuario = null;
          useCartStore().suspenderConta();
          this.sessaoInicializada = false;
        }
        return false;
      }
    },

    async logout() {
      const refresh = getRefreshToken();
      this._limparSessaoLocal();

      try {
        if (refresh) {
          await authService.logout(refresh);
        }
      } catch {
      }
    },

    _limparSessaoLocal() {
      this.geracaoOperacao += 1;
      useCartStore().sincronizarConta(null);
      this.usuario = null;
      this.erro = null;
      this.carregando = false;
      clearTokens();
    },

    invalidarOperacao() {
      this.geracaoOperacao += 1;
      this.carregando = false;
      this.erro = null;
    },

    _salvarPendencia(chave, valor) {
      // A conta pode já ter sido criada; storage bloqueado não deve simular falha no cadastro.
      // O fallback vive apenas nesta página e nunca recebe senhas ou códigos.
      try {
        sessionStorage.setItem(chave, JSON.stringify(valor));
        delete this.pendenciasTemporarias[chave];
      } catch { this.pendenciasTemporarias[chave] = valor; }
    },

    _removerPendencia(chave) {
      try {
        sessionStorage.removeItem(chave);
        delete this.pendenciasTemporarias[chave];
      } catch { this.pendenciasTemporarias[chave] = null; }
    },

    _lerPendencia(chave) {
      return Object.hasOwn(this.pendenciasTemporarias, chave)
        ? this.pendenciasTemporarias[chave]
        : lerJsonSessao(chave);
    },

    async _executar(callback, chave = null) {
      // Repetir uma submissão não duplica HTTP. Uma nova identidade de login
      // pode substituir a anterior; a geração invalida seus efeitos tardios.
      if (this.carregando && (!chave || !this.chaveOperacao || chave === this.chaveOperacao)) {
        return { ok: false, ignorado: true, campos: {} };
      }
      const contexto = { versao: getSessionVersion(), operacao: ++this.geracaoOperacao };
      contexto.atual = () => contexto.operacao === this.geracaoOperacao && contexto.versao === getSessionVersion();
      const operacaoAtual = () => contexto.operacao === this.geracaoOperacao;
      const ignorado = { ok: false, ignorado: true, campos: {} };
      this.carregando = true;
      this.chaveOperacao = chave;
      this.erro = null;

      try {
        const data = await callback(contexto);
        if (data === undefined || !operacaoAtual() || contexto.versao !== getSessionVersion()) return ignorado;
        return { ok: true, data, campos: {} };
      } catch (error) {
        if (!operacaoAtual()) return ignorado;
        // O refresh recusado encerra os tokens, mas esta operação ainda precisa
        // liberar o formulário e mostrar a falha. Outra conta/ação não é dona dela.
        if (contexto.versao !== getSessionVersion() && (getAccessToken() || getRefreshToken() || !error.response)) return ignorado;
        const normalizado = normalizarErroApi(error);
        this.erro = normalizado.mensagem;

        return {
          ok: false,
          erro: normalizado.mensagem,
          campos: normalizado.campos,
          status: error.response?.status ?? null,
        };
      } finally {
        if (operacaoAtual()) this.carregando = false;
      }
    },
  },
});

function normalizarErroApi(error) {
  if (!error.response) {
    return {
      mensagem: "Não foi possível conectar ao servidor. Verifique sua conexão.",
      campos: {},
    };
  }

  if (error.response.status === 429) {
    return {
      mensagem: "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
      campos: {},
    };
  }

  const data = error.response.data;
  const campos = {};

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [campo, valor] of Object.entries(data)) {
      if (["detail", "error", "message", "non_field_errors"].includes(campo)) {
        continue;
      }

      campos[campo] = primeiraMensagem(valor);
    }
  }

  let mensagem =
    primeiraMensagem(data?.error) ||
    primeiraMensagem(data?.detail) ||
    primeiraMensagem(data?.non_field_errors) ||
    primeiraMensagem(data?.message);

  if (!mensagem && error.response.status === 401) {
    mensagem =
      "E-mail ou senha incorretos, ou a conta ainda não foi confirmada.";
  }

  if (!mensagem) {
    mensagem =
      Object.values(campos).find(Boolean) ||
      "Não foi possível concluir a operação.";
  }

  return { mensagem, campos };
}

function primeiraMensagem(valor) {
  if (Array.isArray(valor)) {
    return primeiraMensagem(valor[0]);
  }

  if (typeof valor === "string") {
    return valor;
  }

  return "";
}

function lerJsonSessao(chave) {
  try {
    const valor = sessionStorage.getItem(chave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    try { sessionStorage.removeItem(chave); } catch { /* Storage indisponível. */ }
    return null;
  }
}
