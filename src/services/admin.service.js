import api from "./api";

const PAGE_SIZE = 100;
const MAX_PAGES = 30;

function normalizarColecao(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function listarTodasPaginas(path, params = {}) {
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
    if (!data?.next || pagina.length === 0) break;
  }

  return itens;
}

function produtoFormData(payload) {
  const form = new FormData();

  const campos = [
    "nome",
    "descricao",
    "categoria",
    "unidade_medida",
    "preco",
    "preco_custo",
    "estoque",
    "estoque_minimo",
    "destaque",
    "ativo",
  ];

  for (const campo of campos) {
    const valor = payload[campo];
    if (valor === undefined || valor === null || valor === "") continue;
    form.append(campo, typeof valor === "boolean" ? String(valor) : valor);
  }

  if (payload.imagem instanceof File) {
    form.append("imagem", payload.imagem);
  }

  return form;
}

const adminService = {
  listarPedidos(params = {}) {
    return listarTodasPaginas("/pedidos/", params);
  },

  obterPedido(id) {
    return api.get(`/pedidos/${id}/`).then(({ data }) => data);
  },

  alterarStatusPedido(id, status) {
    return api
      .patch(`/pedidos/${id}/alterar_status/`, { status })
      .then(({ data }) => data);
  },

  retirarViaQRCode(codigoRetirada) {
    return api
      .post("/pedidos/retirar_via_qrcode/", {
        codigo_retirada: codigoRetirada,
      })
      .then(({ data }) => data);
  },

  relatorioVendas({ dataInicio, dataFim }) {
    return api
      .get("/pedidos/relatorio_vendas/", {
        params: {
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
      })
      .then(({ data }) => data);
  },

  listarProdutos(params = {}) {
    return listarTodasPaginas("/produtos/", params);
  },

  obterProduto(id) {
    return api.get(`/produtos/${id}/`).then(({ data }) => data);
  },

  criarProduto(payload) {
    return api
      .post("/produtos/", produtoFormData(payload))
      .then(({ data }) => data);
  },

  atualizarProduto(id, payload) {
    return api
      .patch(`/produtos/${id}/`, produtoFormData(payload))
      .then(({ data }) => data);
  },

  maisVendidos({ dataInicio, dataFim, limite = 10 } = {}) {
    return api
      .get("/produtos/mais_vendidos/", {
        params: {
          data_inicio: dataInicio || undefined,
          data_fim: dataFim || undefined,
          limite,
        },
      })
      .then(({ data }) => data);
  },

  listarCategorias(params = {}) {
    return listarTodasPaginas("/categorias/", params);
  },

  criarCategoria(payload) {
    return api.post("/categorias/", payload).then(({ data }) => data);
  },

  atualizarCategoria(id, payload) {
    return api.patch(`/categorias/${id}/`, payload).then(({ data }) => data);
  },

  listarPromocoes(params = {}) {
    return listarTodasPaginas("/promocoes/", params);
  },

  criarPromocao(payload) {
    return api.post("/promocoes/", payload).then(({ data }) => data);
  },

  atualizarPromocao(id, payload) {
    return api.patch(`/promocoes/${id}/`, payload).then(({ data }) => data);
  },

  excluirPromocao(id) {
    return api.delete(`/promocoes/${id}/`);
  },

  listarUsuarios(params = {}) {
    return listarTodasPaginas("/usuarios/", params);
  },
};

export default adminService;
