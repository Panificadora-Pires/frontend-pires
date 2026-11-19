import { diaEmSaoPaulo } from "./adminDashboard.js";

const FORMAS = ["dinheiro", "pix", "cartao"];
const VALOR = /^\d+\.\d{2}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function somarDias(dia, quantidade) {
  const data = new Date(dia + "T12:00:00Z");
  if (!DIA.test(dia) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== dia) {
    throw new Error("Dia inválido para cálculo do período.");
  }
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

export function periodoRapido(dias, agora = new Date()) {
  if (![7, 30, 90].includes(dias)) throw new Error("Atalho de período inválido.");
  const fim = diaEmSaoPaulo(agora);
  return { inicio: somarDias(fim, 1 - dias), fim };
}

export function validarPeriodo(inicio, fim) {
  try {
    if (!DIA.test(inicio) || !DIA.test(fim)) throw new Error("Inválido");
    if (somarDias(inicio, 0) !== inicio || somarDias(fim, 0) !== fim) throw new Error("Inválido");
  } catch {
    return "Informe datas válidas para gerar o relatório.";
  }
  if (inicio > fim) return "A data inicial não pode ser posterior à final.";
  const duracao = Math.round((Date.parse(fim + "T12:00:00Z") - Date.parse(inicio + "T12:00:00Z")) / 86400000) + 1;
  if (duracao > 366) return "Escolha um período de até 366 dias.";
  try {
    somarDias(inicio, -duracao);
    somarDias(fim, 1);
  } catch {
    return "Escolha datas que permitam comparar com o período anterior.";
  }
  return "";
}

export function centavos(valor) {
  if (typeof valor !== "string" || !VALOR.test(valor)) throw new Error("Valor monetário inválido.");
  const [inteiro, fração] = valor.split(".");
  const numero = Number(inteiro) * 100 + Number(fração);
  if (!Number.isSafeInteger(numero)) throw new Error("Valor monetário fora do limite.");
  return numero;
}

function validarResumo(resumo) {
  if (!resumo || !Number.isSafeInteger(resumo.total_pedidos) || resumo.total_pedidos < 0 ||
    !Number.isSafeInteger(resumo.itens_vendidos) || resumo.itens_vendidos < 0) {
    throw new Error("Totais inválidos no relatório.");
  }
  centavos(resumo.total_vendido);
  centavos(resumo.ticket_medio);
}

export function validarRelatorioAnalitico(dados, { inicio, fim }) {
  if (!dados || dados.periodo?.data_inicio !== inicio || dados.periodo?.data_fim !== fim ||
    dados.periodo?.fuso !== "America/Sao_Paulo" || validarPeriodo(inicio, fim) ||
    !Array.isArray(dados.serie_diaria) || !Array.isArray(dados.formas_pagamento) ||
    !dados.comparacao?.periodo_anterior || !dados.comparacao?.anterior ||
    !dados.comparacao?.variacao_percentual) {
    throw new Error("O Django retornou um relatório analítico incompleto.");
  }
  validarResumo(dados.resumo);
  validarResumo(dados.comparacao.anterior);
  const dias = Math.round((Date.parse(fim + "T12:00:00Z") - Date.parse(inicio + "T12:00:00Z")) / 86400000) + 1;
  if (dias !== dados.periodo.dias || dados.serie_diaria.length !== dias ||
    dados.comparacao.periodo_anterior.data_inicio !== somarDias(inicio, -dias) ||
    dados.comparacao.periodo_anterior.data_fim !== somarDias(inicio, -1)) {
    throw new Error("Os períodos do relatório não coincidem.");
  }

  let totalCentavos = 0, pedidos = 0, itens = 0;
  for (let indice = 0; indice < dias; indice++) {
    const linha = dados.serie_diaria[indice];
    if (linha?.data !== somarDias(inicio, indice)) throw new Error("Há datas ausentes na série de vendas.");
    validarResumo(linha);
    totalCentavos += centavos(linha.total_vendido);
    pedidos += linha.total_pedidos;
    itens += linha.itens_vendidos;
  }
  if (totalCentavos !== centavos(dados.resumo.total_vendido) ||
    pedidos !== dados.resumo.total_pedidos || itens !== dados.resumo.itens_vendidos) {
    throw new Error("O gráfico e o resumo de vendas não correspondem.");
  }
  const vistos = new Set();
  let pedidosPagamento = 0, receitaPagamento = 0;
  for (const forma of dados.formas_pagamento) {
    if (!FORMAS.includes(forma?.forma_pagamento) || vistos.has(forma.forma_pagamento) ||
      !Number.isSafeInteger(forma.total_pedidos) || forma.total_pedidos < 0) {
      throw new Error("Formas de pagamento inválidas.");
    }
    vistos.add(forma.forma_pagamento);
    pedidosPagamento += forma.total_pedidos;
    receitaPagamento += centavos(forma.total_vendido);
  }
  if (vistos.size !== FORMAS.length || pedidosPagamento !== pedidos || receitaPagamento !== totalCentavos) {
    throw new Error("A distribuição por pagamento não corresponde ao resumo.");
  }
  for (const chave of ["total_vendido", "total_pedidos", "itens_vendidos", "ticket_medio"]) {
    const percentual = dados.comparacao.variacao_percentual[chave];
    if (percentual !== null && (typeof percentual !== "string" || !/^-?\d+\.\d$/.test(percentual))) {
      throw new Error("Comparação percentual inválida.");
    }
  }
  return dados;
}

export function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}

export function inteiro(valor) {
  return new Intl.NumberFormat("pt-BR").format(Number(valor || 0));
}

export function porcentagem(valor) {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  const sinal = numero > 0 ? "+" : "";
  return sinal + new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1, minimumFractionDigits: 1,
  }).format(numero) + "%";
}

export function dataBR(iso) {
  return DIA.test(iso || "") ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—";
}

export function csvSerieDiaria(dados) {
  const linhas = ["Data;Faturamento (R$);Pedidos retirados;Itens vendidos;Ticket médio (R$)"];
  for (const item of dados.serie_diaria) {
    linhas.push([
      dataBR(item.data), item.total_vendido.replace(".", ","),
      String(item.total_pedidos), String(item.itens_vendidos),
      item.ticket_medio.replace(".", ","),
    ].join(";"));
  }
  return "\uFEFF" + linhas.join("\r\n") + "\r\n";
}
