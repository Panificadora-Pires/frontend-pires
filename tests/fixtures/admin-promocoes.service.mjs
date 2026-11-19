export let version = 0;
const service = {
  listarPromocoesAdminPagina: async () => ({
    count: 0, page: 1, page_size: 12, total_pages: 1,
    previous: null, next: null, results: [],
  }),
  resumoPromocoesGestao: async () => ({
    total: 0, ativas: 0, agendadas: 0, encerradas: 0,
  }),

  atualizarPromocao: async () => ({}),
  criarPromocao: async () => ({}),
  excluirPromocao: async () => ({}),
  listarProdutosAdminPagina: async () => ({ count: 0, results: [] }),
  obterProdutoAdmin: async () => ({}),
};
export function getSessionVersion() { return version; }
export function alterarVersao(v) { version = v; }
export default service;
