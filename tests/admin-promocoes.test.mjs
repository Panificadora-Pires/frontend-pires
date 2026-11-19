import test from "node:test";
import assert from "node:assert/strict";
import { dataCivilValida, diaEmSaoPaulo, estadoPromocao, filtrarPromocoes, indicadoresPromocoes, validarPromocao } from "../src/utils/adminPromocoes.js";

const hoje = "2026-11-19";
const promocoes = [
  { id: 1, produto_nome: "Coxinha", data_inicio: "2026-11-17", data_fim: "2026-11-20" },
  { id: 2, produto_nome: "Pão de queijo", data_inicio: "2026-11-20", data_fim: "2026-11-29" },
  { id: 3, produto_nome: "Brigadeiro", data_inicio: "2026-11-01", data_fim: "2026-11-18" },
];

test("data civil de São Paulo não usa o dia UTC", () => {
  assert.equal(diaEmSaoPaulo(new Date("2026-11-19T01:30:00Z")), "2026-11-18");
  assert.equal(diaEmSaoPaulo(new Date("2026-11-19T03:15:00Z")), "2026-11-19");
});
test("datas de início e fim são inclusivas", () => {
  assert.equal(estadoPromocao({ data_inicio: hoje, data_fim: hoje }, hoje), "ativa");
  assert.equal(estadoPromocao({ data_inicio: "2026-11-20", data_fim: "2026-11-30" }, hoje), "agendada");
  assert.equal(estadoPromocao({ data_inicio: "2026-11-01", data_fim: "2026-11-18" }, hoje), "encerrada");
});
test("contagens globais e filtros preservam lista original", () => {
  assert.deepEqual(indicadoresPromocoes(promocoes, hoje), { total: 3, ativas: 1, agendadas: 1, encerradas: 1 });
  assert.deepEqual(filtrarPromocoes(promocoes, { hoje }).map(p => p.id), [1, 2, 3]);
  assert.deepEqual(filtrarPromocoes(promocoes, { hoje, busca: "PAO" }).map(p => p.id), [2]);
  assert.deepEqual(filtrarPromocoes(promocoes, { hoje, situacao: "encerrada" }).map(p => p.id), [3]);
  assert.deepEqual(promocoes.map(p => p.id), [1, 2, 3]);
});
test("valida datas civis reais", () => {
  assert.equal(dataCivilValida("2026-02-29"), false);
  assert.equal(dataCivilValida("2028-02-29"), true);
  assert.equal(dataCivilValida("2026-13-01"), false);
  assert.equal(dataCivilValida("2026-11-19"), true);
});
test("validação client-side não substitui regra Django", () => {
  const p = { produto: 1, preco_promocional: "5.90", data_inicio: "2026-11-19", data_fim: "2026-11-23" };
  assert.equal(validarPromocao(p, "7.00"), "");
  assert.match(validarPromocao({ ...p, produto: "" }), /Selecione/);
  assert.match(validarPromocao({ ...p, preco_promocional: "7.00" }, "7.00"), /menor/);
  assert.match(validarPromocao({ ...p, preco_promocional: "0" }, "7.00"), /válido/);
  assert.match(validarPromocao({ ...p, preco_promocional: "5.999" }, "7.00"), /duas casas/);
  assert.match(validarPromocao({ ...p, data_fim: "2026-11-18" }, "7.00"), /anterior/);
  assert.match(validarPromocao({ ...p, data_inicio: "2026-11-31" }, "7.00"), /datas válidas/);
});
