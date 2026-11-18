export const session = { versao: 0 };
const service = {
  listarProdutos: async () => [], listarPromocoes: async () => [],
  relatorioVendas: async () => ({total_vendido:'0.00',total_pedidos:0}),
  maisVendidos: async () => ({resultado:[]}),
};
export function getSessionVersion() { return session.versao; }
export default service;
