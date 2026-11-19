import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service, { alterarVersao } from "./fixtures/admin-promocoes.service.mjs";

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/services/admin.service" || specifier === "@/services/api") {
    return { url: new URL("./fixtures/admin-promocoes.service.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { useAdminPromocoesStore } = await import("../src/stores/adminPromocoes.js");
after(() => hook.deregister());
function inicializar() {
  setActivePinia(createPinia());
  alterarVersao(0);
  service.listarPromocoes = async () => [];
  return useAdminPromocoesStore();
}
function diferir() { let resolver; const promise = new Promise(resolve => { resolver = resolve; }); return { promise, resolver }; }

test("carrega lista real, inclusive vazia, sem fabricar indicadores", async () => {
  const s = inicializar();
  service.listarPromocoes = async () => [{ id: 4, produto_nome: "Bolo" }];
  await s.carregar();
  assert.equal(s.inicializado, true);
  assert.equal(s.itens[0].id, 4);
  assert.equal(s.erro, null);
});
test("falha preserva último sucesso e distingue erro de lista vazia", async () => {
  const s = inicializar();
  service.listarPromocoes = async () => [{ id: 2 }];
  await s.carregar();
  service.listarPromocoes = async () => { throw Error("offline"); };
  await assert.rejects(s.carregar(), /offline/);
  assert.deepEqual(s.itens, [{ id: 2 }]);
  assert.match(s.erro, /preservada/);
});
test("resposta antiga não sobrescreve consulta mais recente", async () => {
  const s = inicializar(), lenta = diferir();
  service.listarPromocoes = () => lenta.promise;
  const anterior = s.carregar();
  service.listarPromocoes = async () => [{ id: 5 }];
  await s.carregar();
  lenta.resolver([{ id: 1 }]);
  await anterior;
  assert.deepEqual(s.itens, [{ id: 5 }]);
});
test("resposta de sessão anterior é descartada", async () => {
  const s = inicializar(), pendente = diferir();
  service.listarPromocoes = () => pendente.promise;
  const p = s.carregar();
  alterarVersao(1);
  pendente.resolver([{ id: 8 }]);
  await p;
  assert.deepEqual(s.itens, []);
  assert.equal(s.inicializado, false);
});
test("reset permite novo carregamento sem aceitar resultado antigo", async () => {
  const s = inicializar(), pendente = diferir();
  service.listarPromocoes = () => pendente.promise;
  const p = s.carregar();
  s.resetar();
  service.listarPromocoes = async () => [{ id: 10 }];
  await s.carregar();
  pendente.resolver([{ id: 2 }]);
  await p;
  assert.equal(s.itens[0].id, 10);
});
