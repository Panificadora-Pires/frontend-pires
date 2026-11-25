import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import {
  categoriasFavoritas,
  filtrarFavoritos,
  precoProduto,
  validarAdicao,
} from "@/utils/favoritos";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

export function useColecaoFavoritos() {
  const cart = useCartStore(),
    favorites = useFavoritesStore(),
    auth = useAuthStore();
  const busca = ref(""),
    categoria = ref(""),
    ordem = ref("selecao");
  const estado = ref(null),
    titulo = ref(null);
  const categorias = computed(() => categoriasFavoritas(favorites.produtos));
  const produtosFiltrados = computed(() =>
    filtrarFavoritos(favorites.produtos, {
      busca: busca.value,
      categoria: categoria.value,
      ordem: ordem.value,
    }),
  );
  const temFiltros = computed(() =>
    Boolean(busca.value || categoria.value || ordem.value !== "selecao"),
  );
  const modalAberto = ref(false),
    carregandoDetalhe = ref(false),
    produtoDetalhado = ref(null);
  const produtoAdicionando = ref(null),
    origemAdicao = ref(null);
  const toast = ref(""),
    tipoToast = ref("sucesso");
  const adicionandoModal = computed(
    () => produtoAdicionando.value !== null && origemAdicao.value === "modal",
  );
  let montado = true,
    geracao = 0,
    requisicaoDetalhe = 0,
    toastTimer;
  let destinoModal = null,
    produtoModalId = null;
  const vistos = new Set();
  function contextoAtual(g, conta) {
    return (
      montado &&
      !favorites.suspenso &&
      geracao === g &&
      (auth.usuario?.id ?? null) === conta
    );
  }
  function mostrarToast(mensagem, tipo = "sucesso") {
    toast.value = mensagem;
    tipoToast.value = tipo;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = "";
    }, 4400);
  }
  function limparFiltros() {
    busca.value = "";
    categoria.value = "";
    ordem.value = "selecao";
  }
  async function recarregar() {
    try {
      await favorites.carregar({ force: true });
    } catch {}
  }
  function focarColecao(preferido) {
    const botao = preferido
      ? document.getElementById(`favorite-remove-${preferido}`)
      : null;
    const valido = (elemento) =>
      elemento && !elemento.disabled && !elemento.closest("[inert]");
    const primeiro = produtosFiltrados.value
      .map((p) => document.getElementById(`favorite-remove-${p.id}`))
      .find(valido);
    (valido(botao) ? botao : primeiro || estado.value || titulo.value)?.focus({
      preventScroll: true,
    });
  }
  async function alternarFavorito(produto, confirmar) {
    if (
      !auth.usuario ||
      favorites.suspenso ||
      !produto?.id ||
      favorites.estaProcessando(produto.id)
    )
      return;
    const g = geracao,
      conta = auth.usuario?.id ?? null;
    const ids = produtosFiltrados.value.map((p) => p.id),
      indice = ids.indexOf(produto.id);
    const proximo = ids[indice + 1] ?? ids[indice - 1];
    const estava = favorites.tem(produto.id);
    let resultado;
    try {
      resultado = await favorites.alternar(produto);
    } catch {
      if (contextoAtual(g, conta))
        mostrarToast(
          "Não foi possível atualizar seus favoritos. Tente novamente.",
          "erro",
        );
      return;
    }
    if (!contextoAtual(g, conta) || resultado === undefined) return;
    mostrarToast(
      `${produto.nome} ${resultado ? "adicionado aos favoritos" : "removido dos favoritos"}.`,
    );
    if (estava && !resultado) {
      if (modalAberto.value && Number(produtoModalId) === Number(produto.id)) {
        destinoModal = { id: proximo };
        fecharModal();
      } else {
        await nextTick();
        focarColecao(proximo);
      }
    }
    confirmar?.();
  }
  function detalheExibivel(detalhe) {
    if (precoProduto(detalhe) === null) return null;
    return detalhe.ativo ? detalhe : { ...detalhe, estoque: 0 };
  }
  async function abrirProduto(produto) {
    if (!auth.usuario || favorites.suspenso || !produto?.id) return;
    const requisicao = ++requisicaoDetalhe,
      g = geracao,
      conta = auth.usuario?.id ?? null;
    destinoModal = { elemento: document.activeElement, id: produto.id };
    produtoModalId = produto.id;
    modalAberto.value = true;
    carregandoDetalhe.value = true;
    produtoDetalhado.value = null;
    toast.value = "";
    try {
      const detalhe = await favorites.obterDetalhe(produto.id);
      if (
        !contextoAtual(g, conta) ||
        requisicao !== requisicaoDetalhe ||
        !modalAberto.value
      )
        return;
      if (Number(detalhe?.id) !== Number(produto.id)) return;
      favorites.atualizarProduto(detalhe);
      produtoDetalhado.value = detalheExibivel(detalhe);
    } catch {
    } finally {
      if (contextoAtual(g, conta) && requisicao === requisicaoDetalhe)
        carregandoDetalhe.value = false;
    }
  }
  async function fecharModal() {
    const destino = destinoModal;
    destinoModal = null;
    produtoModalId = null;
    requisicaoDetalhe++;
    modalAberto.value = false;
    carregandoDetalhe.value = false;
    produtoDetalhado.value = null;
    await nextTick();
    if (!montado) return;
    if (
      destino?.elemento?.isConnected &&
      !destino.elemento.disabled &&
      !destino.elemento.closest("[inert]")
    )
      destino.elemento.focus({ preventScroll: true });
    else focarColecao(destino?.id);
  }
  async function adicionar(
    produto,
    quantidade = 1,
    origem = "direta",
    elementoOrigem = null,
  ) {
    if (
      !auth.usuario ||
      favorites.suspenso ||
      !produto?.id ||
      produtoAdicionando.value !== null ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1
    )
      return;
    const g = geracao,
      conta = auth.usuario?.id ?? null,
      requisicao = requisicaoDetalhe;
    const contexto = cart.capturarContexto();
    if (!cart.contextoAtual(contexto)) return;
    produtoAdicionando.value = produto.id;
    origemAdicao.value = origem;
    const valido = () =>
      contextoAtual(g, conta) &&
      cart.contextoAtual(contexto) &&
      (origem !== "modal" ||
        (modalAberto.value && requisicao === requisicaoDetalhe));
    try {
      const detalhe = await favorites.obterDetalhe(produto.id);
      if (!valido()) return;
      const existente = cart.itens.find(
        (item) => Number(item.produto.id) === Number(produto.id),
      );
      const erro = validarAdicao(
        produto,
        detalhe,
        quantidade,
        existente?.quantidade || 0,
      );
      if (Number(detalhe?.id) === Number(produto.id))
        favorites.atualizarProduto(detalhe);
      if (origem === "modal") produtoDetalhado.value = detalheExibivel(detalhe);
      if (erro) {
        const mensagem =
          erro === "preco-alterado"
            ? "O preço mudou. Confira o valor atualizado e confirme a adição novamente."
            : erro === "estoque"
              ? "A quantidade solicitada não está disponível. Confira o estoque e o seu carrinho."
              : "Este produto está indisponível no momento.";
        mostrarToast(mensagem, "erro");
        if (erro === "preco-alterado" && origem !== "modal") {
          destinoModal = { elemento: document.activeElement, id: produto.id };
          produtoModalId = produto.id;
          requisicaoDetalhe++;
          modalAberto.value = true;
          carregandoDetalhe.value = false;
          produtoDetalhado.value = detalheExibivel(detalhe);
        }
        return;
      }
      if (existente) existente.produto = detalhe;
      if (origem === "direta") registrarOrigemVoo(elementoOrigem);
      if (!cart.adicionar(detalhe, quantidade, contexto)) return;
      mostrarToast(`${detalhe.nome} adicionado ao carrinho.`);
      if (origem === "modal") fecharModal();
    } catch {
      if (valido())
        mostrarToast(
          "Não foi possível conferir este produto. Tente novamente.",
          "erro",
        );
    } finally {
      if (contextoAtual(g, conta) && cart.contextoAtual(contexto)) {
        produtoAdicionando.value = null;
        origemAdicao.value = null;
      }
    }
  }
  function adicionarRapido(produto, origem) {
    return adicionar(produto, 1, "direta", origem);
  }
  function adicionarDoModal({ produto, quantidade }) {
    return adicionar(produto, quantidade, "modal");
  }
  watch(categorias, (lista) => {
    if (categoria.value && !lista.includes(categoria.value)) categoria.value = "";
  });
  watch(
    () => favorites.geracao,
    () => {
      geracao++;
      requisicaoDetalhe++;
      modalAberto.value = false;
      produtoDetalhado.value = null;
      carregandoDetalhe.value = false;
      produtoAdicionando.value = null;
      origemAdicao.value = null;
      destinoModal = null;
      produtoModalId = null;
      toast.value = "";
    },
    { flush: "sync" },
  );
  watch(
    () => auth.usuario?.id ?? null,
    () => {
      geracao++;
      requisicaoDetalhe++;
      modalAberto.value = false;
      produtoDetalhado.value = null;
      carregandoDetalhe.value = false;
      produtoAdicionando.value = null;
      origemAdicao.value = null;
      destinoModal = null;
      toast.value = "";
      limparFiltros();
      vistos.clear();
      favorites.sincronizarConta();
      if (auth.usuario) recarregar();
    },
    { flush: "sync" },
  );
  onMounted(recarregar);
  onBeforeUnmount(() => {
    montado = false;
    geracao++;
    requisicaoDetalhe++;
    clearTimeout(toastTimer);
  });

  return {
    busca,
    categoria,
    ordem,
    estado,
    titulo,
    categorias,
    produtosFiltrados,
    temFiltros,
    modalAberto,
    carregandoDetalhe,
    produtoDetalhado,
    produtoAdicionando,
    toast,
    tipoToast,
    adicionandoModal,
    vistos,
    limparFiltros,
    recarregar,
    alternarFavorito,
    abrirProduto,
    fecharModal,
    adicionarRapido,
    adicionarDoModal,
  };
}
