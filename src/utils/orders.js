export const etapasPedido = [
  { status: "pendente", titulo: "Recebido" },
  { status: "confirmado", titulo: "Confirmado" },
  { status: "pronto", titulo: "Pronto" },
  { status: "retirado", titulo: "Retirado" },
];

const estados = {
  pendente: {
    titulo: "Pedido recebido",
    texto: "Seu pedido foi recebido e aguarda confirmação da panificadora.",
  },
  confirmado: {
    titulo: "Pedido confirmado",
    texto:
      "A panificadora confirmou seu pedido. Acompanhe aqui até ficar pronto.",
  },
  pronto: {
    titulo: "Pode vir buscar.",
    texto:
      "Seu pedido está pronto. Apresente o QR Code no balcão para retirar.",
  },
  retirado: {
    titulo: "Retirada concluída",
    texto: "Pedido retirado com sucesso. Obrigado por escolher a Pires.",
  },
  cancelado: {
    titulo: "Pedido cancelado",
    texto:
      "Este pedido foi cancelado. Consulte as mensagens se precisar falar com o balcão.",
  },
};

export function informacaoStatus(status) {
  return (
    estados[status] || {
      titulo: "Acompanhe seu pedido",
      texto: "Consulte aqui as atualizações do seu pedido.",
    }
  );
}

// Prontos exigem ação. Dentro de cada estado ativo, atende primeiro o mais antigo.
// Finalizados aparecem do mais recente para o mais antigo, sem modificar o store.
export function ordenarPedidos(itens) {
  const prioridade = { pronto: 0, confirmado: 1, pendente: 2 };
  return [...itens].sort((a, b) => {
    const pa = prioridade[a.status] ?? 3;
    const pb = prioridade[b.status] ?? 3;
    if (pa !== pb) return pa - pb;
    const dataA = Date.parse(a.data) || 0;
    const dataB = Date.parse(b.data) || 0;
    return pa < 3
      ? dataA - dataB || Number(a.id) - Number(b.id)
      : dataB - dataA || Number(b.id) - Number(a.id);
  });
}

export function filtrarPedidos(itens, filtro, busca) {
  const termo = String(busca || "")
    .trim()
    .replace(/^#/, "")
    .toLocaleLowerCase("pt-BR");
  return ordenarPedidos(
    itens.filter((pedido) => {
      const ativo = ["pendente", "confirmado", "pronto"].includes(
        pedido.status,
      );
      if (filtro === "andamento" && !ativo) return false;
      if (
        filtro === "finalizados" &&
        !["retirado", "cancelado"].includes(pedido.status)
      )
        return false;
      const texto = [
        pedido.id,
        pedido.status_display,
        pedido.status,
        ...(pedido.itens || []).map((item) => item.produto_nome),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return !termo || texto.includes(termo);
    }),
  );
}

export function moedaPedido(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

export function dataPedido(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(data);
}
