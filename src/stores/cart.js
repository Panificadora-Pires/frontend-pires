import { acceptHMRUpdate, defineStore } from "pinia";

// Rascunho por aba: sobrevive ao F5, mas nunca vira fonte de verdade para
// preços/estoque. A identidade só é confiável depois de restaurar o perfil.
const CART_DRAFT_KEY = "pp_cart_draft_v1";
const PRODUCT_FIELDS = [
  "id", "nome", "categoria", "categoria_nome", "imagem",
  "preco", "preco_atual", "em_promocao", "estoque", "ativo",
];

function readDraft(accountId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CART_DRAFT_KEY) || "null");
    if (saved?.version !== 1 || saved.accountId !== accountId
      || !Array.isArray(saved.items) || saved.items.length > 100) return [];

    return saved.items.flatMap(({ product, quantity } = {}) => {
      const id = Number(product?.id);
      const qty = Number(quantity);
      if (!Number.isSafeInteger(id) || id <= 0
        || !Number.isSafeInteger(qty) || qty <= 0 || qty > 10000) return [];
      const clean = Object.fromEntries(
        PRODUCT_FIELDS.filter(field => Object.hasOwn(product, field))
          .map(field => [field, product[field]])
      );
      // Não confiar no valor salvo para confirmar um pedido: o carrinho
      // reconsulta catálogo/estoque ao entrar e antes do checkout.
      return [{ produto: clean, quantidade: qty }];
    });
  } catch {
    return [];
  }
}

function saveDraft(store) {
  try {
    if (!store.contaId || store.itens.length === 0) {
      sessionStorage.removeItem(CART_DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(CART_DRAFT_KEY, JSON.stringify({
      version: 1,
      accountId: store.contaId,
      items: store.itens.map(({ produto, quantidade }) => ({
        product: Object.fromEntries(
          PRODUCT_FIELDS.filter(field => Object.hasOwn(produto, field))
            .map(field => [field, produto[field]])
        ),
        quantity: quantidade,
      })),
    }));
  } catch {
    // Storage pode estar desativado ou cheio. O carrinho em memória segue funcional.
  }
}

export const useCartStore = defineStore("cart", {
  state: () => ({
    itens: [],
    contaId: null,
    geracao: 0,
  }),

  getters: {
    totalItens: (state) =>
      state.itens.reduce((soma, item) => soma + item.quantidade, 0),

    totalPreco: (state) =>
      state.itens.reduce(
        (soma, item) =>
          soma +
          Number(item.produto.preco_atual ?? item.produto.preco) *
            item.quantidade,
        0,
      ),

    vazio: (state) => state.itens.length === 0,
  },

  actions: {
    sincronizarConta(id) {
      const contaId = id == null ? null : String(id);
      if (contaId === this.contaId) {
        // Login explícito e logout podem chegar aqui antes de haver uma conta
        // em memória. Mesmo assim devem descartar o rascunho anterior.
        if (contaId === null) saveDraft(this);
        return;
      }

      const restaurado = this.contaId === null && contaId !== null
        ? readDraft(contaId)
        : [];
      this.contaId = contaId;
      this.geracao += 1;
      this.itens = restaurado;
      saveDraft(this);
    },

    suspenderConta() {
      // Se a rede falhou ao restaurar o perfil, nunca mostrar dados privados
      // sem autenticação, mas guardar o rascunho por aba para nova tentativa.
      this.contaId = null;
      this.geracao += 1;
      this.itens = [];
    },

    capturarContexto() {
      return { contaId: this.contaId, geracao: this.geracao };
    },

    contextoAtual(contexto) {
      return this.contaId !== null && contexto?.contaId === this.contaId && contexto?.geracao === this.geracao;
    },

    adicionar(produto, quantidade = 1, contexto = this.capturarContexto()) {
      if (!this.contextoAtual(contexto)) return false;
      const existente = this.itens.find(
        (item) => item.produto.id === produto.id,
      );

      if (existente) {
        existente.quantidade += quantidade;
      } else {
        this.itens.push({ produto, quantidade });
      }
      saveDraft(this);
      return true;
    },

    removerItem(produtoId) {
      this.itens = this.itens.filter((item) => item.produto.id !== produtoId);
      saveDraft(this);
    },

    alterarQuantidade(produtoId, quantidade) {
      if (quantidade <= 0) {
        this.removerItem(produtoId);
        return;
      }
      const item = this.itens.find((item) => item.produto.id === produtoId);
      if (item) {
        item.quantidade = quantidade;
        saveDraft(this);
      }
    },

    limpar(contexto = this.capturarContexto()) {
      if (!this.contextoAtual(contexto)) return false;
      this.itens = [];
      saveDraft(this);
      return true;
    },

    atualizarRascunho() {
      // Chamado depois que o backend revalidou detalhes dos produtos.
      saveDraft(this);
    },
  },
});
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useCartStore, import.meta.hot));
