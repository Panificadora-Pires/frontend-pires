import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service, { alterarVersao } from "./fixtures/admin-usuarios.service.mjs";

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/services/admin.service" || specifier === "@/services/api") {
    return { url: new URL("./fixtures/admin-usuarios.service.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { useAdminUsuariosStore } = await import("../src/stores/adminUsuarios.js");
after(() => hook.deregister());

const page = () => ({
  count: 1, page: 1, page_size: 18, total_pages: 1, next: null, previous: null,
  results: [{ id: 4, name: "Joana", email: "joana@example.com" }],
});
const summary = () => ({ total: 1, administradores: 0, clientes: 1, ativas: 1, emails_verificados: 1 });
function iniciar() {
  setActivePinia(createPinia());
  alterarVersao(0);
  service.listarUsuariosAdminPagina = async () => page();
  service.resumoUsuariosAdmin = async () => summary();
  return useAdminUsuariosStore();
}
function diferir() {
  let resolver;
  const promise = new Promise(resolve => { resolver = resolve; });
  return { resolver, promise };
}
test("consulta apenas uma página e os totais globais sem agregação client-side", async () => {
  const store = iniciar();
  const filtros = { page: 2, page_size: 18, busca: "joana", perfil: "cliente" };
  let consultados;
  service.listarUsuariosAdminPagina = async p => {
    consultados = p;
    return { ...page(), page: 2, count: 32, total_pages: 2 };
  };
  await store.carregar(filtros);
  assert.deepEqual(consultados, filtros);
  assert.equal(store.pagina.count, 32);
  assert.equal(store.pagina.results.length, 1);
  assert.equal(store.resumo.total, 1);
  assert.equal(store.erro, null);
  assert.equal(store.inicializado, true);
});
test("falha mantém os últimos dados válidos", async () => {
  const store = iniciar();
  await store.carregar({});
  service.listarUsuariosAdminPagina = async () => { throw new Error("offline"); };
  await assert.rejects(store.carregar({ busca: "outra" }), /offline/);
  assert.equal(store.pagina.results[0].name, "Joana");
  assert.match(store.erro, /preservada/);
});
test("consulta antiga não sobrescreve filtros mais recentes", async () => {
  const store = iniciar(), lenta = diferir();
  service.listarUsuariosAdminPagina = () => lenta.promise;
  const antiga = store.carregar({ busca: "antiga" });
  service.listarUsuariosAdminPagina = async () => ({
    ...page(), results: [{ id: 7, name: "Maria" }],
  });
  await store.carregar({ busca: "nova" });
  lenta.resolver(page());
  await antiga;
  assert.equal(store.pagina.results[0].name, "Maria");
  assert.equal(store.consultaAplicada.busca, "nova");
});
test("mudança de sessão descarta dados em trânsito", async () => {
  const store = iniciar(), lenta = diferir();
  service.listarUsuariosAdminPagina = () => lenta.promise;
  const pendente = store.carregar({});
  alterarVersao(1);
  lenta.resolver(page());
  await pendente;
  assert.equal(store.inicializado, false);
  assert.equal(store.pagina.results.length, 0);
});
test("reset impede reintroduzir dados antigos após sair da página", async () => {
  const store = iniciar(), lenta = diferir();
  service.listarUsuariosAdminPagina = () => lenta.promise;
  const antiga = store.carregar({});
  store.resetar();
  service.listarUsuariosAdminPagina = async () => ({
    ...page(), results: [{ id: 9, name: "Atual" }],
  });
  await store.carregar({});
  lenta.resolver(page());
  await antiga;
  assert.equal(store.pagina.results[0].name, "Atual");
});
