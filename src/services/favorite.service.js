import api from "@/services/api";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

function normalizarColecao(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function listarTodos() {
  const itens = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await api.get("/favoritos/", {
      params: {
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

const favoriteService = {
  listar: listarTodos,

  adicionar(produtoId) {
    return api.post("/favoritos/", {
      produto: produtoId,
    });
  },

  remover(produtoId) {
    return api.delete(`/favoritos/${produtoId}/`);
  },
};

export default favoriteService;
