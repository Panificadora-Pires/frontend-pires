import { defineStore } from "pinia";
import catalogService, { promocaoEstaAtiva } from "@/services/catalog.service";

// Dados públicos do catálogo, carregados pela navegação sem criar outro polling.
export const useNavigationCatalogStore = defineStore("navigationCatalog", {
  state: () => ({
    categorias: [],
    promocoes: [],
    carregandoCategorias: false,
    carregandoPromocoes: false,
    categoriasInicializadas: false,
    promocoesInicializadas: false,
    erroCategorias: null,
    erroPromocoes: null,
  }),
  getters: {
    promocoesAtivas: (state) => state.promocoes.filter((item) => promocaoEstaAtiva(item)),
  },
  actions: {
    async carregarCategorias({ force = false } = {}) {
      if (this.carregandoCategorias || (this.categoriasInicializadas && !force)) return;
      this.carregandoCategorias = true;
      this.erroCategorias = null;
      try {
        this.categorias = await catalogService.listarCategoriasAtivas();
        this.categoriasInicializadas = true;
      } catch {
        this.erroCategorias = "Não foi possível atualizar as categorias.";
      } finally {
        this.carregandoCategorias = false;
      }
    },
    async carregarPromocoes({ force = false } = {}) {
      if (this.carregandoPromocoes || (this.promocoesInicializadas && !force)) return;
      this.carregandoPromocoes = true;
      this.erroPromocoes = null;
      try {
        this.promocoes = await catalogService.listarPromocoes();
        this.promocoesInicializadas = true;
      } catch {
        this.erroPromocoes = "Não foi possível atualizar as promoções.";
      } finally {
        this.carregandoPromocoes = false;
      }
    },
  },
});
