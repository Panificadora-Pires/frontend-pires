import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";

export function useCarrinho() {
  const cart = useCartStore();
  const router = useRouter();

  const estoques = ref({});
  const ativos = ref({});
  const sincronizando = ref(false);
  const finalizando = ref(false);
  const erroFinalizar = ref("");
  const toast = ref("");
  const dialogoLimpezaRef = ref(null);
  const botaoLimparRef = ref(null);
  const botaoCancelarLimpezaRef = ref(null);
  const focarAoEsvaziar = ref(false);
  let toastTimer = null;
  let montado = true;
  const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
  watch(
    () => cart.geracao,
    () => {
      estoques.value = {};
      ativos.value = {};
      sincronizando.value = false;
      finalizando.value = false;
      erroFinalizar.value = "";
      toast.value = "";
      focarAoEsvaziar.value = false;
      if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
      window.clearTimeout(toastTimer);
    },
    { flush: "sync" },
  );

  const temProblemas = computed(() =>
    cart.itens.some((item) => Boolean(problemaItem(item))),
  );

  function formatarPreco(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }

  function precoUnitario(item) {
    return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0);
  }

  function estoqueConhecido(item) {
    return (
      Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id) ||
      item?.produto?.estoque !== undefined
    );
  }

  function estoqueDisponivel(item) {
    if (Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id))
      return Number(estoques.value[item.produto.id] || 0);
    if (item.produto.estoque !== undefined)
      return Number(item.produto.estoque || 0);
    return 0;
  }

  function problemaItem(item) {
    const id = item.produto.id;

    if (ativos.value[id] === false) {
      return "Este produto não está mais disponível para venda.";
    }

    if (!estoqueConhecido(item)) return "";

    const estoque = estoqueDisponivel(item);
    if (estoque <= 0) return "Produto sem estoque no momento.";
    if (item.quantidade > estoque) {
      return `A quantidade escolhida excede o estoque atual (${estoque}).`;
    }

    return "";
  }

  function podeAumentar(item) {
    if (!estoqueConhecido(item)) return false;
    return (
      estoqueDisponivel(item) > item.quantidade &&
      ativos.value[item.produto.id] !== false
    );
  }

  function alterarQuantidade(item, quantidade) {
    const estoque = estoqueDisponivel(item);

    if (quantidade > estoque && estoqueConhecido(item)) {
      mostrarToast(
        `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}.`,
      );
      return;
    }

    cart.alterarQuantidade(item.produto.id, quantidade);
    erroFinalizar.value = "";
  }

  function removerItem(produtoId) {
    cart.removerItem(produtoId);
    delete estoques.value[produtoId];
    delete ativos.value[produtoId];
    estoques.value = { ...estoques.value };
    ativos.value = { ...ativos.value };
    erroFinalizar.value = "";
    mostrarToast("Produto removido do carrinho.");
  }

  function abrirConfirmacaoLimpeza() {
    if (finalizando.value || cart.vazio || dialogoLimpezaRef.value?.open) return;
    dialogoLimpezaRef.value?.showModal();
    nextTick(() => botaoCancelarLimpezaRef.value?.focus());
  }

  function fecharConfirmacaoLimpeza() {
    dialogoLimpezaRef.value?.close();
  }

  function restaurarFocoLimpeza() {
    if (focarAoEsvaziar.value) return;
    nextTick(() => botaoLimparRef.value?.focus());
  }

  function focarVazioAposTransicao() {
    if (!focarAoEsvaziar.value || !cart.vazio) return;
    focarAoEsvaziar.value = false;
    document.querySelector(".cart-page__primary-link")?.focus();
  }

  function confirmarLimpezaCarrinho() {
    if (finalizando.value) return;
    focarAoEsvaziar.value = true;
    dialogoLimpezaRef.value?.close();
    cart.limpar();
    estoques.value = {};
    ativos.value = {};
    erroFinalizar.value = "";
  }

  async function sincronizarCarrinho({ silencioso = false } = {}) {
    if (cart.vazio || sincronizando.value) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;

    sincronizando.value = true;
    if (!silencioso) erroFinalizar.value = "";

    const itensSnapshot = [...cart.itens];
    const resultados = await Promise.allSettled(
      itensSnapshot.map(async (item) => {
        const detalhe = await catalogService.obterProduto(item.produto.id);
        return { id: item.produto.id, detalhe };
      }),
    );

    if (!contextoAtual(contexto)) return;

    const novosEstoques = { ...estoques.value };
    const novosAtivos = { ...ativos.value };
    let falhas = 0;

    resultados.forEach((resultado, index) => {
      const itemOriginal = itensSnapshot[index];
      const id = itemOriginal.produto.id;

      if (resultado.status === "fulfilled") {
        const detalhe = resultado.value.detalhe;
        novosEstoques[id] = Number(detalhe?.estoque ?? 0);
        novosAtivos[id] = detalhe?.ativo !== false;

        const itemAtual = cart.itens.find((item) => item.produto.id === id);
        if (itemAtual) {
          itemAtual.produto = {
            ...itemAtual.produto,
            ...detalhe,
          };
        }
      } else {
        falhas += 1;
        novosAtivos[id] = false;
      }
    });

    estoques.value = novosEstoques;
    ativos.value = novosAtivos;
    cart.atualizarRascunho();
    sincronizando.value = false;

    if (falhas && !silencioso) {
      erroFinalizar.value =
        "Não foi possível atualizar todos os produtos do carrinho.";
    }
  }

  async function finalizarPedido() {
    if (cart.vazio || finalizando.value) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;

    finalizando.value = true;
    erroFinalizar.value = "";

    try {
      await sincronizarCarrinho({ silencioso: true });
      if (!contextoAtual(contexto) || cart.vazio) return;

      if (temProblemas.value) {
        erroFinalizar.value = "Revise os itens destacados antes de continuar.";
        return;
      }

      await router.push({ name: "checkout" });
    } catch (error) {
      if (contextoAtual(contexto))
        erroFinalizar.value = mensagemErroPedido(error);
    } finally {
      if (contextoAtual(contexto)) finalizando.value = false;
    }
  }

  function mensagemErroPedido(error) {
    const data = error?.response?.data;

    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.itens_criacao === "string") return data.itens_criacao;
    if (Array.isArray(data?.itens_criacao)) return data.itens_criacao.join(" ");

    if (data && typeof data === "object") {
      const primeiraMensagem = Object.values(data)
        .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
        .find((valor) => typeof valor === "string");

      if (primeiraMensagem) return primeiraMensagem;
    }

    return "Não foi possível confirmar o pedido. Verifique sua conexão e tente novamente.";
  }

  function mostrarToast(mensagem) {
    toast.value = mensagem;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.value = "";
    }, 2200);
  }

  onMounted(() => {
    const contexto = cart.capturarContexto();
    sincronizarCarrinho().catch(() => {
      if (!contextoAtual(contexto)) return;
      erroFinalizar.value =
        "Não foi possível atualizar a disponibilidade dos produtos.";
      sincronizando.value = false;
    });
  });

  onBeforeUnmount(() => {
    montado = false;
    window.clearTimeout(toastTimer);
    if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
  });

  return {
    abrirConfirmacaoLimpeza,
    alterarQuantidade,
    botaoCancelarLimpezaRef,
    botaoLimparRef,
    cart,
    confirmarLimpezaCarrinho,
    dialogoLimpezaRef,
    erroFinalizar,
    estoqueConhecido,
    estoqueDisponivel,
    fecharConfirmacaoLimpeza,
    finalizando,
    finalizarPedido,
    focarVazioAposTransicao,
    formatarPreco,
    podeAumentar,
    precoUnitario,
    problemaItem,
    removerItem,
    restaurarFocoLimpeza,
    sincronizando,
    temProblemas,
    toast,
  };
}
