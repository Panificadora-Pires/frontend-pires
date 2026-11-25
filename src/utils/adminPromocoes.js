export function diaEmSaoPaulo(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return [valor("year"), valor("month"), valor("day")].join("-");
}

export function estadoPromocao(promocao, hoje = diaEmSaoPaulo()) {
  if (promocao.data_inicio > hoje) return "agendada";
  if (promocao.data_fim < hoje) return "encerrada";
  return "ativa";
}

export function indicadoresPromocoes(promocoes = [], hoje = diaEmSaoPaulo()) {
  const dados = {
    total: promocoes.length,
    ativas: 0,
    agendadas: 0,
    encerradas: 0,
  };
  for (const promocao of promocoes) {
    const estado = estadoPromocao(promocao, hoje);
    if (estado === "ativa") dados.ativas++;
    else if (estado === "agendada") dados.agendadas++;
    else dados.encerradas++;
  }
  return dados;
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filtrarPromocoes(
  promocoes = [],
  { busca = "", situacao = "", hoje = diaEmSaoPaulo() } = {},
) {
  const termo = normalizar(busca);
  return promocoes
    .filter(
      (promocao) =>
        (!termo || normalizar(promocao.produto_nome).includes(termo)) &&
        (!situacao || estadoPromocao(promocao, hoje) === situacao),
    )
    .slice()
    .sort((a, b) => {
      const prioridades = { ativa: 0, agendada: 1, encerrada: 2 };
      const ea = estadoPromocao(a, hoje),
        eb = estadoPromocao(b, hoje);
      if (prioridades[ea] !== prioridades[eb])
        return prioridades[ea] - prioridades[eb];
      const campo = ea === "agendada" ? "data_inicio" : "data_fim";
      const ordem =
        ea === "encerrada"
          ? String(b.data_fim).localeCompare(String(a.data_fim))
          : String(a[campo]).localeCompare(String(b[campo]));
      return ordem || Number(a.id) - Number(b.id);
    });
}

export function dataCivilValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) return false;
  const data = new Date(String(valor) + "T12:00:00Z");
  return (
    Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor
  );
}

export function validarPromocao(form, precoOriginal = null) {
  if (
    !Number.isSafeInteger(Number(form.produto)) ||
    Number(form.produto) <= 0
  ) {
    return "Selecione um produto para a promoção.";
  }
  const preco = Number(String(form.preco_promocional).replace(",", "."));
  if (
    !Number.isFinite(preco) ||
    preco <= 0 ||
    !/^\d+([.,]\d{1,2})?$/.test(String(form.preco_promocional))
  ) {
    return "Informe um preço promocional válido, com até duas casas decimais.";
  }
  if (
    precoOriginal !== null &&
    precoOriginal !== undefined &&
    preco >= Number(precoOriginal)
  ) {
    return "O preço promocional precisa ser menor que o preço normal do produto.";
  }
  if (!dataCivilValida(form.data_inicio) || !dataCivilValida(form.data_fim)) {
    return "Informe datas válidas para início e fim.";
  }
  if (form.data_fim < form.data_inicio) {
    return "A data de fim não pode ser anterior à data de início.";
  }
  return "";
}
