function pedidoValido(valor) {
  if (!/^\d+$/.test(String(valor))) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// O contrato não fornece tipo. Só estes textos integrais são emitidos pelos receivers.
// O texto original nunca é reescrito; desconhecidos não ganham destinos por aproximação.
export function apresentarNotificacao(notificacao) {
  const pedido = pedidoValido(notificacao.pedido);
  if (
    pedido &&
    notificacao.mensagem ===
      `Seu pedido #${pedido} está pronto para retirada! Mostre seu QR Code no balcão.`
  ) {
    return {
      tipo: "retirada",
      titulo: "Pedido pronto para retirada",
      destino: { name: "pedidos", query: { pedido: String(pedido) } },
      acao: "Ver pedido",
    };
  }
  if (
    pedido &&
    notificacao.mensagem ===
      `Nova mensagem da padaria sobre o pedido #${pedido}.`
  ) {
    return {
      tipo: "mensagem",
      titulo: "Nova mensagem da padaria",
      destino: { name: "pedidos", query: { chat: String(pedido) } },
      acao: "Abrir conversa",
    };
  }
  return {
    tipo: "generica",
    titulo: "Atualização da Pires",
    destino: null,
    acao: null,
  };
}

function dataValida(valor) {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function chaveDia(data) {
  return data
    ? `${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()}`
    : "sem-data";
}

export function agruparNotificacoes(itens, agora = new Date()) {
  const hoje = chaveDia(agora);
  // Subtrair um dia no calendário, não 24 horas: respeita viradas de mês/ano e DST.
  const ontem = chaveDia(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1),
  );
  const ordenados = [...itens].sort((a, b) => {
    const dataA = dataValida(a.criada_em)?.getTime() ?? -Infinity;
    const dataB = dataValida(b.criada_em)?.getTime() ?? -Infinity;
    return (dataA === dataB ? 0 : dataB - dataA) || Number(b.id) - Number(a.id);
  });
  const grupos = new Map();
  for (const item of ordenados) {
    const data = dataValida(item.criada_em);
    const chave = chaveDia(data);
    const titulo = !data
      ? "Data indisponível"
      : chave === hoje
        ? "Hoje"
        : chave === ontem
          ? "Ontem"
          : new Intl.DateTimeFormat("pt-BR", {
              day: "numeric",
              month: "long",
              ...(data.getFullYear() !== agora.getFullYear()
                ? { year: "numeric" }
                : {}),
            }).format(data);
    if (!grupos.has(chave)) grupos.set(chave, { chave, titulo, itens: [] });
    grupos.get(chave).itens.push(item);
  }
  return [...grupos.values()];
}

export function filtrarNotificacoes(itens, filtro, busca = "") {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return itens.filter((item) => {
    if (filtro === "nao-lidas" && item.lida) return false;
    return (
      !termo ||
      `${item.mensagem} ${item.pedido ? `#${item.pedido}` : ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo)
    );
  });
}

export function formatarDataNotificacao(valor) {
  const data = dataValida(valor);
  return data
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(data)
    : "Data indisponível";
}
