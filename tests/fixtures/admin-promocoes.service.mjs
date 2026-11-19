export let version = 0;
const service = {
  listarPromocoes: async () => [],
  atualizarPromocao: async () => ({}),
  criarPromocao: async () => ({}),
  excluirPromocao: async () => ({}),
  listarProdutosAdminPagina: async () => ({ count: 0, results: [] }),
  obterProdutoAdmin: async () => ({}),
};
export function getSessionVersion() { return version; }
export function alterarVersao(v) { version = v; }
export default service;
