import test from "node:test";
import assert from "node:assert/strict";
import { createRealtimeInvalidations } from "../src/utils/realtimeInvalidations.js";

function setup() {
  const chamadas = [];
  const timers = new Map();
  let next = 1;
  const filas = createRealtimeInvalidations({
    pedidos: () => chamadas.push("pedidos"),
    chat: () => chamadas.push("chat"),
    notificacoes: () => chamadas.push("notificacoes"),
    delay: 400,
    schedule(fn, ms) { const id = next++; timers.set(id, { fn, ms }); return id; },
    cancel(id) { timers.delete(id); },
  });
  function executar() {
    for (const [id, { fn }] of [...timers]) { timers.delete(id); fn(); }
  }
  return { filas, timers, chamadas, executar };
}

test("rajada de eventos vira uma consulta por recurso", () => {
  const c = setup();
  c.filas.sinalizar({ tipo: "pedido.criado" });
  c.filas.sinalizar({ tipo: "pedido.atualizado" });
  c.filas.sinalizar({ tipo: "chat.mensagem_nova" });
  c.filas.sinalizar({ tipo: "chat.leitura_atualizada" });
  c.filas.sinalizar({ tipo: "notificacao.alterada" });
  assert.equal(c.timers.size, 1);
  c.executar();
  assert.deepEqual(c.chamadas.sort(), ["chat", "notificacoes", "pedidos"]);
  assert.equal(c.timers.size, 0);
});

test("reconexão nula força resync de todos os recursos", () => {
  const c = setup();
  c.filas.sinalizar(null);
  c.executar();
  assert.deepEqual(c.chamadas.sort(), ["chat", "notificacoes", "pedidos"]);
});

test("evento desconhecido não dispara consultas nem agenda timer", () => {
  const c = setup();
  c.filas.sinalizar({ tipo: "conta.outro_usuario" });
  c.filas.sinalizar({});
  assert.equal(c.timers.size, 0);
});

test("logout/desmontagem cancela timer e descarta dados pendentes", () => {
  const c = setup();
  c.filas.sinalizar({ tipo: "notificacao.alterada" });
  assert.equal(c.timers.size, 1);
  c.filas.parar();
  assert.equal(c.timers.size, 0);
  c.filas.sinalizar(null);
  c.executar();
  assert.deepEqual(c.chamadas, []);
});

test("falha isolada em um recurso não bloqueia atualizações restantes", async () => {
  const chamadas = [];
  let fn = null;
  const fila = createRealtimeInvalidations({
    pedidos: () => { throw new Error("API de pedidos indisponível"); },
    chat: () => chamadas.push("chat"),
    notificacoes: async () => { chamadas.push("notificacoes"); throw new Error("timeout"); },
    schedule: callback => { fn = callback; return 1; },
    cancel: () => {},
  });
  fila.sinalizar(null);
  fn();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(chamadas, ["chat", "notificacoes"]);
  fila.parar();
});
