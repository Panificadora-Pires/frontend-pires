import api from "./api";

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

function normalizarColecao(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function extrairProximaPagina(data, paginaAtual) {
  if (!data || Array.isArray(data) || !data.next) return null;

  try {
    const url = new URL(data.next, window.location.origin);
    const pagina = Number(url.searchParams.get("page"));
    return Number.isFinite(pagina) && pagina > paginaAtual
      ? pagina
      : paginaAtual + 1;
  } catch {
    return paginaAtual + 1;
  }
}

async function listar(params = {}) {
  const acumulado = [];
  let pagina = 1;

  while (pagina <= MAX_PAGES) {
    const { data } = await api.get("/pedidos/", {
      params: {
        ...params,
        page: pagina,
        page_size: PAGE_SIZE,
      },
    });

    acumulado.push(...normalizarColecao(data));

    const proximaPagina = extrairProximaPagina(data, pagina);
    if (!proximaPagina) break;

    pagina = proximaPagina;
  }

  return acumulado;
}

async function criar(itensCriacao) {
  return api.post("/pedidos/", {
    itens_criacao: itensCriacao,
  });
}

async function obter(id) {
  return api.get(`/pedidos/${id}/`);
}

async function obterQRCode(id) {
  return api.get(`/pedidos/${id}/qrcode/`);
}

export default {
  listar,
  criar,
  obter,
  obterQRCode,
};
