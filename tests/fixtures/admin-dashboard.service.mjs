export const session = { versao: 0 };

function somarDias(dia, quantidade) {
  const data = new Date(dia + "T12:00:00Z");
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

export function relatorioSemanaVazio({ dataInicio, dataFim }) {
  const dias = Math.round((Date.parse(dataFim + "T12:00:00Z") - Date.parse(dataInicio + "T12:00:00Z")) / 86400000) + 1;
  const resumo = () => ({ total_vendido: "0.00", total_pedidos: 0, itens_vendidos: 0, ticket_medio: "0.00" });
  return {
    periodo: { data_inicio: dataInicio, data_fim: dataFim, dias, fuso: "America/Sao_Paulo" },
    resumo: resumo(),
    comparacao: {
      anterior: resumo(),
      periodo_anterior: {
        data_inicio: somarDias(dataInicio, -dias),
        data_fim: somarDias(dataInicio, -1),
      },
      variacao_percentual: { total_vendido: null, total_pedidos: null, itens_vendidos: null, ticket_medio: null },
    },
    serie_diaria: Array.from({ length: dias }, (_, indice) => ({ data: somarDias(dataInicio, indice), ...resumo() })),
    formas_pagamento: ["dinheiro", "pix", "cartao"].map(forma_pagamento => ({
      forma_pagamento, total_pedidos: 0, total_vendido: "0.00", percentual_pedidos: "0.0",
    })),
  };
}

const service = {
  resumoProdutosAdmin: async () => ({total:0,ativos:0,sem_estoque:0,reposicao:0,em_promocao:0}),
  resumoPromocoesAdmin: async () => ({total:0,ativas:0}),
  relatorioVendas: async () => ({ total_vendido: "0.00", total_pedidos: 0 }),
  maisVendidos: async () => ({ resultado: [] }),
  listarPedidosPagina: async () => ({
    count: 0, page: 1, page_size: 4, total_pages: 1,
    next: null, previous: null, results: [],
  }),
  relatorioAnaliticoAdmin: async periodo => relatorioSemanaVazio(periodo),
};
export function getSessionVersion() { return session.versao; }
export default service;
