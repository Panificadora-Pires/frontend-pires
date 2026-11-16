import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import axios from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { adiar } from './fixtures/cart-component.mjs';

const owningUrl = new URL('../src/services/api.js', import.meta.url).href;
const hooks = registerHooks({ resolve(specifier, context, next) {
  const aliases = { '@/services/api': '../src/services/api.js', '@/services/auth.service': '../src/services/auth.service.js', '@/stores/cart': '../src/stores/cart.js' };
  if (aliases[specifier]) return { url: new URL(aliases[specifier], import.meta.url).href, shortCircuit: true };
  if (specifier === './api' && context.parentURL === new URL('../src/services/auth.service.js', import.meta.url).href) return { url: owningUrl, shortCircuit: true };
  return next(specifier, context);
}, load(url, context, next) {
  const loaded = next(url, context);
  if (url !== owningUrl) return loaded;
  return { ...loaded, source: Buffer.from(loaded.source).toString().replaceAll('import.meta.env', '({})') };
} });
const originalCreate = axios.create.bind(axios), originalPost = axios.post;
let responder, renovar;
axios.create = config => originalCreate({ ...config, adapter: config => responder(config) });
axios.post = (...args) => renovar(...args);
const apiModule = await import('../src/services/api.js');
const api = apiModule.default;
const { persistTokens, clearTokens, getAccessToken, getRefreshToken } = apiModule;
const { useAuthStore } = await import('../src/stores/auth.js');
const { useCartStore } = await import('../src/stores/cart.js');
after(() => { hooks.deregister(); axios.create = originalCreate; axios.post = originalPost; });
const dados = new Map();
let redirecionamentos;
let storageInicializado = false;
beforeEach(() => {
  setActivePinia(createPinia());
  // Encerra pela API dona da sessão antes de reiniciar o storage de teste.
  if (storageInicializado) clearTokens();
  globalThis.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k,v) => dados.set(k,v), removeItem: k => dados.delete(k) };
  storageInicializado = true;
  redirecionamentos = []; globalThis.window = { location: { pathname: '/checkout', replace: path => redirecionamentos.push(path) } };
  clearTokens(); persistTokens({ access: 'access-a', refresh: 'refresh-a' });
});
const ok = config => ({ status: 200, data: { ficticio: true }, config, headers: {} });
const negar = config => new axios.AxiosError('401 fictício', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, config });
test('401 de checkout A após login B não renova nem reenvia com credenciais B', async () => {
  const http = adiar(), iniciou = adiar(); let requests = 0, refreshes = 0;
  responder = config => { requests++; iniciou.resolve(config); return http.promise; };
  renovar = () => { refreshes++; return Promise.resolve({ data: { access: 'indevido' } }); };
  const pedido = api.post('/pedidos/checkout_dinheiro/', { itens_criacao: [{ produto: 1, quantidade: 1 }] });
  const config = await iniciou.promise; assert.equal(config.headers.Authorization, 'Bearer access-a');
  persistTokens({ access: 'access-b', refresh: 'refresh-b' }); http.reject(negar(config));
  await assert.rejects(pedido); assert.equal(refreshes, 0); assert.equal(requests, 1); assert.equal(getAccessToken(), 'access-b');
});
test('requisição captura A no início síncrono antes de login B no mesmo turno', async () => {
  const http = adiar(); let configEnviada;
  responder = config => { configEnviada = config; return http.promise; };
  const pedido = api.post('/pedidos/checkout_dinheiro/', { itens_criacao: [{ produto: 1, quantidade: 1 }] });
  persistTokens({ access: 'access-b', refresh: 'refresh-b' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(configEnviada.headers.Authorization, 'Bearer access-a');
  http.resolve(ok(configEnviada)); await assert.rejects(pedido);
});
for (const falha of [false, true]) {
  test(`refresh A ${falha ? 'recusado' : 'concluído'} após B não sobrescreve/limpa B nem redireciona`, async () => {
    const refresh = adiar(), iniciou = adiar();
    responder = async config => { throw negar(config); };
    renovar = () => { iniciou.resolve(); return refresh.promise; };
    const pedido = api.get('/perfil/'); await iniciou.promise;
    persistTokens({ access: 'access-b', refresh: 'refresh-b' });
    if (falha) refresh.reject({ response: { status: 401 } });
    else refresh.resolve({ data: { access: 'access-a-novo', refresh: 'refresh-a-novo' } });
    await assert.rejects(pedido); assert.equal(getAccessToken(), 'access-b'); assert.equal(getRefreshToken(), 'refresh-b');
    assert.deepEqual(redirecionamentos, []);
  });
}
test('finally de refresh A não apaga singleflight de B e refresh legítimo mantém versão', { timeout: 2_000 }, async () => {
  const refreshA = adiar(), refreshB = adiar(), iniciouA = adiar(), iniciouB = adiar(), entrouSegundoB = adiar();
  let refreshes = 0, requestsB = 0;
  responder = async config => {
    if (config._authRetry) return ok(config);
    if (config.headers.Authorization === 'Bearer access-b' && ++requestsB === 2) entrouSegundoB.resolve();
    throw negar(config);
  };
  renovar = (_url, { refresh }) => {
    refreshes++;
    if (refresh === 'refresh-a') { iniciouA.resolve(); return refreshA.promise; }
    iniciouB.resolve(); return refreshB.promise;
  };
  const pedidoA = api.get('/a/'); await iniciouA.promise;
  persistTokens({ access: 'access-b', refresh: 'refresh-b' });
  const versaoB = apiModule.getSessionVersion();
  const pedidoB = api.get('/b/'); await iniciouB.promise;
  refreshA.resolve({ data: { access: 'access-a-novo' } }); await assert.rejects(pedidoA);
  const outroB = api.get('/b2/'); await entrouSegundoB.promise;
  // Deixa o segundo 401 alcançar o interceptor antes de concluir o refresh B.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshes, 2);
  refreshB.resolve({ data: { access: 'access-b-novo', refresh: 'refresh-b-novo' } });
  await Promise.all([pedidoB, outroB]);
  assert.equal(getAccessToken(), 'access-b-novo'); assert.equal(getRefreshToken(), 'refresh-b-novo');
  assert.equal(apiModule.getSessionVersion(), versaoB);
});
test('resposta bem sucedida de A após logout é descartada antes de chegar ao consumidor', async () => {
  const http = adiar(), iniciou = adiar(); responder = config => { iniciou.resolve(config); return http.promise; };
  const perfil = api.get('/perfil/'); const config = await iniciou.promise;
  clearTokens(); http.resolve(ok(config)); await assert.rejects(perfil);
});
test('falha de rede no refresh atual conserva tokens para retentar', async () => {
  responder = async config => { throw negar(config); }; renovar = async () => { throw new Error('offline fictício'); };
  await assert.rejects(api.get('/perfil/'));
  assert.equal(getAccessToken(), 'access-a'); assert.equal(getRefreshToken(), 'refresh-a'); assert.deepEqual(redirecionamentos, []);
});
for (const metodo of ['login', 'loginWithGoogle']) {
  test(`${metodo}: perfil401 e refresh401 atuais encerram loading e mostram erro na rota pública`, async () => {
    window.location.pathname = '/login';
    const auth = useAuthStore(); let perfis = 0, refreshes = 0;
    responder = async config => {
      if (['/token/', '/social/google/'].includes(config.url)) return { ...ok(config), data: { access: 'access-login', refresh: 'refresh-login' } };
      assert.equal(config.url, '/usuarios/me/'); perfis++; throw negar(config);
    };
    renovar = async () => { refreshes++; throw negar({ url: '/token/refresh/' }); };
    const resultado = await auth[metodo]('ficticio@example.test', 'senha-ficticia');
    assert.equal(perfis, 1); assert.equal(refreshes, 1);
    assert.equal(resultado.ok, false); assert.notEqual(resultado.ignorado, true);
    assert.equal(auth.carregando, false); assert.ok(auth.erro); assert.equal(auth.usuario, null);
    assert.equal(getAccessToken(), null); assert.equal(getRefreshToken(), null); assert.deepEqual(redirecionamentos, []);
  });
}
test('falha do refresh A não encerra loading nem mostra erro enquanto login B aguarda perfil', async () => {
  window.location.pathname = '/login';
  const auth = useAuthStore(), cart = useCartStore();
  const refreshA = adiar(), iniciouRefresh = adiar(), perfilB = adiar(), iniciouPerfilB = adiar(); let logins = 0;
  responder = async config => {
    if (config.url === '/token/') {
      const conta = ++logins === 1 ? 'a' : 'b';
      return { ...ok(config), data: { access: `access-${conta}`, refresh: `refresh-${conta}` } };
    }
    if (config.headers.Authorization === 'Bearer access-a') throw negar(config);
    iniciouPerfilB.resolve(config); return perfilB.promise;
  };
  renovar = () => { iniciouRefresh.resolve(); return refreshA.promise; };
  const loginA = auth.login('a@example.test', 'senha-ficticia'); await iniciouRefresh.promise;
  const loginB = auth.login('b@example.test', 'senha-ficticia'); const configB = await iniciouPerfilB.promise;
  refreshA.reject(negar({ url: '/token/refresh/' })); const resultadoA = await loginA;
  assert.equal(resultadoA.ignorado, true); assert.equal(auth.carregando, true); assert.equal(auth.erro, null); assert.equal(getAccessToken(), 'access-b');
  perfilB.resolve({ ...ok(configB), data: { id: 2 } }); const resultadoB = await loginB;
  assert.equal(resultadoB.ok, true); assert.equal(auth.usuario.id, 2); assert.equal(cart.contaId, '2'); assert.equal(auth.carregando, false);
});
