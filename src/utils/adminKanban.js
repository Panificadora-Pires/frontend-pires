export const ETAPAS_FILA = Object.freeze([
  { status: "pendente", titulo: "Pendentes", descricao: "Aguardam confirmação", campo: "pendentes" },
  { status: "confirmado", titulo: "Em preparo", descricao: "Na cozinha", campo: "confirmados" },
  { status: "pronto", titulo: "Prontos", descricao: "Aguardam retirada", campo: "prontos" },
]);

export const ETAPAS_HISTORICO = Object.freeze([
  { status: "retirado", titulo: "Retirados", descricao: "Pedidos entregues", campo: "retirados" },
  { status: "cancelado", titulo: "Cancelados", descricao: "Pedidos encerrados", campo: "cancelados" },
]);

export const TODOS_STATUS = [...ETAPAS_FILA, ...ETAPAS_HISTORICO].map(etapa => etapa.status);

export function podeConfirmar(pedido) {
  return pedido?.status === "pendente" && (
    pedido.forma_pagamento === "dinheiro" ||
    pedido.status_pagamento === "aprovado"
  );
}

export function proximaAcao(pedido) {
  if (!pedido) return null;
  if (pedido.status === "pendente") {
    return podeConfirmar(pedido) ? { status: "confirmado", label: "Confirmar" } : null;
  }
  if (pedido.status === "confirmado") {
    return { status: "pronto", label: "Marcar pronto" };
  }
  return null; // Retirada e QR Code continuam na tela de detalhes.
}

export function itensDoPedido(pedido) {
  const itens = pedido?.itens || [];
  if (!itens.length) return "Itens não informados";
  const total = itens.reduce((n, item) => n + (Number(item.quantidade) || 0), 0);
  const primeiros = itens.slice(0, 2).map(item =>
    String(item.quantidade || 0) + "× " + String(item.produto_nome || "Produto")
  );
  if (itens.length > 2) primeiros.push("+" + (itens.length - 2) + " outros");
  return primeiros.join(" · ") + " (" + total + " itens)";
}

export function paginaExpirada(error, pagina) {
  return Number.isInteger(pagina) && pagina > 1 && error?.response?.status === 404;
}
