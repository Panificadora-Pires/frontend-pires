// Mesmo calendário comercial do backend (TIME_ZONE); não usar o fuso do aparelho para a vigência.
export function dataDaPires(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora);
}

export function selecionarOfertas(produtos, promocoes, hoje = dataDaPires()) {
  const porProduto = new Map(produtos.map(produto => [Number(produto.id), produto]));
  const selecionadas = new Map();
  const vigentes = promocoes.filter(p => p.data_inicio <= hoje && p.data_fim >= hoje)
    .sort((a, b) => String(b.data_inicio).localeCompare(String(a.data_inicio)) || Number(b.id) - Number(a.id));
  for (const promocao of vigentes) {
    const id = Number(promocao.produto);
    const produto = porProduto.get(id);
    if (!produto?.em_promocao || selecionadas.has(id)) continue;
    const original = Number(produto.preco), atual = Number(produto.preco_atual);
    // O preço escolhido pelo servidor prevalece sobre registros legados sobrepostos.
    if (!Number.isFinite(original) || !Number.isFinite(atual) || atual <= 0 || atual >= original || atual !== Number(promocao.preco_promocional)) continue;
    selecionadas.set(id, {
      promocao,
      produto: { ...produto, id },
      desconto: Math.round((original - atual) / original * 100),
    });
  }
  return [...selecionadas.values()];
}

export function validadeDaOferta(data) {
  return new Date(`${data}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
