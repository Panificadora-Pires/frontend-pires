let versao = 0;
export function getSessionVersion() { return versao; }
export function alterarVersao(valor) { versao = valor; }

export const exemplo = {
  periodo: { data_inicio: "2026-11-19", data_fim: "2026-11-19", dias: 1, fuso: "America/Sao_Paulo" },
  resumo: { total_vendido: "6.00", total_pedidos: 1, itens_vendidos: 2, ticket_medio: "6.00" },
  comparacao: {
    periodo_anterior: { data_inicio: "2026-11-18", data_fim: "2026-11-18" },
    anterior: { total_vendido: "0.00", total_pedidos: 0, itens_vendidos: 0, ticket_medio: "0.00" },
    variacao_percentual: { total_vendido: null, total_pedidos: null, itens_vendidos: null, ticket_medio: null },
  },
  serie_diaria: [{ data: "2026-11-19", total_vendido: "6.00", total_pedidos: 1, itens_vendidos: 2, ticket_medio: "6.00" }],
  formas_pagamento: [
    { forma_pagamento: "dinheiro", total_pedidos: 0, total_vendido: "0.00", percentual_pedidos: "0.0" },
    { forma_pagamento: "pix", total_pedidos: 1, total_vendido: "6.00", percentual_pedidos: "100.0" },
    { forma_pagamento: "cartao", total_pedidos: 0, total_vendido: "0.00", percentual_pedidos: "0.0" },
  ],
};
const service = {
  relatorioAnaliticoAdmin: async () => structuredClone(exemplo),
  maisVendidos: async () => ({ resultado: [{ produto_id: 1, produto_nome: "Coxinha", quantidade_vendida: 2 }] }),
};
export default service;
