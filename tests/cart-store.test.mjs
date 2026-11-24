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
const drafts = new Map();
const persistentDrafts = new Map();
const draftKey = accountId => `pp_cart_draft_v2_${accountId}`;
beforeEach(() => {
  drafts.clear();
  persistentDrafts.clear();
  globalThis.sessionStorage = {
    getItem: key => drafts.get(key) ?? null,
    setItem: (key, value) => drafts.set(key, value),
    removeItem: key => drafts.delete(key),
  };
  globalThis.localStorage = {
    getItem: key => persistentDrafts.get(key) ?? null,
    setItem: (key, value) => persistentDrafts.set(key, value),
    removeItem: key => persistentDrafts.delete(key),
  };
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
  assert.equal(cart.totalItens, 3);
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

test('F5 restaura somente o rascunho da conta autenticada, sem precisar persistir token', () => {
  const promo = { ...produto, nome: 'Coxinha fictícia', preco: '8.00', preco_atual: '6.00', em_promocao: true, estoque: 7 };
  cart.adicionar(promo, 2);
  cart.alterarQuantidade(1, 3);
  assert.equal(cart.totalPreco, 18);

  // Reinicializa todo o Pinia como faria um reload; o perfil já foi autenticado.
  setActivePinia(createPinia());
  const novo = useCartStore();
  assert.equal(novo.vazio, true);
  novo.sincronizarConta(1);
  assert.equal(novo.totalItens, 3);
  assert.equal(novo.totalPreco, 18);
  assert.equal(novo.itens[0].produto.nome, 'Coxinha fictícia');
  assert.equal(persistentDrafts.get(draftKey(1)).includes('access-ficticio'), false);
});

test('troca de conta em reload não mistura itens de contas diferentes', () => {
  cart.adicionar(produto, 2);
  setActivePinia(createPinia());
  const deOutraConta = useCartStore();
  deOutraConta.sincronizarConta(2);
  assert.equal(deOutraConta.vazio, true);
  deOutraConta.adicionar({ ...produto, id: 2 }, 3);
  setActivePinia(createPinia());
  const restaurado = useCartStore();
  restaurado.sincronizarConta(2);
  assert.equal(restaurado.totalItens, 3);
  assert.equal(restaurado.itens[0].produto.id, 2);
  // A continua com seu proprio carrinho, sem enxergar itens de B.
  restaurado.sincronizarConta(1);
  assert.equal(restaurado.totalItens, 2);
  assert.equal(restaurado.itens[0].produto.id, 1);
});

test('logout oculta itens; login da mesma conta recupera rascunho mesmo apos reinicializar Pinia', () => {
  cart.adicionar(produto, 2);
  cart.sincronizarConta(null);
  assert.equal(cart.vazio, true);
  assert.equal(cart.contaId, null);
  assert.equal(persistentDrafts.has(draftKey(1)), true);
  setActivePinia(createPinia());
  const aposReload = useCartStore();
  aposReload.sincronizarConta(null);
  assert.equal(aposReload.vazio, true);
  aposReload.sincronizarConta(1);
  assert.equal(aposReload.totalItens, 2);
});

test('remover, limpar e quantidade persistem sem ressuscitar itens após F5', () => {
  cart.adicionar(produto, 2);
  cart.alterarQuantidade(1, 1);
  setActivePinia(createPinia());
  const recarregado = useCartStore();
  recarregado.sincronizarConta(1);
  assert.equal(recarregado.totalItens, 1);
  recarregado.removerItem(1);
  assert.equal(persistentDrafts.has(draftKey(1)), false);
  recarregado.adicionar(produto);
  recarregado.limpar();
  setActivePinia(createPinia());
  const final = useCartStore();
  final.sincronizarConta(1);
  assert.equal(final.vazio, true);
});

test('storage ausente, corrompido ou bloqueado não quebra o carrinho', () => {
  drafts.set('pp_cart_draft_v1', '{invalido');
  setActivePinia(createPinia());
  const corrompido = useCartStore();
  corrompido.sincronizarConta(1);
  assert.equal(corrompido.vazio, true);
  globalThis.sessionStorage = {
    getItem() { throw new Error('storage bloqueado'); },
    setItem() { throw new Error('storage bloqueado'); },
    removeItem() { throw new Error('storage bloqueado'); },
  };
  globalThis.localStorage = {
    getItem() { throw new Error('storage bloqueado'); },
    setItem() { throw new Error('storage bloqueado'); },
    removeItem() { throw new Error('storage bloqueado'); },
  };
  setActivePinia(createPinia());
  const bloqueado = useCartStore();
  bloqueado.sincronizarConta(1);
  assert.equal(bloqueado.adicionar(produto, 1), true);
  assert.equal(bloqueado.totalItens, 1);
});

test('falha de rede na restauração não vaza carrinho, nem apaga rascunho da conta', async () => {
  cart.adicionar(produto, 2);
  authService.getProfile = async () => { throw new Error('conexão temporariamente indisponível'); };
  assert.equal(await auth.restaurarSessao(), false);
  assert.equal(cart.vazio, true);
  assert.equal(cart.contaId, null);
  assert.equal(persistentDrafts.has(draftKey(1)), true);
  authService.getProfile = async () => ({ data: { id: 1 } });
  assert.equal(await auth.restaurarSessao(), true);
  assert.equal(cart.totalItens, 2);
  assert.equal(cart.contaId, '1');
});

test('logout real preserva rascunho, sem permitir operacoes com contexto antigo', async () => {
  cart.adicionar(produto, 2);
  const contexto = cart.capturarContexto();
  authService.logout = async () => {};
  await auth.logout();
  assert.equal(cart.vazio, true);
  assert.equal(cart.adicionar(produto, 1, contexto), false);
  assert.equal(persistentDrafts.has(draftKey(1)), true);
  auth.usuario = { id: 1 };
  cart.sincronizarConta(1);
  assert.equal(cart.totalItens, 2);
});

test('limpeza explicita remove somente rascunho da conta atual', () => {
  cart.adicionar(produto, 2);
  cart.sincronizarConta(2);
  cart.adicionar({ ...produto, id: 2 }, 3);
  assert.equal(cart.limpar(), true);
  assert.equal(persistentDrafts.has(draftKey(2)), false);
  cart.sincronizarConta(1);
  assert.equal(cart.totalItens, 2);
  cart.limpar();
  assert.equal(persistentDrafts.has(draftKey(1)), false);
  setActivePinia(createPinia());
  const novo = useCartStore();
  novo.sincronizarConta(1);
  assert.equal(novo.vazio, true);
});

test('rascunho legado da aba e migrado uma unica vez para o armazenamento por conta', () => {
  drafts.set('pp_cart_draft_v1', JSON.stringify({
    version: 1, accountId: '1', items: [{ product: produto, quantity: 4 }],
  }));
  setActivePinia(createPinia());
  const primeira = useCartStore();
  primeira.sincronizarConta(2);
  assert.equal(primeira.vazio, true);
  assert.equal(drafts.has('pp_cart_draft_v1'), true);
  primeira.sincronizarConta(1);
  assert.equal(primeira.totalItens, 4);
  assert.equal(persistentDrafts.has(draftKey(1)), true);
  assert.equal(drafts.has('pp_cart_draft_v1'), false);
});

test('login de outra conta nunca carrega o rascunho de A', () => {
  cart.adicionar(produto, 2);
  cart.sincronizarConta(null);
  cart.sincronizarConta(2);
  assert.equal(cart.vazio, true);
  assert.equal(persistentDrafts.has(draftKey(1)), true);
  assert.equal(persistentDrafts.has(draftKey(2)), false);
  cart.sincronizarConta(null);
  cart.sincronizarConta(1);
  assert.equal(cart.totalItens, 2);
});
