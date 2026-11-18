import test from "node:test";
import assert from "node:assert/strict";

import { ETAPAS_FILA, ETAPAS_HISTORICO, podeConfirmar, proximaAcao, itensDoPedido, paginaExpirada } from "../src/utils/adminKanban.js";

test("fila e histórico não expõem retirada como avanço direto", () => {
  assert.deepEqual(ETAPAS_FILA.map(e => e.status), ["pendente", "confirmado", "pronto"]);
  assert.deepEqual(ETAPAS_HISTORICO.map(e => e.status), ["retirado", "cancelado"]);
  assert.equal(proximaAcao({ status: "pronto" }), null);
  assert.equal(proximaAcao({ status: "cancelado" }), null);
  assert.equal(proximaAcao({ status: "retirado" }), null);
});

test("não confirma pagamento online não aprovado e mantém dinheiro operacional", () => {
  assert.equal(podeConfirmar({ status: "pendente", forma_pagamento: "pix", status_pagamento: "pendente" }), false);
  assert.equal(proximaAcao({ status: "pendente", forma_pagamento: "cartao", status_pagamento: "processando" }), null);
  assert.deepEqual(proximaAcao({ status: "pendente", forma_pagamento: "pix", status_pagamento: "aprovado" }), { status: "confirmado", label: "Confirmar" });
  assert.deepEqual(proximaAcao({ status: "pendente", forma_pagamento: "dinheiro", status_pagamento: "pendente" }), { status: "confirmado", label: "Confirmar" });
  assert.deepEqual(proximaAcao({ status: "confirmado" }), { status: "pronto", label: "Marcar pronto" });
});

test("resumo de itens mantém quantidades e não falha em pedidos vazios", () => {
  assert.equal(itensDoPedido(null), "Itens não informados");
  assert.equal(itensDoPedido({ itens: [] }), "Itens não informados");
  assert.equal(itensDoPedido({ itens: [{ quantidade: 2, produto_nome: "Coxinha" }, { quantidade: 1, produto_nome: "Suco" }, { quantidade: 3, produto_nome: "Bolo" }] }), "2× Coxinha · 1× Suco · +1 outros (6 itens)");
});

test("página fora do intervalo retorna ao início apenas quando o servidor responde 404", () => {
  assert.equal(paginaExpirada({ response: { status: 404 } }, 3), true);
  assert.equal(paginaExpirada({ response: { status: 404 } }, 1), false);
  assert.equal(paginaExpirada({ response: { status: 500 } }, 3), false);
  assert.equal(paginaExpirada(null, 2), false);
});
