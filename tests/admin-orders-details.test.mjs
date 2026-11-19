import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service from "./fixtures/admin-order-detail.service.mjs";

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/services/admin.service") {
    return { url: new URL("./fixtures/admin-order-detail.service.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { useAdminOrdersStore } = await import("../src/stores/adminOrders.js");
after(() => hook.deregister());

function iniciar() { setActivePinia(createPinia()); return useAdminOrdersStore(); }

test("store consulta um pedido específico, sem carregar coleções integrais", async () => {
 const s = iniciar();
 let chamadas = 0;
 service.obterPedido = async id => { chamadas++; return { id, data: "2026-11-19T12:00:00Z", status: "pendente" }; };
 await s.obterPedido(22);
 assert.equal(chamadas, 1);
 assert.equal(s.porId(22).status, "pendente");
 assert.equal(s.itens.length, 1);
});
test("Kanban altera status e mantém cache por ID sem duplicar pedidos", async () => {
 const s = iniciar();
 s.substituirPedido({ id: 9, status: "pendente", usuario_nome: "Cliente" });
 service.alterarStatusPedido = async (id, status) => ({ id, status });
 await s.alterarStatus(9, "confirmado");
 assert.equal(s.itens.length, 1);
 assert.equal(s.porId(9).status, "confirmado");
 assert.equal(s.porId(9).usuario_nome, "Cliente");
 s.substituirPedido({ id: 9, status: "pronto" });
 assert.equal(s.itens.length, 1);
 assert.equal(s.porId(9).status, "pronto");
});
test("logout remove snapshot local", async () => {
 const s = iniciar();
 s.substituirPedido({ id: 1, status: "pronto" });
 s.resetar();
 assert.equal(s.porId(1), null);
 assert.deepEqual(s.itens, []);
});
