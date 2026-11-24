import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createPinia, setActivePinia } from 'pinia';
import { authService, clearTokens, persistTokens, tokens } from './fixtures/cart-auth.service.mjs';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (['@/services/api', '@/services/auth.service'].includes(specifier)) return { url: new URL('./fixtures/cart-auth.service.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === '@/stores/cart') return { url: new URL('../src/stores/cart.js', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { useAuthStore } = await import('../src/stores/auth.js');
after(() => hooks.deregister());
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
let auth, storage;
beforeEach(() => {
  setActivePinia(createPinia()); auth = useAuthStore(); clearTokens();
  storage = new Map();
  globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
});

test('duas submissões de login enviam somente uma requisição', async () => {
  const wait = deferred(); let calls = 0;
  authService.login = () => { calls++; return wait.promise; };
  authService.getProfile = async () => ({ data: { id: 1 } });
  const first = auth.login('synthetic@example.test', 'senha-ficticia');
  const second = auth.login('synthetic@example.test', 'senha-ficticia');
  const sent = calls;
  wait.resolve({ data: { access: 'a', refresh: 'r' } });
  await Promise.all([first, second]);
  assert.equal(sent, 1);
});

for (const [method, service, args, key] of [
  ['register', 'register', { name: 'Pessoa fictícia', email: 'a@example.test', phone: '47999999999', password: 'ficticia' }, 'pp_pending_activation'],
  ['reenviarAtivacao', 'resendActivation', 'a@example.test', 'pp_pending_activation'],
  ['solicitarRedefinicaoSenha', 'requestPasswordReset', 'a@example.test', 'pp_pending_password_reset'],
]) {
  test(`${method}: resposta depois de logout não grava pendência antiga`, async () => {
    const wait = deferred(); authService[service] = () => wait.promise;
    const request = auth[method](args);
    auth._limparSessaoLocal();
    sessionStorage.setItem(key, JSON.stringify({ requestId: 'newer-request' }));
    wait.resolve({ data: { verification_id: 'old-request', email_sent: true } });
    assert.equal((await request).ignorado, true);
    assert.equal(JSON.parse(sessionStorage.getItem(key)).requestId, 'newer-request');
  });
}

test('reset tardio não encerra sessão nova nem apaga solicitação nova', async () => {
  sessionStorage.setItem('pp_pending_password_reset', JSON.stringify({ requestId: 'old' }));
  const wait = deferred(); authService.confirmPasswordReset = () => wait.promise;
  const resetting = auth.redefinirSenha({ code: '123456', newPassword: 'ficticia' });
  auth._limparSessaoLocal(); persistTokens({ access: 'new', refresh: 'new-r' }); auth.usuario = { id: 2 };
  sessionStorage.setItem('pp_pending_password_reset', JSON.stringify({ requestId: 'new' }));
  wait.resolve({ data: { message: 'ok' } });
  assert.equal((await resetting).ignorado, true);
  assert.equal(tokens.access, 'new'); assert.equal(auth.usuario.id, 2);
  assert.equal(JSON.parse(sessionStorage.getItem('pp_pending_password_reset')).requestId, 'new');
});

test('confirmar código antigo não remove pendência de outra solicitação', async () => {
  sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'old' }));
  const wait = deferred(); authService.confirmActivation = () => wait.promise;
  const confirming = auth.confirmarAtivacao('123456'); auth._limparSessaoLocal();
  sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'new' }));
  wait.resolve({ data: { message: 'ok' } }); await confirming;
  assert.equal(JSON.parse(sessionStorage.getItem('pp_pending_activation')).requestId, 'new');
});

test('reenvio genérico não afirma entrega de e-mail', async () => {
  authService.resendActivation = async () => ({ data: { verification_id: 'opaque', retry_after_seconds: 60, message: 'Se houver conta elegível...' } });
  await auth.reenviarAtivacao('a@example.test');
  assert.notEqual(auth.obterAtivacaoPendente().emailSent, true);
});

test('storage indisponível não transforma criação concluída em erro de cadastro', async () => {
  globalThis.sessionStorage.setItem = () => { throw new Error('Storage blocked'); };
  authService.register = async () => ({ data: { verification_id: 'opaque', email_sent: true } });
  const result = await auth.register({ name: 'Fictício', email: 'a@example.test', phone: '47999999999', password: 'ficticia' });
  assert.equal(result.ok, true); assert.equal(auth.obterAtivacaoPendente().requestId, 'opaque');
});

test('storage legível mas cheio não restaura request antigo sobre fallback novo', async () => {
  sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'old' }));
  sessionStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  authService.resendActivation = async () => ({ data: { verification_id: 'new' } });
  await auth.reenviarAtivacao('new@example.test');
  assert.equal(auth.obterAtivacaoPendente().requestId, 'new');
  sessionStorage.removeItem = () => { throw new Error('Storage blocked'); };
  auth.limparAtivacaoPendente();
  assert.equal(auth.obterAtivacaoPendente(), null);
});

test('invalidar durante perfil pendente impede atualização tardia de usuário/carrinho', async () => {
  const wait = deferred(), started = deferred();
  authService.login = async () => ({ data: { access: 'a', refresh: 'r' } });
  authService.getProfile = () => { started.resolve(); return wait.promise; };
  const entering = auth.login('synthetic@example.test', 'ficticia');
  await started.promise; auth.invalidarOperacao();
  wait.resolve({ data: { id: 123 } });
  assert.equal((await entering).ignorado, true);
  assert.equal(auth.usuario, null);
});

test('confirmação de solicitação substituída não anuncia sucesso', async () => {
  sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'old' }));
  const wait = deferred(); authService.confirmActivation = () => wait.promise;
  const confirming = auth.confirmarAtivacao('123456');
  sessionStorage.setItem('pp_pending_activation', JSON.stringify({ requestId: 'new' }));
  wait.resolve({ data: { message: 'ok' } });
  assert.equal((await confirming).ignorado, true);
  assert.equal(auth.obterAtivacaoPendente().requestId, 'new');
});
