import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service from "./fixtures/notification.service.mjs";

// Resolver somente os dois aliases deste store, sem transpilar ou copiar sua lógica.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/services/notification.service")
      return {
        url: new URL("./fixtures/notification.service.mjs", import.meta.url)
          .href,
        shortCircuit: true,
      };
    if (specifier === "@/utils/autoRefresh")
      return {
        url: new URL("../src/utils/autoRefresh.js", import.meta.url).href,
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});
const { useNotificationsStore } =
  await import("../src/stores/notifications.js");
after(() => hooks.deregister());
const aviso = (id) => ({
  id,
  pedido: 42,
  mensagem: "Aviso sintético",
  criada_em: "2026-11-06T12:00:00Z",
  lida: false,
});
const adiar = () => {
  let resolve, reject;
  const promise = new Promise((s, e) => {
    resolve = s;
    reject = e;
  });
  return { promise, resolve, reject };
};
let store;
beforeEach(() => {
  setActivePinia(createPinia());
  store = useNotificationsStore();
  store.itens = [aviso(1)];
  store.inicializado = true;
  service.listar = async () => [aviso(1)];
  service.marcarLida = async (id) => ({ data: { ...aviso(id), lida: true } });
  service.marcarTodasLidas = async () => ({ data: { detail: "OK" } });
});

test("GET iniciado antes de PATCH não reverte a leitura confirmada nem contador", async () => {
  const lista = adiar();
  service.listar = () => lista.promise;
  const carregando = store.carregar({ force: true, silencioso: true });
  await store.marcarLida(1);
  assert.equal(store.naoLidas, 0);
  lista.resolve([aviso(1)]);
  await carregando;
  assert.equal(store.itens[0].lida, true);
  assert.equal(store.naoLidas, 0);
});
test("bulk confirma somente IDs presentes no começo; aviso novo conserva estado da API", async () => {
  const bulk = adiar();
  service.marcarTodasLidas = () => bulk.promise;
  const marcando = store.marcarTodasLidas();
  service.listar = async () => [aviso(2), aviso(1)];
  await store.carregar({ force: true, silencioso: true });
  bulk.resolve({ data: { detail: "OK" } });
  await marcando;
  assert.equal(store.itens.find((i) => i.id === 1).lida, true);
  assert.equal(store.itens.find((i) => i.id === 2).lida, false);
  assert.equal(store.naoLidas, 1);
});
test("falhas PATCH e POST não inventam leitura bem-sucedida", async () => {
  service.marcarLida = async () => {
    throw new Error("PATCH falhou");
  };
  service.marcarTodasLidas = async () => {
    throw new Error("POST falhou");
  };
  await assert.rejects(store.marcarLida(1));
  await assert.rejects(store.marcarTodasLidas());
  assert.equal(store.naoLidas, 1);
  assert.equal(store.itens[0].lida, false);
});
test("cliques duplicados em leitura individual e bulk enviam só uma requisição", async () => {
  const patch = adiar();
  let patches = 0;
  service.marcarLida = () => {
    patches++;
    return patch.promise;
  };
  const p = store.marcarLida(1),
    p2 = store.marcarLida(1);
  patch.resolve({ data: { ...aviso(1), lida: true } });
  await Promise.all([p, p2]);
  assert.equal(patches, 1);
  store.itens = [aviso(2)];
  const bulk = adiar();
  let posts = 0;
  service.marcarTodasLidas = () => {
    posts++;
    return bulk.promise;
  };
  const m = store.marcarTodasLidas(),
    m2 = store.marcarTodasLidas();
  bulk.resolve({ data: {} });
  await Promise.all([m, m2]);
  assert.equal(posts, 1);
});
test("falha silenciosa preserva dados; próxima resposta recupera sincronização", async () => {
  service.listar = async () => {
    throw new Error("GET falhou");
  };
  await assert.rejects(store.carregar({ force: true, silencioso: true }));
  assert.equal(store.itens.length, 1);
  assert.equal(store.inicializado, true);
  assert.ok(store.erroAtualizacao);
  service.listar = async () => [{ ...aviso(1), lida: true }];
  await store.carregar({ force: true, silencioso: true });
  assert.equal(store.erroAtualizacao, null);
  assert.equal(store.naoLidas, 0);
});
test("IDs duplicados da paginação não duplicam lista nem contador", async () => {
  service.listar = async () => [aviso(2), aviso(1), aviso(2)];
  await store.carregar({ force: true });
  assert.equal(store.itens.length, 2);
  assert.equal(store.naoLidas, 2);
});
test("reset invalida GET e PATCH antigos, sem contaminar nova sessão", async () => {
  const lista = adiar(),
    patch = adiar();
  service.listar = () => lista.promise;
  service.marcarLida = () => patch.promise;
  const l = store.carregar({ force: true }),
    p = store.marcarLida(1);
  store.resetar();
  store.itens = [aviso(9)];
  lista.resolve([aviso(1)]);
  patch.resolve({ data: { ...aviso(1), lida: true } });
  await Promise.all([l, p]);
  assert.deepEqual(
    store.itens.map((i) => i.id),
    [9],
  );
  assert.equal(store.itens[0].lida, false);
});
