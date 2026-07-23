import { defineStore } from "pinia";
import api from "@/services/api";

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
        const { data } = await api.post("/token/", { email, password });
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

    async register(name, email, password) {
      this.carregando = true;
      this.erro = null;

      try {
        // 1. Cria a conta no backend
        await api.post("/registro/", { name, email, password });

        // 2. Faz login automaticamente após o sucesso
        return await this.login(email, password);
      } catch (erro) {
        this.erro = mensagemDeErro(erro);
        return false;
      } finally {
        this.carregando = false;
      }
    },

    async buscarUsuarioLogado() {
      const { data } = await api.get("/usuarios/me/");
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
  if (!erro.response) {
    return "Não foi possível conectar ao servidor.";
  }

  // Erro de validação do Django (e-mail já existe, senha curta, etc)
  if (erro.response.status === 400) {
    const data = erro.response.data;
    // DRF retorna um dict de erros, pegamos o primeiro
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      return data[firstKey][0] || "Dados inválidos.";
    }
    return "Dados inválidos.";
  }

  if (erro.response.status === 401) {
    return "E-mail ou senha incorretos.";
  }

  return "Algo deu errado. Tente novamente.";
}
