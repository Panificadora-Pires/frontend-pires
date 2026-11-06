import test from "node:test";
import assert from "node:assert/strict";
import {
  filtrarPedidos,
  ordenarPedidos,
  etapasPedido,
  informacaoStatus,
} from "../src/utils/orders.js";

const pedido = (id, status, data = "2026-11-06T10:00:00Z") => ({
  id,
  status,
  data,
  itens: [{ produto_nome: "Pão de queijo" }],
});

test("prontos lideram, seguidos de confirmados e pendentes; todos continuam acessíveis", () => {
  const itens = [
    pedido(1, "pendente"),
    pedido(2, "retirado"),
    pedido(5, "pronto"),
    pedido(4, "confirmado"),
    pedido(3, "pronto", "2026-11-05T10:00:00Z"),
    pedido(6, "cancelado"),
  ];
  assert.deepEqual(
    ordenarPedidos(itens).map((p) => p.id),
    [3, 5, 4, 1, 6, 2],
  );
  assert.equal(itens[0].id, 1, "não muta o store");
});
test("busca e filtros usam o mesmo conjunto, incluindo destaque, sem excluir pronto dos ativos", () => {
  const itens = [
    pedido(21, "pronto"),
    pedido(22, "cancelado"),
    { ...pedido(23, "confirmado"), itens: [{ produto_nome: "Suco" }] },
  ];
  assert.deepEqual(
    filtrarPedidos(itens, "andamento", "pão").map((p) => p.id),
    [21],
  );
  assert.deepEqual(
    filtrarPedidos(itens, "finalizados", "#22").map((p) => p.id),
    [22],
  );
  assert.equal(filtrarPedidos(itens, "todos", "inexistente").length, 0);
});
test("somente quatro etapas reais; cancelamento não simula conclusão", () => {
  assert.deepEqual(
    etapasPedido.map((e) => e.status),
    ["pendente", "confirmado", "pronto", "retirado"],
  );
  assert.equal(informacaoStatus("cancelado").titulo, "Pedido cancelado");
  assert.match(informacaoStatus("confirmado").texto, /confirmou/);
  assert.equal(informacaoStatus("desconhecido").titulo, "Acompanhe seu pedido");
});
