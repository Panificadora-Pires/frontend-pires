import { onBeforeUnmount, ref, watch } from "vue";

import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";

export function useCompraCatalogo({ duracaoToast }) {
  const cart = useCartStore();
  const favorites = useFavoritesStore();

  const modalAberto = ref(false);
  const carregandoDetalhe = ref(false);
  const produtoDetalhado = ref(null);
  const produtoAdicionando = ref(null);
  const adicionandoModal = ref(false);
  const toast = ref("");
  const detalhesCache = new Map();
  let toastTimer = null;
  let montado = true;
  const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);

  watch(
    () => cart.geracao,
    () => {
      fecharModal();
      carregandoDetalhe.value = false;
      produtoAdicionando.value = null;
      adicionandoModal.value = false;
      toast.value = "";
      detalhesCache.clear();
      window.clearTimeout(toastTimer);
    },
    { flush: "sync" },
  );

  function mostrarToast(mensagem) {
    toast.value = mensagem;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.value = "";
    }, duracaoToast);
  }

  function limparDetalhes() {
    detalhesCache.clear();
  }

  async function alternarFavorito(produto) {
    if (!produto?.id) return;
    const estavaFavoritado = favorites.tem(produto.id);

    try {
      await favorites.alternar(produto);
      mostrarToast(
        estavaFavoritado
          ? `${produto.nome} removido dos favoritos.`
          : `${produto.nome} adicionado aos favoritos.`,
      );
    } catch {
      mostrarToast("Não foi possível atualizar seus favoritos.");
    }
  }

  async function obterDetalhes(produto) {
    if (!produto?.id) return null;
    if (detalhesCache.has(produto.id)) return detalhesCache.get(produto.id);

    const contexto = cart.capturarContexto();
    const detalhe = await catalogService.obterProduto(produto.id);
    if (contextoAtual(contexto)) detalhesCache.set(produto.id, detalhe);
    return detalhe;
  }

  async function abrirProduto(produto) {
    if (!produto?.id) return;
    const contexto = cart.capturarContexto();
    toast.value = "";
    modalAberto.value = true;
    carregandoDetalhe.value = true;
    produtoDetalhado.value = null;

    try {
      const detalhe = await obterDetalhes(produto);
      if (contextoAtual(contexto)) produtoDetalhado.value = detalhe;
    } catch {
      if (contextoAtual(contexto)) produtoDetalhado.value = null;
    } finally {
      if (contextoAtual(contexto)) carregandoDetalhe.value = false;
    }
  }

  function fecharModal() {
    modalAberto.value = false;
    produtoDetalhado.value = null;
  }

  async function adicionarRapido(produto) {
    if (!produto?.id || produtoAdicionando.value) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;
    produtoAdicionando.value = produto.id;

    try {
      const detalhe = await obterDetalhes(produto);
      if (!contextoAtual(contexto)) return;
      const estoque = Number(detalhe?.estoque ?? 0);

      if (estoque <= 0) {
        mostrarToast(`${produto.nome} está sem estoque no momento.`);
        return;
      }

      const itemAtual = cart.itens.find(
        (item) => item.produto.id === produto.id,
      );
      if ((itemAtual?.quantidade || 0) >= estoque) {
        mostrarToast(
          `Você já adicionou todo o estoque disponível de ${produto.nome}.`,
        );
        return;
      }

      if (!cart.adicionar({ ...produto, ...detalhe }, 1, contexto)) return;
      mostrarToast(`${produto.nome} adicionado ao carrinho.`);
    } catch {
      if (contextoAtual(contexto))
        mostrarToast("Não foi possível verificar a disponibilidade do produto.");
    } finally {
      if (contextoAtual(contexto)) produtoAdicionando.value = null;
    }
  }

  async function adicionarDoModal({ produto, quantidade }) {
    if (!produto || adicionandoModal.value) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;
    adicionandoModal.value = true;

    try {
      const estoque = Number(produto.estoque || 0);
      const itemAtual = cart.itens.find(
        (item) => item.produto.id === produto.id,
      );
      const novaQuantidade = (itemAtual?.quantidade || 0) + quantidade;

      if (novaQuantidade > estoque) {
        mostrarToast(
          `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}.`,
        );
        return;
      }

      if (!cart.adicionar(produto, quantidade, contexto)) return;
      mostrarToast(`${produto.nome} adicionado ao carrinho.`);
      fecharModal();
    } finally {
      adicionandoModal.value = false;
    }
  }

  onBeforeUnmount(() => {
    montado = false;
    window.clearTimeout(toastTimer);
  });

  return {
    modalAberto,
    carregandoDetalhe,
    produtoDetalhado,
    produtoAdicionando,
    adicionandoModal,
    toast,
    mostrarToast,
    limparDetalhes,
    alternarFavorito,
    abrirProduto,
    fecharModal,
    adicionarRapido,
    adicionarDoModal,
  };
}
