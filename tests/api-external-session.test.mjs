import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import axios from 'axios';
import { adiar } from './fixtures/cart-component.mjs';

const source = new URL('../src/services/api.js', import.meta.url).href;
registerHooks({ load(url, context, next) {
  const loaded = next(url, context);
  return url.startsWith(source) ? { ...loaded, source: Buffer.from(loaded.source).toString().replaceAll('import.meta.env', '({})') } : loaded;
} });
const jwt = (id, revision = 1) => `fixture.${Buffer.from(JSON.stringify({ user_id: id, jti: revision })).toString('base64url')}.fixture`;
const pair = (id, revision = 1) => ({ access: jwt(id, `a${revision}`), refresh: jwt(id, `r${revision}`) });
let serial = 0;
async function aba({ legacy = false } = {}) {
  const dados = new Map(), listeners = new Map();
  if (legacy) { dados.set('pp_access_token', pair(1).access); dados.set('pp_refresh_token', pair(1).refresh); }
  globalThis.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v), removeItem: k => dados.delete(k) };
  globalThis.window = { addEventListener: (type, fn) => listeners.set(type, fn), location: { pathname: '/checkout', replace() {} } };
  const module = await import(`${source}?tab=${++serial}`);
  if (!legacy) module.persistTokens(pair(1));
  const salvos = () => JSON.parse(dados.get(`pp_session_tokens:${dados.get('pp_session_id')}`) ?? 'null');
  return { ...module, salvos, escrever(tokens) {
    const current = salvos();
    if (!tokens.access && !tokens.refresh) {
      dados.set(`pp_session_revoked:${dados.get('pp_session_id')}`, 'true');
      dados.delete(`pp_session_tokens:${dados.get('pp_session_id')}`); return;
    }
    const owner = value => value && JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).user_id;
    const sessionId = owner(current?.access) === owner(tokens.access) ? dados.get('pp_session_id') : crypto.randomUUID();
    dados.set(`pp_session_tokens:${sessionId}`, JSON.stringify({ ...tokens, sessionId }));
    dados.set('pp_session_id', sessionId);
  }, evento(key = `pp_session_tokens:${dados.get('pp_session_id')}`) { listeners.get('storage')?.({ key, storageArea: localStorage }); }, dados };
}
const ok = config => ({ status: 200, data: { privado: true }, config, headers: {} });
const negar = config => new axios.AxiosError('401 fictício', 'ERR_BAD_REQUEST', config, null, { status: 401, config });

test('troca externa A→B bloqueia checkout antes do storage event e não envia token B', async () => {
  const tab = await aba(); let requests = 0;
  tab.default.defaults.adapter = async config => { requests++; return ok(config); };
  tab.escrever(pair(2));
  await assert.rejects(tab.default.post('/pedidos/checkout_dinheiro/', { itens_criacao: [{ produto: 1, quantidade: 2 }] }), { code: 'ERR_CANCELED' });
  assert.equal(requests, 0);
  assert.equal(tab.salvos().access, pair(2).access);
});

for (const status of [200, 401]) test(`resposta ${status} pendente de A após troca externa é cancelada sem refresh B`, async () => {
  const tab = await aba(), http = adiar(); let config, refreshes = 0;
  const originalPost = axios.post;
  axios.post = async () => { refreshes++; return { data: pair(2, 2) }; };
  try {
    tab.default.defaults.adapter = cfg => { config = cfg; return http.promise; };
    const request = tab.default.get('/usuarios/me/'); tab.escrever(pair(2));
    if (status === 200) http.resolve(ok(config)); else http.reject(negar(config));
    await assert.rejects(request, { code: 'ERR_CANCELED' }); assert.equal(refreshes, 0);
  } finally { axios.post = originalPost; }
});

for (const failure of [false, true]) test(`refresh A tardio ${failure ? 'recusado' : 'bem sucedido'} não altera tokens externos B`, async () => {
  const tab = await aba(), http = adiar(), started = adiar(); const originalPost = axios.post;
  tab.default.defaults.adapter = async config => { throw negar(config); };
  axios.post = () => { started.resolve(); return http.promise; };
  try {
    const request = tab.default.get('/usuarios/me/'); await started.promise; tab.escrever(pair(2));
    if (failure) http.reject({ response: { status: 401 } }); else http.resolve({ data: pair(1, 2) });
    await assert.rejects(request, { code: 'ERR_CANCELED' });
    assert.equal(tab.salvos().access, pair(2).access);
    assert.equal(tab.salvos().refresh, pair(2).refresh);
  } finally { axios.post = originalPost; }
});

test('logout/persistência tardios em A não apagam nem substituem B', async () => {
  const tab = await aba(); tab.escrever(pair(2));
  tab.clearTokens(); tab.persistTokens(pair(1, 2));
  assert.equal(tab.salvos().access, pair(2).access);
  assert.equal(tab.salvos().refresh, pair(2).refresh);
});

test('remoção externa invalida versão imediatamente e mantém aba suspensa', async () => {
  const tab = await aba(), version = tab.getSessionVersion(); tab.escrever({});
  assert.notEqual(tab.getSessionVersion(), version);
  tab.escrever(pair(2));
  tab.default.defaults.adapter = async config => ok(config);
  await assert.rejects(tab.default.get('/usuarios/me/'), { code: 'ERR_CANCELED' });
});

