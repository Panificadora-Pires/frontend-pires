import { acceptHMRUpdate, defineStore } from "pinia";

// Rascunho local e separado por conta. Logout oculta itens da interface,
// mas nao apaga a selecao desse usuario neste navegador. Precos e estoque
// armazenados nunca sao fonte de verdade para confirmar o pedido.
const CART_DRAFT_PREFIX = "pp_cart_draft_v2_";
const CART_DRAFT_LEGACY_KEY = "pp_cart_draft_v1";
const PRODUCT_FIELDS = [
  "id", "nome", "categoria", "categoria_nome", "imagem",
  "preco", "preco_atual", "em_promocao", "estoque", "ativo",
];

function draftKey(accountId) {
  return `${CART_DRAFT_PREFIX}${encodeURIComponent(accountId)}`;
}

function readDraft(accountId) {
  let serialized = null;
  let version = 2;
  try { serialized = localStorage.getItem(draftKey(accountId)); } catch {}
  // Migra um rascunho antigo salvo em sessionStorage apos F5, sem misturar contas.
  if (serialized === null) {
    try { serialized = sessionStorage.getItem(CART_DRAFT_LEGACY_KEY); version = 1; } catch {}
  }
  try {
    const saved = JSON.parse(serialized || "null");
    if (saved?.version !== version || saved.accountId !== accountId
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
      return [{ produto: clean, quantidade: qty }];
    });
  } catch {
    return [];
  }
}

function limparRascunhoLegado(accountId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CART_DRAFT_LEGACY_KEY) || "null");
    if (saved?.version === 1 && saved.accountId === accountId) {
      sessionStorage.removeItem(CART_DRAFT_LEGACY_KEY);
    }
  } catch {
    // Rascunho legado indisponivel ou invalido nao impede o carrinho.
  }
}

function saveDraft(store) {
  if (!store.contaId) return;
  try {
    const key = draftKey(store.contaId);
    if (!store.itens.length) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify({
        version: 2,
        accountId: store.contaId,
        items: store.itens.map(({ produto, quantidade }) => ({
          product: Object.fromEntries(
            PRODUCT_FIELDS.filter(field => Object.hasOwn(produto, field))
              .map(field => [field, produto[field]])
          ),
          quantity: quantidade,
        })),
      }));
    }
    limparRascunhoLegado(store.contaId);
  } catch {
    // Storage bloqueado/cheio: carrinho permanece funcional em memoria.
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
      if (contaId === this.contaId) return;

      // Sempre isolar os itens na troca de conta; o rascunho de cada usuario
      // permanece local, mas so e carregado apos identificar o novo perfil.
      const restaurado = contaId !== null ? readDraft(contaId) : [];
      this.contaId = contaId;
      this.geracao += 1;
      this.itens = restaurado;
      if (contaId !== null) saveDraft(this);
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
