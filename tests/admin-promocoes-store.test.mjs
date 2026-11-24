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

const pagina = (ids = []) => ({
  count: ids.length, page: 1, page_size: 12, total_pages: 1,
  next: null, previous: null,
  results: ids.map(id => ({ id, produto_nome: "Produto " + id })),
});
const resumo = () => ({ total: 3001, ativas: 4, agendadas: 12, encerradas: 2985 });
function inicializar() {
  setActivePinia(createPinia());
  alterarVersao(0);
  service.listarPromocoesAdminPagina = async () => pagina([]);
  service.resumoPromocoesGestao = async () => resumo();
  return useAdminPromocoesStore();
}
function diferir() { let resolver; const promise = new Promise(resolve => { resolver = resolve; }); return { promise, resolver }; }

test("consulta uma página com 3001 ofertas, preservando indicadores globais e filtros no Django", async () => {
  const store = inicializar();
  const filtros = { page: 2, page_size: 12, busca: "Bolo", situacao: "agendada" };
  let recebidos, chamadas = 0;
  service.listarPromocoesAdminPagina = async p => {
    chamadas++; recebidos = p;
    return { ...pagina([12, 13]), count: 3001, page: 2, total_pages: 251, next: "?page=3" };
  };
  await store.carregar(filtros);
  assert.deepEqual(recebidos, filtros);
  assert.equal(chamadas, 1);
  assert.equal(store.pagina.count, 3001);
  assert.equal(store.pagina.results.length, 2);
  assert.deepEqual(store.resumo, resumo());
  assert.deepEqual(store.filtrosAplicados, filtros);
  assert.equal(store.inicializado, true);
});

test("zero resultados do filtro não zera os indicadores globais", async () => {
  const store = inicializar();
  await store.carregar({ busca: "inexistente", page: 1 });
  assert.equal(store.pagina.count, 0);
  assert.equal(store.resumo.total, 3001);
});

test("falha preserva última página e contadores válidos", async () => {
  const store = inicializar();
  service.listarPromocoesAdminPagina = async () => pagina([2]);
  await store.carregar();
  service.listarPromocoesAdminPagina = async () => { throw Error("offline"); };
  await assert.rejects(store.carregar({ page: 2 }), /offline/);
  assert.equal(store.pagina.results[0].id, 2);
  assert.deepEqual(store.resumo, resumo());
  assert.match(store.erro, /preservada/);
});

test("resposta antiga não sobrescreve nova busca", async () => {
  const store = inicializar(), lenta = diferir();
  service.listarPromocoesAdminPagina = () => lenta.promise;
  const anterior = store.carregar({ busca: "antiga" });
  service.listarPromocoesAdminPagina = async () => pagina([5]);
  await store.carregar({ busca: "nova" });
  lenta.resolver(pagina([1]));
  await anterior;
  assert.equal(store.pagina.results[0].id, 5);
  assert.equal(store.filtrosAplicados.busca, "nova");
});

test("resposta de sessão anterior é descartada", async () => {
  const store = inicializar(), pendente = diferir();
  service.listarPromocoesAdminPagina = () => pendente.promise;
  const chamada = store.carregar();
  alterarVersao(1);
  pendente.resolver(pagina([8]));
  await chamada;
  assert.deepEqual(store.pagina.results, []);
  assert.equal(store.resumo, null);
  assert.equal(store.inicializado, false);
});

test("reset invalida consulta pendente sem zerar novo carregamento", async () => {
  const store = inicializar(), pendente = diferir();
  service.listarPromocoesAdminPagina = () => pendente.promise;
  const anterior = store.carregar();
  store.resetar();
  service.listarPromocoesAdminPagina = async () => pagina([10]);
  await store.carregar();
  pendente.resolver(pagina([2]));
  await anterior;
  assert.equal(store.pagina.results[0].id, 10);
  assert.equal(store.carregando, false);
});
