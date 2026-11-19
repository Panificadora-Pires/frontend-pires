const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function diaEmSaoPaulo(valor) {
  if (valor == null || valor === '') return null;
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return null;
  const partes = Object.fromEntries(formatoDia.formatToParts(data).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export function serieRetiradas(pedidos, hoje) {
  const pontos = Array.from({ length: 7 }, (_, index) => {
    const data = new Date(`${hoje}T12:00:00Z`);
    data.setUTCDate(data.getUTCDate() - 6 + index);
    const dia = data.toISOString().slice(0, 10);
    return { dia, label: `${dia.slice(8, 10)}/${dia.slice(5, 7)}`, value: 0 };
  });
  const centavos = new Map(pontos.map(({ dia }) => [dia, 0]));
  for (const pedido of pedidos) {
    // Criação não substitui uma data de retirada ausente.
    if (pedido.status !== 'retirado' || !pedido.status_atualizado_em) continue;
    const dia = diaEmSaoPaulo(pedido.status_atualizado_em);
    const valor = Number(pedido.total);
    if (centavos.has(dia) && Number.isFinite(valor)) {
      centavos.set(dia, centavos.get(dia) + Math.round(valor * 100));
    }
  }
  return pontos.map(ponto => ({ ...ponto, value: centavos.get(ponto.dia) / 100 }));
}

export function metricasPedidos(pedidos, hoje) {
  return {
    pedidosHoje: pedidos.filter(p => diaEmSaoPaulo(p.data) === hoje).length,
    pendentes: pedidos.filter(p => p.status === 'pendente').length,
    confirmados: pedidos.filter(p => p.status === 'confirmado').length,
    prontos: pedidos.filter(p => p.status === 'pronto').length,
    pagamentosPendentes: pedidos.filter(p => p.status !== 'cancelado' && ['pendente', 'processando'].includes(p.status_pagamento)).length,
  };
}

export function normalizarRanking(resposta, produtos) {
  if (!Array.isArray(resposta?.resultado)) throw new Error('Resposta de ranking inválida.');
  const catalogo = new Map(produtos.map(produto => [String(produto.id), produto]));
  return resposta.resultado.map(item => {
    if (item?.produto_id == null || item.quantidade_vendida == null || item.quantidade_vendida === '' || !Number.isFinite(Number(item.quantidade_vendida))) {
      throw new Error('Resposta de ranking inválida.');
    }
    return {
      ...item,
      produto: {
        ...catalogo.get(String(item.produto_id)),
        id: item.produto_id,
        nome: item.produto_nome || 'Produto',
        imagem: item.produto_imagem || catalogo.get(String(item.produto_id))?.imagem || null,
      },
    };
  });
}
