// Somente rótulos de progresso; nunca deduzir que a compra foi paga
// porque o backend retornou um pedido ou um checkout.
const STATUS_FINAIS_SEM_APROVACAO = new Set([
  "recusado", "cancelado", "reembolsado", "erro",
]);

export function descreverEtapaPagamento({
  forma = "",
  status = "",
  temChallenge = false,
  temResultado = false,
} = {}) {
  if (!temResultado) return "Escolha como pagar";
  if (status === "aprovado") return "Pagamento confirmado";
  if (temChallenge) return "Verifique no banco";
  if (forma === "dinheiro") return "Na retirada";
  if (STATUS_FINAIS_SEM_APROVACAO.has(status)) return "Não concluído";
  if (forma === "pix" && ["pendente", "processando"].includes(status)) {
    return "Aguardando Pix";
  }
  return "Em análise";
}

export function etapaPagamentoAprovada(status) {
  return status === "aprovado";
}

export function descreverEtapaPedido(pedidoId) {
  return pedidoId != null ? "Pedido registrado" : "Próxima etapa";
}
