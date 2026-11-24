// API inteiramente fictícia. Duas páginas do MESMO contexto compartilham localStorage.
// Requer Vite em 127.0.0.1:5173 e o Playwright já disponível no ambiente de QA.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = 'http://127.0.0.1:5173';
const jwt = (id, revision = 1) => `fixture.${Buffer.from(JSON.stringify({ user_id: id, jti: revision })).toString('base64url')}.fixture`;
const pair = (id, revision = 1) => ({ access: jwt(id, `a${revision}`), refresh: jwt(id, `r${revision}`) });
const identity = token => { try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).user_id; } catch { return null; } };
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
async function fixture({ blockStorage = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  context.setDefaultTimeout(8_000);
  context.setDefaultNavigationTimeout(15_000);
  await context.addInitScript(() => {
    window.importAppApi = () => {
      // A URL pode conter ?t=... após HMR. Importar outra URL cria outro singleton.
      const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/services/api.js');
      if (!resource) throw new Error('Instância HTTP da aplicação ainda não carregada.');
      return import(resource.name);
    };
  });
  const state = { requests: [], errors: [], hold: null, holdRefresh: null, refreshes: 0 };
  await context.route('https://**/*', route => route.fulfill({ body: '' }));
  await context.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const token = request.headers().authorization?.replace('Bearer ', ''), id = identity(token);
    const revision = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).jti : null;
    state.requests.push({ path, method: request.method(), id, revision });
    if (path === '/token/') return route.fulfill({ json: pair(request.postDataJSON().email.startsWith('b') ? 2 : 1) });
    if (path === '/token/refresh/') {
      state.refreshes++;
      if (state.holdRefresh) return state.holdRefresh(route);
      const refreshId = identity(request.postDataJSON().refresh);
      return route.fulfill({ json: pair(refreshId, 2) });
    }
    if (path === '/token/logout/') return route.fulfill({ json: {} });
    if (path === '/usuarios/me/') return route.fulfill({ json: { id, name: `Cliente fictício ${id}`, email: `${id}@example.invalid`, is_staff: false } });
    if (path === '/probe401/') return route.fulfill({ status: 401, json: {} });
    if (path === '/pedidos/checkout_dinheiro/' && state.hold) return state.hold(route);
    if (path === '/categorias/') return route.fulfill({ json: [] });
    if (path === '/chat/nao_lidas/') return route.fulfill({ json: { total: 0, por_pedido: [] } });
    return route.fulfill({ json: [] });
  });
  const a = await context.newPage();
  if (blockStorage) await a.addInitScript(() => window.addEventListener('storage', e => e.stopImmediatePropagation()));
  await a.goto(`${base}/login`);
  await a.evaluate(async tokens => {
    const { persistTokens } = await window.importAppApi(); persistTokens(tokens);
  }, pair(1));
  await a.reload();
  await a.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('auth')?.usuario?.id === 1);
  await a.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const cart = pinia._s.get('cart'); cart.adicionar({ id: 501, nome: 'Produto fictício A', preco: '5.00' }, 2);
    window.originalDocument = crypto.randomUUID();
  });
  const original = await a.evaluate(() => window.originalDocument);
  const b = await context.newPage(); await b.goto(`${base}/favoritos`);
  await b.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('auth')?.usuario?.id === 1);
  // O perfil já pode estar pronto antes dos GETs disparados pelo layout.
  // A prova deve começar sem respostas iniciais em voo que detectariam B antes da ação.
  await Promise.all([a.waitForLoadState('networkidle'), b.waitForLoadState('networkidle')]);
  a.on('pageerror', error => state.errors.push(error.message)); b.on('pageerror', error => state.errors.push(error.message));
  return { context, a, b, state, original };
}
async function login(b, id) {
  return b.evaluate(async id => {
    const auth = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth');
    return auth.login(`${id === 2 ? 'b' : 'a'}@example.invalid`, 'senha-ficticia');
  }, id);
}
async function switched(a, original, id) {
  await a.waitForFunction(original => window.originalDocument !== original, original);
  await a.waitForFunction(id => {
    const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia;
    return pinia && (pinia._s.get('auth')?.usuario?.id ?? null) === id && pinia._s.get('cart')?.totalItens === 0;
  }, id);
}
async function mayNavigate(promise) {
  try { return await promise; } catch (error) {
    if (!/Execution context was destroyed/.test(error.message)) throw error;
  }
}
async function scenario(name, run, options) {
  const filter = process.argv.find(arg => arg.startsWith('--filter='))?.slice(9);
  if (filter && !name.includes(filter)) return;
  const data = await fixture(options);
  try { await run(data); assert.deepEqual(data.state.errors, []); results.push(name); console.log(`PASS ${name}`); }
  catch (error) { console.error({ scenario: name, requests: data.state.requests, errors: data.state.errors,
    debug: await data.a.evaluate(() => ({ original: window.originalDocument, refreshDone: window.refreshDone, pointer: localStorage.getItem('pp_session_id'), ready: document.readyState })).catch(() => null) }); throw error; }
  finally { await data.context.close(); }
}
try {
  await scenario('login externo A→B limpa carrinho e substitui documento da aba A', async ({ a, b, original }) => {
    assert.equal((await login(b, 2)).ok, true); await switched(a, original, 2);
    assert.equal(await a.evaluate(async () => {
      const { getAccessToken } = await window.importAppApi(); return JSON.parse(atob(getAccessToken().split('.')[1])).user_id;
    }), 2);
  });
  if (process.argv.includes('--red')) process.exitCode = 0;
  else {
    await scenario('checkout antes do storage event não envia itens A com token B', async ({ a, b, state, original }) => {
      await login(b, 2);
      await mayNavigate(a.evaluate(() => {
        window.probe = window.importAppApi().then(({ default: api }) => api.post('/pedidos/checkout_dinheiro/', { itens_criacao: [{ produto: 501, quantidade: 2 }] })).then(() => 'indevido', e => e.code);
      }));
      await switched(a, original, 2);
      assert.equal(state.requests.filter(r => r.path === '/pedidos/checkout_dinheiro/').length, 0);
    }, { blockStorage: true });
    await scenario('logout externo remove conta e carrinho sem aguardar nova interação', async ({ a, b, original }) => {
      await b.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth').logout());
      await switched(a, original, null);
      assert.equal(await a.evaluate(async () => (await window.importAppApi()).getAccessToken()), null);
    });
    await scenario('checkout A pendente não produz resultado nem limpa B', async ({ a, b, state, original }) => {
      let release, started;
      const ready = new Promise(resolve => { started = resolve; });
      state.hold = route => { started(); return new Promise(resolve => { release = async () => { await route.fulfill({ json: { pedido: { id: 12345 } } }).catch(() => {}); resolve(); }; }); };
      await a.evaluate(() => { window.checkout = window.importAppApi().then(({ default: api }) => api.post('/pedidos/checkout_dinheiro/', { itens_criacao: [{ produto: 501, quantidade: 2 }] })).then(() => { document.body.dataset.oldCheckout = 'indevido'; }, () => {}); });
      await ready; await login(b, 2); await switched(a, original, 2); await release();
      assert.equal(await a.getAttribute('body', 'data-old-checkout'), null);
      assert.equal(state.requests.filter(r => r.path === '/pedidos/checkout_dinheiro/').length, 1);
      assert.equal(state.requests.find(r => r.path === '/pedidos/checkout_dinheiro/').id, 1);
    });
    await scenario('refresh externo da mesma conta preserva documento/carrinho/operação pendente', async ({ a, b, state, original }) => {
      let release, started; const ready = new Promise(resolve => { started = resolve; });
      state.hold = route => { started(); return new Promise(resolve => { release = async () => { await route.fulfill({ json: { ficticio: true } }); resolve(); }; }); };
      await a.evaluate(() => { window.pending = window.importAppApi().then(({ default: api }) => api.post('/pedidos/checkout_dinheiro/', {})).then(() => 'ok', () => 'cancelado'); }); await ready;
      // Renovação HTTP real da instância B, sem login ou persistTokens.
      await b.evaluate(async () => { const { default: api } = await window.importAppApi(); await api.get('/probe401/').catch(() => {}); });
      await release(); assert.equal(await a.evaluate(() => window.pending), 'ok');
      assert.equal(await a.evaluate(() => window.originalDocument), original);
      assert.equal(await a.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('cart').totalItens), 2);
      assert.equal(state.refreshes, 1);
      assert.deepEqual(await b.evaluate(async () => { const api = await window.importAppApi(); return { access: api.getAccessToken(), refresh: api.getRefreshToken() }; }), pair(1, 2));
      assert.ok(state.requests.some(request => request.path === '/probe401/' && request.revision === 'a2'));
    });
    await scenario('A→B→A antes do evento invalida geração do login original', async ({ a, b, original }) => {
      await login(b, 2); await login(b, 1);
      await mayNavigate(a.evaluate(async () => { const { getSessionVersion } = await window.importAppApi(); getSessionVersion(); }));
      await switched(a, original, 1);
    }, { blockStorage: true });
    for (const refused of [false, true]) await scenario(`refresh A ${refused ? 'recusado' : 'concluído'} após login B preserva tokens B`, async ({ a, b, original, state }) => {
      let release, started; const ready = new Promise(resolve => { started = resolve; });
      state.holdRefresh = route => { started(); return new Promise(resolve => { release = async () => {
        await route.fulfill(refused ? { status: 401, json: {} } : { json: pair(1, 2) }).catch(() => {}); resolve();
      }; }); };
      await a.evaluate(() => { window.refreshing = window.importAppApi().then(({ default: api }) => api.get('/probe401/')).then(() => { window.refreshDone = 'ok'; }, e => { window.refreshDone = e.code; }); });
      await ready; assert.equal((await login(b, 2)).ok, true); await release(); await switched(a, original, 2);
      assert.deepEqual(await b.evaluate(async () => { const api = await window.importAppApi(); return { access: api.getAccessToken(), refresh: api.getRefreshToken() }; }), pair(2));
      assert.equal(state.refreshes, 1);
    }, { blockStorage: true });
    await scenario('logout tardio A antes do evento não remove nem revoga B', async ({ a, b, original, state }) => {
      await login(b, 2);
      await mayNavigate(a.evaluate(() => { document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth').logout(); }));
      await switched(a, original, 2);
      assert.equal(state.requests.filter(r => r.path === '/token/logout/').length, 0);
      assert.deepEqual(await b.evaluate(async () => { const api = await window.importAppApi(); return { access: api.getAccessToken(), refresh: api.getRefreshToken() }; }), pair(2));
    }, { blockStorage: true });
  }
  console.log(JSON.stringify({ passed: results.length, scenarios: results }, null, 2));
} finally { await browser.close(); }