test('storage event descobre remoção e ignora chaves alheias', async () => {
  const tab = await aba(), version = tab.getSessionVersion();
  let suspended = 0;
  tab.onExternalSessionChange(() => suspended++);
  tab.escrever({}); tab.evento('preferencia');
  assert.equal(suspended, 0);
  // Observa a versão somente depois do evento relevante, sem depender de polling.
  tab.evento();
  assert.equal(suspended, 1);
  assert.notEqual(tab.getSessionVersion(), version);
  tab.evento(); assert.equal(suspended, 1);
});

test('refresh externo da mesma conta conserva versão, resposta pendente e usa access renovado', async () => {
  const tab = await aba(), version = tab.getSessionVersion(), http = adiar(); let config;
  tab.default.defaults.adapter = cfg => { config = cfg; return http.promise; };
  const request = tab.default.get('/usuarios/me/');
  tab.escrever(pair(1, 2)); tab.evento(); http.resolve(ok(config)); await request;
  assert.equal(tab.getSessionVersion(), version);
  tab.default.defaults.adapter = async cfg => { assert.equal(cfg.headers.Authorization, `Bearer ${pair(1, 2).access}`); return ok(cfg); };
  await tab.default.get('/usuarios/me/');
});

test('refresh local pendente não sobrescreve renovação externa mais recente da mesma conta', async () => {
  const tab = await aba(), http = adiar(), started = adiar(); const originalPost = axios.post;
  tab.default.defaults.adapter = async cfg => { if (cfg._authRetry) return ok(cfg); throw negar(cfg); };
  axios.post = () => { started.resolve(); return http.promise; };
  try {
    const request = tab.default.get('/usuarios/me/'); await started.promise;
    tab.escrever(pair(1, 3)); http.resolve({ data: pair(1, 2) }); await request;
    assert.equal(tab.salvos().access, pair(1, 3).access);
  } finally { axios.post = originalPost; }
});

test('novo login externo da mesma conta invalida operações mesmo depois de A→B→A antes do evento', async () => {
  const tab = await aba(), version = tab.getSessionVersion();
  tab.escrever(pair(2)); tab.escrever(pair(1));
  assert.notEqual(tab.getSessionVersion(), version);
});

test('logout A intercalado com login B entre operações storage não remove credenciais B', async () => {
  const tab = await aba(), originalSet = localStorage.setItem; let interleaved = false;
  localStorage.setItem = (key, value) => {
    originalSet(key, value);
    if (!interleaved) { interleaved = true; tab.escrever(pair(2)); }
  };
  tab.clearTokens();
  assert.equal(tab.salvos().access, pair(2).access); assert.equal(tab.salvos().refresh, pair(2).refresh);
});

for (const logout of [false, true]) test(`refresh intercalado com ${logout ? 'logout A' : 'login B'} durante escrita não ressuscita A nem envia checkout com B`, async () => {
  const tab = await aba(), originalPost = axios.post, originalSet = localStorage.setItem;
  const sent = []; let interleaved = false;
  localStorage.setItem = (key, value) => {
    if (!interleaved) { interleaved = true; tab.escrever(logout ? {} : pair(2)); }
    originalSet(key, value);
  };
  tab.default.defaults.adapter = async cfg => { sent.push(cfg.headers.Authorization); if (cfg._authRetry) return ok(cfg); throw negar(cfg); };
  axios.post = async () => ({ data: pair(1, 2) });
  try {
    await assert.rejects(tab.default.post('/pedidos/checkout_dinheiro/', {}), { code: 'ERR_CANCELED' });
    assert.deepEqual(sent, [`Bearer ${pair(1).access}`]);
    if (!logout) { assert.equal(tab.salvos().access, pair(2).access); assert.equal(tab.salvos().refresh, pair(2).refresh); }
    else assert.equal(tab.getAccessToken(), null);
  } finally { axios.post = originalPost; }
});

test('sessão legada renova pelo bundle sem mutar tokens brutos e conserva versão', async () => {
  const tab = await aba({ legacy: true }), version = tab.getSessionVersion(), originalPost = axios.post;
  tab.default.defaults.adapter = async cfg => { if (cfg._authRetry) return ok(cfg); throw negar(cfg); };
  axios.post = async () => ({ data: pair(1, 2) });
  try {
    await tab.default.get('/usuarios/me/');
    assert.equal(tab.getAccessToken(), pair(1, 2).access); assert.equal(tab.getSessionVersion(), version);
    assert.equal(tab.dados.get('pp_access_token'), pair(1).access); assert.equal(tab.dados.get('pp_refresh_token'), pair(1).refresh);
    assert.equal(tab.dados.get('pp_session_id'), undefined);
  } finally { axios.post = originalPost; }
});

test('revogação legada durante refresh continua encerrada inclusive em nova aba', async () => {
  const tab = await aba({ legacy: true }), originalPost = axios.post, originalSet = localStorage.setItem;
  tab.getSessionVersion();
  tab.default.defaults.adapter = async cfg => { if (cfg._authRetry) return ok(cfg); throw negar(cfg); };
  localStorage.setItem = (key, value) => {
    tab.dados.set('pp_session_revoked:legacy', JSON.stringify({ sourceAccess: pair(1).access, sourceRefresh: pair(1).refresh }));
    originalSet(key, value);
  };
  axios.post = async () => ({ data: pair(1, 2) });
  try {
    await assert.rejects(tab.default.get('/usuarios/me/'), { code: 'ERR_CANCELED' });
    assert.equal(tab.getAccessToken(), null);
    const another = await import(`${source}?tab=${++serial}`);
    assert.equal(another.getAccessToken(), null); assert.equal(another.getRefreshToken(), null);
  } finally { axios.post = originalPost; }
});
