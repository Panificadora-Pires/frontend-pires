import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service from "./fixtures/order.service.mjs";
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/services/order.service")
      return {
        url: new URL("./fixtures/order.service.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const { useOrdersStore } = await import("../src/stores/orders.js");
after(() => hooks.deregister());
function adiar() {
  let resolve, reject;
  const promise = new Promise((s, e) => {
    resolve = s;
    reject = e;
  });
  return { promise, resolve, reject };
}
test("consumidores do GET em voo aguardam a mesma resposta e recebem a falha real", async () => {
  setActivePinia(createPinia());
  const store = useOrdersStore(),
    request = adiar();
  let chamadas = 0;
  store.inicializado = true;
  store.itens = [{ id: 1, status: "pronto" }];
  service.listar = () => {
    chamadas++;
    return request.promise;
  };
  const primeira = store.carregar({ force: true, silencioso: true }),
    segunda = store.carregar({ force: true, silencioso: true });
  const resultados = Promise.allSettled([primeira, segunda]);
  request.reject(new Error("Falha sintética"));
  const retorno = await resultados;
  assert.deepEqual(
    retorno.map((r) => r.status),
    ["rejected", "rejected"],
  );
  assert.equal(chamadas, 1);
  assert.equal(store.itens[0].status, "pronto");
});
test("reset invalida resposta anterior e não limpa flags do novo GET", async () => {
  setActivePinia(createPinia());
  const store = useOrdersStore(),
    antigo = adiar(),
    novo = adiar();
  service.listar = () => antigo.promise;
  const p1 = store.carregar();
  store.resetar();
  service.listar = () => novo.promise;
  const p2 = store.carregar();
  antigo.resolve([{ id: 1, status: "pronto" }]);
  await p1;
  assert.equal(store.carregando, true);
  assert.deepEqual(store.itens, []);
  novo.resolve([{ id: 2, status: "pendente" }]);
  await p2;
  assert.equal(store.carregando, false);
  assert.equal(store.itens[0].id, 2);
});
