import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";

import service, { session } from "./fixtures/admin-dashboard.service.mjs";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/services/admin.service" || specifier === "@/services/api") {
      return { url: new URL("./fixtures/admin-dashboard.service.mjs", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/utils/autoRefresh") {
      return { url: new URL("../src/utils/autoRefresh.js", import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { useAdminQueueSummaryStore } = await import("../src/stores/adminQueueSummary.js");
after(() => hook.deregister());

function resumo(contagem = 2) {
  return {
    data_referencia: "2026-11-18", total: contagem,
    pedidos_hoje: contagem, pendentes: contagem - 1, confirmados: 0,
    prontos: 1, retirados: 0, cancelados: 0, pagamentos_pendentes: 1,
  };
}
function setup() {
  setActivePinia(createPinia());
  session.versao = 0;
  service.resumoPedidosAdmin = async () => resumo();
  return useAdminQueueSummaryStore();
}
function diferida() {
  let resolve;
  const promise = new Promise(ok => { resolve = ok; });
  return { promise, resolve };
}
test("primeira resposta e contagem do badge vêm do agregado, não de pedidos paginados", async () => {
  const store = setup();
  assert.equal(store.aguardandoAcao, null);
  await store.carregar();
  assert.equal(store.inicializado, true);
  assert.equal(store.aguardandoAcao, 2);
  assert.equal(store.resumo.total, 2);
  assert.equal(store.erro, null);
});
test("requisições concorrentes reaproveitam uma carga", async () => {
  const store = setup(), pending = diferida();
  let requests = 0;
  service.resumoPedidosAdmin = () => { requests += 1; return pending.promise; };
  const a = store.carregar(), b = store.carregar();
  assert.equal(requests, 1);
  pending.resolve(resumo(4));
  await Promise.all([a, b]);
  assert.equal(store.aguardandoAcao, 4);
});
test("reset e mudança de sessão não reaplicam respostas anteriores", async () => {
  const store = setup(), antiga = diferida(), nova = diferida();
  service.resumoPedidosAdmin = () => antiga.promise;
  const a = store.carregar();
  store.resetar();
  service.resumoPedidosAdmin = () => nova.promise;
  const b = store.carregar();
  antiga.resolve(resumo(50));
  await a;
  assert.equal(store.resumo, null);
  nova.resolve(resumo(3));
  await b;
  assert.equal(store.aguardandoAcao, 3);
  const outra = diferida();
  service.resumoPedidosAdmin = () => outra.promise;
  const c = store.carregar();
  session.versao += 1;
  outra.resolve(resumo(99));
  await c;
  assert.equal(store.aguardandoAcao, 3);
});
test("falha de refresh preserva último resumo e registra erro", async () => {
  const store = setup();
  await store.carregar();
  service.resumoPedidosAdmin = async () => { throw Error("API indisponível"); };
  await assert.rejects(store.carregar(), /API indisponível/);
  assert.equal(store.resumo.total, 2);
  assert.match(store.erro, /sincronizar/i);
});
