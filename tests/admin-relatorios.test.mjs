import test from "node:test";
import assert from "node:assert/strict";
import {
  centavos, csvSerieDiaria, periodoRapido, validarPeriodo, validarRelatorioAnalitico,
} from "../src/utils/adminRelatorios.js";

const inicio = "2026-11-18", fim = "2026-11-19";
const dados = {
  periodo: { data_inicio: inicio, data_fim: fim, dias: 2, fuso: "America/Sao_Paulo" },
  resumo: { total_vendido: "19.99", total_pedidos: 2, itens_vendidos: 6, ticket_medio: "10.00" },
  comparacao: {
    periodo_anterior: { data_inicio: "2026-11-16", data_fim: "2026-11-17" },
    anterior: { total_vendido: "10.00", total_pedidos: 1, itens_vendidos: 1, ticket_medio: "10.00" },
    variacao_percentual: { total_vendido: "99.9", total_pedidos: "100.0", itens_vendidos: "500.0", ticket_medio: "0.0" },
  },
  serie_diaria: [
    { data: inicio, total_vendido: "5.00", total_pedidos: 1, itens_vendidos: 1, ticket_medio: "5.00" },
    { data: fim, total_vendido: "14.99", total_pedidos: 1, itens_vendidos: 5, ticket_medio: "14.99" },
  ],
  formas_pagamento: [
    { forma_pagamento: "dinheiro", total_pedidos: 1, total_vendido: "5.00", percentual_pedidos: "50.0" },
    { forma_pagamento: "pix", total_pedidos: 1, total_vendido: "14.99", percentual_pedidos: "50.0" },
    { forma_pagamento: "cartao", total_pedidos: 0, total_vendido: "0.00", percentual_pedidos: "0.0" },
  ],
};
const clonar = () => structuredClone(dados);

test("período rápido usa o dia de São Paulo, não UTC", () => {
  assert.deepEqual(periodoRapido(7, new Date("2026-11-19T01:30:00Z")), { inicio: "2026-11-12", fim: "2026-11-18" });
  assert.throws(() => periodoRapido(5), /inválido/);
});
test("valida períodos, dias inexistentes, tamanho e ordem", () => {
  assert.equal(validarPeriodo(inicio, fim), "");
  assert.match(validarPeriodo("2026-11-20", fim), /posterior/);
  assert.match(validarPeriodo("2026-02-30", fim), /datas válidas/);
  assert.match(validarPeriodo("2025-01-01", "2026-01-02"), /366 dias/);
  assert.equal(validarPeriodo("2025-01-01", "2026-01-01"), "");
});
test("conferência cruzada aceita apenas totais reconciliados", () => {
  assert.equal(validarRelatorioAnalitico(clonar(), { inicio, fim }).resumo.total_vendido, "19.99");
  const quebrado = clonar();
  quebrado.serie_diaria[1].total_vendido = "14.98";
  assert.throws(() => validarRelatorioAnalitico(quebrado, { inicio, fim }), /não correspondem/);
  const pagamentos = clonar();
  pagamentos.formas_pagamento[0].total_pedidos = 0;
  assert.throws(() => validarRelatorioAnalitico(pagamentos, { inicio, fim }), /não corresponde/);
  const faltandoDia = clonar();
  faltandoDia.serie_diaria[1].data = "2026-11-20";
  assert.throws(() => validarRelatorioAnalitico(faltandoDia, { inicio, fim }), /datas ausentes/);
});
test("valores monetários são inteiros de centavos, sem aceitar entradas ambíguas", () => {
  assert.equal(centavos("19.99"), 1999);
  assert.throws(() => centavos("19,99"), /inválido/);
  assert.throws(() => centavos("abc"), /inválido/);
});
test("CSV de série diária é completo e usa separador adequado à planilha em pt-BR", () => {
  const csv = csvSerieDiaria(dados);
  assert.ok(csv.startsWith("\uFEFFData;"));
  assert.match(csv, /18\/11\/2026;5,00;1;1;5,00/);
  assert.match(csv, /19\/11\/2026;14,99;1;5;14,99/);
  assert.equal(csv.trim().split("\r\n").length, 3);
});
