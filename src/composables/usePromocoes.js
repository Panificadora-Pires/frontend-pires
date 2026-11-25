import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";

import { useAutoRefresh } from "@/composables/useAutoRefresh";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { dataDaPires, selecionarOfertas } from "@/utils/promocoes";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

export function usePromocoes() {
  const cart = useCartStore(),
    favorites = useFavoritesStore();
  const produtos = ref([]),
    promocoes = ref([]),
    hoje = ref(dataDaPires());
  const busca = ref(""),
    categoriaAtiva = ref(null),
    ordenacao = ref("desconto");
  const carregando = ref(true),
    erro = ref(false),
    falhaAtualizacao = ref(false);
  const produtoAdicionando = ref(null),
    origemAdicao = ref(null);
  const modalAberto = ref(false),
    carregandoDetalhe = ref(false),
    produtoDetalhado = ref(null);
  const adicionandoModal = computed(() => origemAdicao.value === "modal");
  const toast = ref("");
  let toastTimer,
    montado = true,
    carregou = false,
    requisicaoDetalhe = 0,
    observer;
  const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
  watch(
    () => cart.geracao,
    () => {
      fecharModal();
      produtoAdicionando.value = null;
      origemAdicao.value = null;
      toast.value = "";
      clearTimeout(toastTimer);
    },
    { flush: "sync" },
  );
  const trilha = useTemplateRef("trilha");
  const indicador = ref({ width: "0px", transform: "translateX(0px)" });
  const promocoesAtivas = computed(() =>
    selecionarOfertas(produtos.value, promocoes.value, hoje.value),
  );
  const categoriasPromocionais = computed(() =>
    [
      ...new Map(
        promocoesAtivas.value.map(({ produto }) => [
          produto.categoria,
          { id: produto.categoria, nome: produto.categoria_nome || "Categoria" },
        ]),
      ).values(),
    ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  );
  const normalizar = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  const promocoesFiltradas = computed(() => {
    const termo = normalizar(busca.value);
    const lista = promocoesAtivas.value.filter(
      ({ produto }) =>
        (categoriaAtiva.value === null ||
          produto.categoria === categoriaAtiva.value) &&
        normalizar(`${produto.nome} ${produto.categoria_nome}`).includes(termo),
    );
    const porNome = (a, b) =>
      a.produto.nome.localeCompare(b.produto.nome, "pt-BR");
    return lista.sort((a, b) => {
      if (ordenacao.value === "nome") return porNome(a, b);
      if (ordenacao.value === "menor-preco")
        return (
          Number(a.produto.preco_atual) - Number(b.produto.preco_atual) ||
          porNome(a, b)
        );
      if (ordenacao.value === "termina-primeiro")
        return (
          a.promocao.data_fim.localeCompare(b.promocao.data_fim) || porNome(a, b)
        );
      return b.desconto - a.desconto || porNome(a, b);
    });
  });
  const destaque = computed(() => promocoesFiltradas.value[0]);
  const demais = computed(() => promocoesFiltradas.value.slice(1));
  const assinatura = computed(() =>
    promocoesFiltradas.value.map((item) => item.produto.id).join("-"),
  );
  const temFiltros = computed(() =>
    Boolean(
      busca.value ||
      categoriaAtiva.value !== null ||
      ordenacao.value !== "desconto",
    ),
  );
  const maiorDesconto = computed(() =>
    Math.max(0, ...promocoesAtivas.value.map((item) => item.desconto)),
  );
  const textoContagem = computed(
    () =>
      `${promocoesFiltradas.value.length} ${promocoesFiltradas.value.length === 1 ? "oferta" : "ofertas"}`,
  );

  async function alinharIndicador() {
    await nextTick();
    if (!montado) return;
    const ativo = trilha.value?.querySelector('[aria-pressed="true"]');
    if (!ativo) return;
    indicador.value = {
      width: `${ativo.offsetWidth}px`,
      transform: `translateX(${ativo.offsetLeft}px)`,
    };
    const inicio = ativo.offsetLeft;
    if (
      inicio < trilha.value.scrollLeft ||
      inicio + ativo.offsetWidth >
        trilha.value.scrollLeft + trilha.value.clientWidth
    ) {
      trilha.value.scrollTo({
        left: inicio - (trilha.value.clientWidth - ativo.offsetWidth) / 2,
        behavior: movimentoReduzido() ? "instant" : "smooth",
      });
    }
  }
  watch([categoriaAtiva, categoriasPromocionais], () => {
    if (
      categoriaAtiva.value !== null &&
      !categoriasPromocionais.value.some((c) => c.id === categoriaAtiva.value)
    )
      categoriaAtiva.value = null;
    alinharIndicador();
  });
  async function carregarDados() {
    hoje.value = dataDaPires();
    if (!carregou) {
      carregando.value = true;
      erro.value = false;
    }
    try {
      const [lista, ofertas] = await Promise.all([
        catalogService.listarProdutosAtivos(),
        catalogService.listarPromocoes(),
      ]);
      if (!montado) return;
      produtos.value = lista;
      promocoes.value = ofertas;
      carregou = true;
      erro.value = false;
      falhaAtualizacao.value = false;
    } catch {
      if (!carregou) erro.value = true;
      else falhaAtualizacao.value = true;
    } finally {
      carregando.value = false;
    }
  }
  const { atualizarAgora } = useAutoRefresh(carregarDados, { intervalo: 60_000 });
  async function abrirProduto(produto) {
    const pedido = ++requisicaoDetalhe;
    const contexto = cart.capturarContexto();
    toast.value = "";
    modalAberto.value = true;
    carregandoDetalhe.value = true;
    produtoDetalhado.value = null;
    try {
      const detalhe = await catalogService.obterProduto(produto.id);
      if (contextoAtual(contexto) && pedido === requisicaoDetalhe)
        produtoDetalhado.value = detalhe;
    } catch {
    } finally {
      if (contextoAtual(contexto) && pedido === requisicaoDetalhe)
        carregandoDetalhe.value = false;
    }
  }
  function fecharModal() {
    requisicaoDetalhe++;
    modalAberto.value = false;
    produtoDetalhado.value = null;
    carregandoDetalhe.value = false;
  }
  async function alternarFavorito(produto) {
    const estava = favorites.tem(produto.id);
    try {
      await favorites.alternar(produto);
      if (montado)
        mostrarToast(
          `${produto.nome} ${estava ? "removido dos favoritos" : "adicionado aos favoritos"}.`,
        );
    } catch {
      if (montado) mostrarToast("Não foi possível atualizar seus favoritos.");
    }
  }
  async function adicionar(produto, quantidade = 1, origem = "direta") {
    if (
      produtoAdicionando.value !== null ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1
    )
      return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;
    produtoAdicionando.value = produto.id;
    origemAdicao.value = origem;
    try {
      const detalhe = await catalogService.obterProduto(produto.id);
      if (!contextoAtual(contexto)) return;
      if (origem === "modal" && produtoDetalhado.value?.id === produto.id)
        produtoDetalhado.value = detalhe;
      if (
        !detalhe.ativo ||
        !detalhe.em_promocao ||
        Number(detalhe.preco_atual) !== Number(produto.preco_atual)
      ) {
        mostrarToast(
          "Esta oferta mudou. Confira o preço e a disponibilidade antes de adicionar.",
        );
        await carregarDados();
        return;
      }
      const estoque = Number(detalhe.estoque || 0);
      const existente = cart.itens.find((item) => item.produto.id === detalhe.id);
      if (estoque <= 0) {
        mostrarToast(`${produto.nome} está sem estoque no momento.`);
        return;
      }
      if ((existente?.quantidade || 0) + quantidade > estoque) {
        mostrarToast(
          `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"} de ${produto.nome}.`,
        );
        return;
      }
      if (existente) existente.produto = detalhe;
      if (!cart.adicionar(detalhe, quantidade, contexto)) return;
      mostrarToast(`${produto.nome} adicionado ao carrinho.`);
      if (origem === "modal" && produtoDetalhado.value?.id === produto.id)
        fecharModal();
    } catch {
      if (contextoAtual(contexto))
        mostrarToast("Não foi possível verificar a disponibilidade do produto.");
    } finally {
      if (contextoAtual(contexto)) {
        produtoAdicionando.value = null;
        origemAdicao.value = null;
      }
    }
  }
  function adicionarDoModal({ produto, quantidade }) {
    return adicionar(produto, quantidade, "modal");
  }
  function limparFiltros() {
    busca.value = "";
    categoriaAtiva.value = null;
    ordenacao.value = "desconto";
  }
  function mostrarToast(mensagem) {
    toast.value = mensagem;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = ""), 3800);
  }
  onMounted(() => {
    favorites.carregar().catch(() => {});
    observer = new ResizeObserver(alinharIndicador);
    observer.observe(trilha.value);
    document.fonts.ready.then(alinharIndicador);
  });
  onBeforeUnmount(() => {
    montado = false;
    requisicaoDetalhe++;
    clearTimeout(toastTimer);
    observer?.disconnect();
  });

  return {
    produtos,
    busca,
    categoriaAtiva,
    ordenacao,
    carregando,
    erro,
    falhaAtualizacao,
    produtoAdicionando,
    modalAberto,
    carregandoDetalhe,
    produtoDetalhado,
    adicionandoModal,
    toast,
    indicador,
    promocoesAtivas,
    categoriasPromocionais,
    promocoesFiltradas,
    destaque,
    demais,
    assinatura,
    temFiltros,
    maiorDesconto,
    textoContagem,
    atualizarAgora,
    abrirProduto,
    fecharModal,
    alternarFavorito,
    adicionar,
    adicionarDoModal,
    limparFiltros,
  };
}
