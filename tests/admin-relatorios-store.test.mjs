import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import service, { alterarVersao, exemplo } from "./fixtures/admin-relatorios.service.mjs";

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/services/admin.service" || specifier === "@/services/api") {
    return { url: new URL("./fixtures/admin-relatorios.service.mjs", import.meta.url).href, shortCircuit: true };
  }
  if (specifier === "@/utils/adminRelatorios") {
    return { url: new URL("../src/utils/adminRelatorios.js", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { useAdminRelatoriosStore } = await import("../src/stores/adminRelatorios.js");
after(() => hook.deregister());

function iniciar() {
  setActivePinia(createPinia());
  alterarVersao(0);
  service.relatorioAnaliticoAdmin = async () => structuredClone(exemplo);
  service.maisVendidos = async () => ({ resultado: [{ produto_id: 1, produto_nome: "Coxinha", quantidade_vendida: 2 }] });
  return useAdminRelatoriosStore();
}
const filtro = { inicio: "2026-11-19", fim: "2026-11-19" };
function diferir() {
  let resolver; const promise = new Promise(resolve => { resolver = resolve; });
  return { resolver, promise };
}

test("store carrega análise e ranking com contrato íntegro", async () => {
  const store = iniciar();
  await store.carregar(filtro);
  assert.equal(store.inicializado, true);
  assert.equal(store.relatorio.resumo.total_vendido, "6.00");
  assert.equal(store.ranking[0].produto_nome, "Coxinha");
  assert.equal(store.erro, null);
});
test("falha preserva os dados anteriores e não inventa zeros", async () => {
  const store = iniciar();
  await store.carregar(filtro);
  service.relatorioAnaliticoAdmin = async () => { throw Error("offline"); };
  await assert.rejects(store.carregar(filtro), /offline/);
  assert.equal(store.relatorio.resumo.total_vendido, "6.00");
  assert.match(store.erro, /último relatório válido/);
});
test("resposta mais antiga não substitui último período recebido", async () => {
  const store = iniciar(), lento = diferir();
  service.relatorioAnaliticoAdmin = () => lento.promise;
  const antigo = store.carregar(filtro);
  service.relatorioAnaliticoAdmin = async () => structuredClone(exemplo);
  await store.carregar(filtro);
  lento.resolver(structuredClone(exemplo));
  await antigo;
  assert.equal(store.relatorio.resumo.total_vendido, "6.00");
});
test("mudança de sessão rejeita dados recebidos depois", async () => {
  const store = iniciar(), lento = diferir();
  service.relatorioAnaliticoAdmin = () => lento.promise;
  const pendente = store.carregar(filtro);
  alterarVersao(1);
  lento.resolver(structuredClone(exemplo));
  await pendente;
  assert.equal(store.inicializado, false);
  assert.equal(store.relatorio, null);
});
test("contrato inconsistente não é exibido como resultado", async () => {
  const store = iniciar();
  service.relatorioAnaliticoAdmin = async () => {
    const inconsistente = structuredClone(exemplo);
    inconsistente.resumo.total_vendido = "999.00";
    return inconsistente;
  };
  await assert.rejects(store.carregar(filtro), /não correspondem/);
  assert.equal(store.relatorio, null);
  assert.equal(store.inicializado, false);
  assert.ok(store.erro);
});
test("reset da tela descarta chamada antiga", async () => {
  const store = iniciar(), lento = diferir();
  service.relatorioAnaliticoAdmin = () => lento.promise;
  const pendente = store.carregar(filtro);
  store.resetar();
  service.relatorioAnaliticoAdmin = async () => structuredClone(exemplo);
  await store.carregar(filtro);
  lento.resolver(structuredClone(exemplo));
  await pendente;
  assert.equal(store.relatorio.resumo.total_vendido, "6.00");
  assert.equal(store.inicializado, true);
});
