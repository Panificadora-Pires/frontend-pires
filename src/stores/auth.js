import { defineStore } from "pinia";
import { authService } from "@/services/auth.service.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    usuario: null,
    carregando: false,
    erro: null,
  }),

  getters: {
    autenticado: (state) => !!state.usuario,
    isAdmin: (state) => !!state.usuario?.is_staff,
  },

  actions: {
    async login(email, password) {
      this.carregando = true;
      this.erro = null;
      try {
        const { data } = await authService.login({ email, password });
        localStorage.setItem("pp_access_token", data.access);
        localStorage.setItem("pp_refresh_token", data.refresh);
        await this.buscarUsuarioLogado();
        return true;
      } catch (erro) {
        this.erro = mensagemDeErro(erro);
        return false;
      } finally {
        this.carregando = false;
      }
    },

    async register(userData) {
      this.carregando = true;
      this.erro = null;
      try {
        await authService.register(userData);
        // Auto-login após cadastro
        return await this.login(userData.email, userData.password);
      } catch (erro) {
        this.erro = mensagemDeErro(erro);
        return false;
      } finally {
        this.carregando = false;
      }
    },

    async loginWithGoogle(credential) {
      this.carregando = true;
      this.erro = null;
      try {
        const { data } = await authService.googleLogin(credential);
        // O nosso backend customizado retorna access/refresh direto!
        localStorage.setItem("pp_access_token", data.access);
        localStorage.setItem("pp_refresh_token", data.refresh);
        this.usuario = data.user;
        return true;
      } catch (erro) {
        this.erro = "Falha ao logar com Google.";
        return false;
      } finally {
        this.carregando = false;
      }
    },

    async adminInviteRegister(data) {
      this.carregando = true;
      this.erro = null;
      try {
        await authService.adminRegister(data);
        // Auto-login após cadastro admin
        return await this.login(data.email, data.password);
      } catch (erro) {
        this.erro = mensagemDeErro(erro);
        return false;
      } finally {
        this.carregando = false;
      }
    },

    async buscarUsuarioLogado() {
      const { data } = await authService.getProfile();
      this.usuario = data;
    },

    async restaurarSessao() {
      const token = localStorage.getItem("pp_access_token");
      if (!token) return false;
      try {
        await this.buscarUsuarioLogado();
        return true;
      } catch {
        this.logout();
        return false;
      }
    },

    logout() {
      this.usuario = null;
      localStorage.removeItem("pp_access_token");
      localStorage.removeItem("pp_refresh_token");
    },
  },
});

function mensagemDeErro(erro) {
  if (erro.response?.status === 401) return "E-mail ou senha incorretos.";
  if (!erro.response) return "Não foi possível conectar ao servidor.";
  return "Algo deu errado. Tente novamente.";
}
