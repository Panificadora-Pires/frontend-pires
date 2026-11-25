import { computed, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { normalizarTexto } from "@/utils/favoritos";

const PRODUTOS_POR_PAGINA = 8;

function textoDaUrl(valor) {
  return typeof valor === "string" ? valor : "";
}

function categoriaDaUrl(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function paginaDaUrl(valor) {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) return 1;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : 1;
}

function precoProduto(produto) {
  return Number(produto?.preco_atual ?? produto?.preco ?? 0);
}

export function useFiltrosCardapio({
  produtos,
  categorias,
  carregando,
  erro,
  tituloProdutos,
}) {
  const route = useRoute();
  const router = useRouter();

  function atualizarFiltros(alteracoes, substituir = false) {
    const query = { ...route.query, ...alteracoes };
    delete query.pagina;
    for (const chave of Object.keys(query)) {
      if (
        query[chave] === undefined ||
        query[chave] === null ||
        query[chave] === ""
      )
        delete query[chave];
    }
    return substituir ? router.replace({ query }) : router.push({ query });
  }

  const busca = computed({
    get: () => textoDaUrl(route.query.busca),
    set: (valor) => atualizarFiltros({ busca: valor.trim() }, true),
  });
  const categoriaAtiva = computed({
    get: () => categoriaDaUrl(route.query.categoria),
    set: (valor) =>
      atualizarFiltros({ categoria: valor ? String(valor) : undefined }),
  });
  const filtroRapido = computed({
    get: () =>
      ["promocao", "destaque"].includes(route.query.filtro)
        ? route.query.filtro
        : "todos",
    set: (valor) =>
      atualizarFiltros({ filtro: valor === "todos" ? undefined : valor }),
  });
  const ordenacao = computed({
    get: () =>
      ["nome", "menor-preco", "maior-preco"].includes(route.query.ordenacao)
        ? route.query.ordenacao
        : "relevancia",
    set: (valor) =>
      atualizarFiltros({
        ordenacao: valor === "relevancia" ? undefined : valor,
      }),
  });

  const temFiltros = computed(() =>
    Boolean(
      busca.value.trim() ||
      categoriaAtiva.value !== null ||
      filtroRapido.value !== "todos" ||
      ordenacao.value !== "relevancia",
    ),
  );

  const produtosFiltrados = computed(() => {
    let lista = [...produtos.value];

    if (categoriaAtiva.value !== null) {
      lista = lista.filter(
        (produto) => produto.categoria === categoriaAtiva.value,
      );
    }

    if (filtroRapido.value === "promocao") {
      lista = lista.filter((produto) => produto.em_promocao);
    } else if (filtroRapido.value === "destaque") {
      lista = lista.filter((produto) => produto.destaque);
    }

    const termo = normalizarTexto(busca.value);
    if (termo) {
      lista = lista.filter((produto) => {
        const alvo = normalizarTexto(
          `${produto.nome || ""} ${produto.categoria_nome || ""}`,
        );
        return alvo.includes(termo);
      });
    }

    if (ordenacao.value === "nome") {
      lista.sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
      );
    } else if (ordenacao.value === "menor-preco") {
      lista.sort((a, b) => precoProduto(a) - precoProduto(b));
    } else if (ordenacao.value === "maior-preco") {
      lista.sort((a, b) => precoProduto(b) - precoProduto(a));
    } else {
      lista.sort((a, b) => {
        const scoreA =
          Number(Boolean(a.destaque)) * 2 + Number(Boolean(a.em_promocao));
        const scoreB =
          Number(Boolean(b.destaque)) * 2 + Number(Boolean(b.em_promocao));
        if (scoreA !== scoreB) return scoreB - scoreA;
        return String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-BR",
        );
      });
    }

    return lista;
  });

  const totalPaginas = computed(() =>
    Math.max(
      1,
      Math.ceil(produtosFiltrados.value.length / PRODUTOS_POR_PAGINA),
    ),
  );
  const paginaAtual = computed(() =>
    Math.min(paginaDaUrl(route.query.pagina), totalPaginas.value),
  );
  const inicioPagina = computed(
    () => (paginaAtual.value - 1) * PRODUTOS_POR_PAGINA,
  );
  const produtosPagina = computed(() =>
    produtosFiltrados.value.slice(
      inicioPagina.value,
      inicioPagina.value + PRODUTOS_POR_PAGINA,
    ),
  );
  const resumoPagina = computed(
    () =>
      `${inicioPagina.value + 1}–${Math.min(inicioPagina.value + PRODUTOS_POR_PAGINA, produtosFiltrados.value.length)} de ${produtosFiltrados.value.length}`,
  );

  watch(
    [() => route.query.pagina, totalPaginas, carregando, erro],
    () => {
      if (carregando.value || erro.value || route.query.pagina === undefined)
        return;
      const canonica =
        paginaAtual.value > 1 ? String(paginaAtual.value) : undefined;
      if (route.query.pagina === canonica) return;
      const query = { ...route.query };
      if (canonica) query.pagina = canonica;
      else delete query.pagina;
      router.replace({ query });
    },
    { immediate: true },
  );

  async function mudarPagina(numero) {
    if (
      numero < 1 ||
      numero > totalPaginas.value ||
      numero === paginaAtual.value
    )
      return;
    tituloProdutos.value?.scrollIntoView({
      block: "start",
      behavior: "instant",
    });
    const query = { ...route.query };
    if (numero > 1) query.pagina = String(numero);
    else delete query.pagina;
    await router.push({ query });
    await nextTick();
    tituloProdutos.value?.focus({ preventScroll: true });
  }

  const tituloResultados = computed(() => {
    const categoria = categorias.value.find(
      (item) => item.id === categoriaAtiva.value,
    );

    if (busca.value.trim()) return `Resultados para “${busca.value.trim()}”`;
    if (filtroRapido.value === "promocao") return "Produtos em promoção";
    if (filtroRapido.value === "destaque") return "Destaques da Pires";
    if (categoria) return categoria.nome;
    return "Todos os produtos";
  });

  const textoContagem = computed(() => {
    const total = produtosFiltrados.value.length;
    if (!total) return "";
    return `${total} ${total === 1 ? "produto" : "produtos"}`;
  });

  function limparFiltros() {
    atualizarFiltros(
      {
        busca: undefined,
        categoria: undefined,
        filtro: undefined,
        ordenacao: undefined,
      },
      true,
    );
  }

  return {
    busca,
    categoriaAtiva,
    filtroRapido,
    ordenacao,
    temFiltros,
    produtosFiltrados,
    totalPaginas,
    paginaAtual,
    produtosPagina,
    resumoPagina,
    mudarPagina,
    tituloResultados,
    textoContagem,
    limparFiltros,
  };
}
