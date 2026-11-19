import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createPinia, setActivePinia } from "pinia";
import services from "./fixtures/realtime-chat.service.mjs";
import { session } from "./fixtures/realtime-api.mjs";

const hook = registerHooks({
  resolve(specifier, context, next) {
    const targets = {
      "@/services/admin.service": "./fixtures/realtime-admin-error.mjs",
      "@/services/chat.service": "./fixtures/realtime-chat.service.mjs",
      "@/services/api": "./fixtures/realtime-api.mjs",
      "@/utils/autoRefresh": "../src/utils/autoRefresh.js",
    };
    if (targets[specifier]) return {
      url: new URL(targets[specifier], import.meta.url).href,
      shortCircuit: true,
    };
    return next(specifier, context);
  },
});
const { useChatStore } = await import("../src/stores/chat.js");
after(() => hook.deregister());

function pendente() {
  let resolver;
  const promise = new Promise(resolve => { resolver = resolve; });
  return { promise, resolver };
}
let store;
beforeEach(() => {
  session.versao = 0;
  setActivePinia(createPinia());
  store = useChatStore();
  services.obter = async () => ({ data: { mensagens: [], nao_lidas: 0 } });
  services.naoLidas = async () => ({ data: { total: 0, por_pedido: [] } });
  services.enviar = async () => ({ data: { id: 1 } });
  services.marcarLidas = async () => ({ data: { marcadas: 0 } });
});

test("GET antigo de conversa não restaura dados de outra sessão após reset", async () => {
  const a = pendente();
  services.obter = () => a.promise;
  const req = store.carregarConversa(55);
  store.resetar();
  a.resolver({ data: { mensagens: [{ id: 2, texto: "privada" }], nao_lidas: 1 } });
  await req;
  assert.equal(store.conversa(55), null);
  assert.equal(store.naoLidas.total, 0);
  assert.equal(store.carregando["55"], undefined);
});

test("GET antigo de não lidas não repopula a store após logout", async () => {
  const a = pendente();
  services.naoLidas = () => a.promise;
  const req = store.carregarNaoLidas();
  session.versao += 1;
  a.resolver({ data: { total: 3, por_pedido: [{ pedido: 9, nao_lidas: 3 }] } });
  await req;
  assert.equal(store.naoLidas.total, 0);
  assert.equal(store.naoLidasInicializado, false);
});

test("POST antigo de chat não adiciona mensagem após reset de conta", async () => {
  const a = pendente();
  services.enviar = () => a.promise;
  const req = store.enviar(33, "Mensagem privada de outra sessão");
  store.resetar();
  a.resolver({ data: { id: 19, texto: "Mensagem privada de outra sessão" } });
  assert.equal(await req, false);
  assert.equal(store.conversa(33), null);
  assert.deepEqual(store.pendentes, {});
});

test("marcação antiga de leitura não altera contadores após troca de sessão", async () => {
  const a = pendente();
  store.conversas["33"] = { nao_lidas: 1, mensagens: [] };
  store.naoLidas = { total: 1, porPedido: { "33": 1 } };
  services.marcarLidas = () => a.promise;
  const req = store.marcarLidas(33);
  store.resetar();
  a.resolver({ data: { marcadas: 1 } });
  assert.equal(await req, 0);
  assert.equal(store.naoLidas.total, 0);
});
