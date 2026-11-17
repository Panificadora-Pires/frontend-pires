import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createPinia, setActivePinia } from 'pinia';
import { tokens, authService, persistTokens } from './fixtures/cart-auth.service.mjs';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (['@/services/api', '@/services/auth.service'].includes(specifier)) return { url: new URL('./fixtures/cart-auth.service.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === '@/stores/cart') return { url: new URL('../src/stores/cart.js', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { useCartStore } = await import('../src/stores/cart.js');
const { useAuthStore } = await import('../src/stores/auth.js');
after(() => hooks.deregister());
const adiar = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const produto = { id: 1, nome: 'Pão fictício', preco: '5.00' };
let cart, auth;
beforeEach(() => {
  setActivePinia(createPinia()); cart = useCartStore(); auth = useAuthStore();
  tokens.access = 'access-ficticio'; tokens.refresh = 'refresh-ficticio';
  auth.usuario = { id: 1 }; cart.sincronizarConta(1);
  authService.getProfile = async () => ({ data: { id: 1, name: 'Perfil fictício' } });
});
test('troca de conta limpa itens/total e invalida adições e limpezas antigas, inclusive A→B→A', () => {
  const contextoA = cart.capturarContexto();
  cart.adicionar(produto, 2); assert.equal(cart.totalPreco, 10);
  cart.sincronizarConta(2); assert.equal(cart.vazio, true);
  cart.adicionar(produto, 3);
  assert.equal(cart.adicionar(produto, 5, contextoA), false);
  assert.equal(cart.limpar(contextoA), false);
  assert.equal(cart.totalItens, 3);
  cart.sincronizarConta(1); cart.adicionar(produto);
  assert.equal(cart.contextoAtual(contextoA), false);
  assert.equal(cart.adicionar(produto, 5, contextoA), false);
  assert.equal(cart.totalItens, 1);
});
test('refresh do perfil do mesmo usuário preserva itens, quantidades e contexto', async () => {
  cart.adicionar(produto, 2); const contexto = cart.capturarContexto();
  await auth.buscarUsuarioLogado();
  assert.equal(cart.contextoAtual(contexto), true); assert.equal(cart.totalPreco, 10);
  cart.alterarQuantidade(1, 3); assert.equal(cart.totalItens, 3);
  cart.removerItem(1); assert.equal(cart.vazio, true);
});
test('logout limpa sessão e carrinho antes do HTTP e resposta antiga não apaga B', async () => {
  cart.adicionar(produto, 2); const contexto = cart.capturarContexto(), http = adiar();
  authService.logout = refresh => { assert.equal(refresh, 'refresh-ficticio'); return http.promise; };
  const saindo = auth.logout();
  assert.equal(auth.usuario, null); assert.equal(cart.vazio, true); assert.equal(tokens.access, null);
  assert.equal(cart.adicionar(produto, 1, contexto), false);
  assert.equal(cart.adicionar(produto), false);
  auth.usuario = { id: 2 }; cart.sincronizarConta(2); cart.adicionar(produto, 3);
  tokens.access = 'access-b'; http.resolve(); await saindo;
  assert.equal(auth.usuario.id, 2); assert.equal(cart.totalItens, 3); assert.equal(tokens.access, 'access-b');
});
for (const acao of ['buscarUsuarioLogado', 'atualizarPerfil']) {
  test(`${acao} de A após logout/login B não atribui usuário nem limpa carrinho B`, async () => {
    const http = adiar(); authService.getProfile = () => http.promise; authService.updateProfile = () => http.promise;
    const carregando = auth[acao]({ name: 'Perfil fictício' }); auth._limparSessaoLocal();
    persistTokens({ access: 'access-b', refresh: 'refresh-b' }); auth.usuario = { id: 2 }; cart.sincronizarConta(2); cart.adicionar(produto, 3);
    http.resolve({ data: { id: 1 } }); await carregando;
    assert.equal(auth.usuario.id, 2); assert.equal(cart.totalItens, 3); assert.equal(cart.contaId, '2'); assert.equal(auth.erro, null);
  });
}
test('401 da restauração A não limpa tokens nem usuário B', async () => {
  const http = adiar(); authService.getProfile = () => http.promise;
  const restaurando = auth.restaurarSessao(); auth._limparSessaoLocal();
  persistTokens({ access: 'access-b', refresh: 'refresh-b' }); auth.usuario = { id: 2 }; cart.sincronizarConta(2); cart.adicionar(produto, 3);
  http.reject({ response: { status: 401 } }); await restaurando;
  assert.equal(auth.usuario.id, 2); assert.equal(cart.totalItens, 3); assert.equal(tokens.access, 'access-b');
});
test('login atual preserva sucesso após trocar a versão dos tokens', async () => {
  auth._limparSessaoLocal();
  authService.login = async () => ({ data: { access: 'access-a', refresh: 'refresh-a' } });
  const resultado = await auth.login('ficticio@example.test', 'senha-ficticia');
  assert.equal(resultado.ok, true); assert.equal(auth.usuario.id, 1); assert.equal(cart.contaId, '1'); assert.equal(auth.carregando, false);
});
test('novas credenciais limpam usuário/carrinho anterior antes de aguardar perfil B', async () => {
  const perfil = adiar(), iniciou = adiar(); cart.adicionar(produto, 2);
  authService.login = async () => ({ data: { access: 'access-b', refresh: 'refresh-b' } });
  authService.getProfile = () => { iniciou.resolve(); return perfil.promise; };
  const entrando = auth.login('b@example.test', 'senha-ficticia'); await iniciou.promise;
  assert.equal(auth.usuario, null); assert.equal(cart.vazio, true);
  perfil.resolve({ data: { id: 2 } }); const resultado = await entrando;
  assert.equal(resultado.ok, true); assert.equal(auth.usuario.id, 2); assert.equal(cart.contaId, '2'); assert.equal(cart.vazio, true);
});
