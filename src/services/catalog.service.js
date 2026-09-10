import api from "@/services/api";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

function normalizarColecao(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function buscarTodasPaginas(path, params = {}) {
  const itens = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await api.get(path, {
      params: {
        ...params,
        page,
        page_size: PAGE_SIZE,
      },
    });

    const pagina = normalizarColecao(data);
    itens.push(...pagina);

    if (Array.isArray(data)) break;

    const totalPages = Number(data?.total_pages);

    if (Number.isFinite(totalPages) && totalPages > 0) {
      if (page >= totalPages) break;
      continue;
    }

    if (!data?.next || pagina.length === 0) break;
  }

  return itens;
}

export function resolverUrlMidia(valor) {
  if (!valor) return "";

  const url = String(valor).trim();
  if (!url) return "";

  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `${window.location.protocol}${url}`;

  try {
    const origemApi = new URL(api.defaults.baseURL, window.location.origin)
      .origin;
    const caminho = url.startsWith("/") ? url : `/${url}`;
    return new URL(caminho, origemApi).toString();
  } catch {
    return url;
  }
}

export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function promocaoEstaAtiva(promocao, hoje = dataLocalISO()) {
  return Boolean(
    promocao?.data_inicio &&
    promocao?.data_fim &&
    promocao.data_inicio <= hoje &&
    promocao.data_fim >= hoje,
  );
}

const catalogService = {
  listarCategoriasAtivas() {
    return buscarTodasPaginas("/categorias/", { ativa: true });
  },

  listarProdutosAtivos() {
    return buscarTodasPaginas("/produtos/", { ativo: true });
  },

  obterProduto(produtoId) {
    return api.get(`/produtos/${produtoId}/`).then(({ data }) => data);
  },

  listarPromocoes() {
    return buscarTodasPaginas("/promocoes/");
  },
};

export default catalogService;
