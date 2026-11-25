import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useCartStore } from '../src/stores/cart.js';
import { executarScript, carregarComposable, adiar } from './fixtures/cart-component.mjs';
import { categoriasFavoritas, filtrarFavoritos, precoProduto, validarAdicao } from '../src/utils/favoritos.js';
const produto = { id: 1, nome: 'Pão fictício', preco: '5.00', estoque: 10, ativo: true };
let cart;
beforeEach(() => {
  setActivePinia(createPinia()); cart = useCartStore();
  cart.sincronizarConta(1); cart.adicionar(produto);
  globalThis.window = { clearTimeout, setTimeout, crypto: { randomUUID: () => 'checkout-ficticio' }, scrollTo() {}, removeEventListener() {} };
});
const compra = (catalogService) => carregarComposable('composables/useCompraCatalogo.js', 'useCompraCatalogo', { useCartStore: () => cart, useFavoritesStore: () => ({}), catalogService });
function trocarConta() { cart.sincronizarConta(2); cart.adicionar({ ...produto, preco: '7.00' }, 3); }
for (const [arquivo, adicionar] of [['HomeView', 'adicionarAoCarrinho'], ['CardapioView', 'adicionarRapido'], ['PromocoesView', 'adicionar']]) {
  test(`${arquivo}: detalhe antigo não adiciona nem dá feedback após A→B→A`, async () => {
    const detalhe = adiar();
    const view = executarScript(`views/student/${arquivo}.vue`, {
      useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }), useFavoritesStore: () => ({}),
      useRoute: () => ({ query: {} }), useRouter: () => ({}), useAutoRefresh: () => ({}),
      catalogService: { obterProduto: () => detalhe.promise },
      preparoBalcao: '', vitrineBalcao: '', retiradaBalcao: '', dataDaPires: () => '2026-11-12',
      selecionarOfertas: () => [],
      useCompraCatalogo: compra({ obterProduto: () => detalhe.promise }), useFiltrosCardapio: () => ({}), useTrilhaCategorias: () => ({}),
    }, [adicionar, 'toast']);
    const adicionando = view[adicionar](produto); trocarConta(); cart.sincronizarConta(1); cart.adicionar(produto, 2);
    detalhe.resolve({ ...produto, em_promocao: true }); await adicionando;
    assert.equal(cart.totalItens, 2); assert.equal(view.toast.value, ''); view.desmontar();
  });
}
for (const arquivo of ['HomeView', 'CardapioView']) {
  test(`${arquivo}: modal sem await preserva adição atual e quantidades`, async () => {
    const view = executarScript(`views/student/${arquivo}.vue`, {
      useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }), useFavoritesStore: () => ({}),
      useRoute: () => ({ query: {} }), useRouter: () => ({}), useAutoRefresh: () => ({}),
      preparoBalcao: '', vitrineBalcao: '', retiradaBalcao: '',
      useCompraCatalogo: compra({}), useFiltrosCardapio: () => ({}), useTrilhaCategorias: () => ({}),
    }, ['adicionarDoModal', 'toast']);
    await view.adicionarDoModal({ produto, quantidade: 2 });
    assert.equal(cart.totalItens, 3); assert.equal(cart.totalPreco, 15);
    assert.match(view.toast.value, /adicionado ao carrinho/); view.desmontar();
  });
}
test('recomendação pendente de A não adiciona nem sinaliza sucesso em B', async () => {
  const detalhe = adiar();
  const view = executarScript('components/cart/CartRecommendations.vue', {
    useCartStore: () => cart, catalogService: { obterProduto: () => detalhe.promise },
  }, ['adicionar', 'toast']);
  const adicionando = view.adicionar(produto); trocarConta(); detalhe.resolve(produto); await adicionando;
  assert.equal(cart.totalItens, 3); assert.equal(view.toast.value, ''); view.desmontar();
});
test('recomendação atual preserva fallback existente quando detalhe falha', async () => {
  const view = executarScript('components/cart/CartRecommendations.vue', {
    useCartStore: () => cart, catalogService: { obterProduto: async () => { throw new Error('offline fictício'); } },
  }, ['adicionar', 'toast']);
  await view.adicionar(produto);
  assert.equal(cart.totalItens, 2); assert.match(view.toast.value, /adicionado ao carrinho/); view.desmontar();
});
test('Favoritos valida também a geração do carrinho e ignora detalhe de sessão anterior', async () => {
  const detalhe = adiar(); let voos = 0;
  const view = executarScript('views/student/FavoritosView.vue', {
    useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }),
    useFavoritesStore: () => ({ produtos: [], obterDetalhe: () => detalhe.promise }),
    categoriasFavoritas, filtrarFavoritos, precoProduto, validarAdicao,
    registrarOrigemVoo: () => voos++,
  }, ['adicionarRapido', 'toast']);
  const adicionando = view.adicionarRapido(produto); trocarConta(); cart.sincronizarConta(1); cart.adicionar(produto, 2);
  detalhe.resolve(produto); await adicionando;
  assert.equal(cart.totalItens, 2); assert.equal(view.toast.value, ''); assert.equal(voos, 0); view.desmontar();
});
test('sincronização e navegação pendentes de A não atualizam mesmo produto nem avançam checkout de B', async () => {
  const detalhe = adiar(), destinos = [];
  const view = executarScript('views/student/CarrinhoView.vue', {
    useCartStore: () => cart, useRouter: () => ({ push: destino => destinos.push(destino) }),
    catalogService: { obterProduto: () => detalhe.promise },
  }, ['finalizarPedido', 'erroFinalizar']);
  const finalizando = view.finalizarPedido(); trocarConta();
  detalhe.resolve({ ...produto, preco: '99.00', estoque: 0 }); await finalizando;
  assert.equal(cart.totalPreco, 21); assert.equal(cart.itens[0].produto.estoque, 10);
  assert.deepEqual(destinos, []); assert.equal(view.erroFinalizar.value, ''); view.desmontar();
});
for (const metodo of ['finalizarDinheiro', 'processarMercadoPago']) {
  test(`resposta tardia ${metodo} não limpa B, mostra resultado ou inicia polling`, async () => {
    const http = adiar(); let pollings = 0;
    const view = executarScript('views/student/CheckoutView.vue', {
      useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }),
      paymentService: { checkoutDinheiro: () => http.promise, checkoutMercadoPago: () => http.promise },
      createAutoRefresh: () => ({ iniciar: () => pollings++, parar() {} }),
    }, ['finalizarDinheiro', 'processarMercadoPago', 'resultado', 'erro']);
    const pagando = view[metodo]({ paymentType: 'pix', formData: {} }); trocarConta();
    http.resolve({ data: { pedido: { id: 50 }, pagamento: { status_pagamento: 'pendente' } } }); await pagando;
    assert.equal(cart.totalItens, 3); assert.equal(view.resultado.value, null); assert.equal(pollings, 0);
    assert.equal(view.erro.value, ''); view.desmontar();
  });
}
test('checkout atual continua limpando carrinho e iniciando polling existente', async () => {
  let pollings = 0;
  const view = executarScript('views/student/CheckoutView.vue', {
    useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }),
    paymentService: { checkoutDinheiro: async () => ({ data: { pedido: { id: 50 }, pagamento: { status_pagamento: 'pendente' } } }) },
    createAutoRefresh: () => ({ iniciar: () => pollings++, parar() {} }),
  }, ['finalizarDinheiro', 'resultado']);
  await view.finalizarDinheiro(); assert.equal(cart.vazio, true); assert.equal(pollings, 1);
  assert.equal(view.resultado.value.pedido.id, 50); view.desmontar();
});
test('consulta de pagamento pendente de A não expõe resultado em B', async () => {
  const http = adiar();
  const view = executarScript('views/student/CheckoutView.vue', {
    useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }),
    paymentService: { consultar: () => http.promise }, createAutoRefresh: () => ({}),
  }, ['consultarPagamento', 'resultado']);
  const consultando = view.consultarPagamento(50); trocarConta();
  http.resolve({ data: { pedido: { id: 50 }, pagamento: { status_pagamento: 'aprovado' } } }); await consultando;
  assert.equal(view.resultado.value, null); assert.equal(cart.totalItens, 3); view.desmontar();
});
test('falha de checkout de A não altera erro nem estado da operação atual de B', async () => {
  const httpA = adiar(), httpB = adiar(); let chamadas = 0;
  const view = executarScript('views/student/CheckoutView.vue', {
    useCartStore: () => cart, useAuthStore: () => ({ usuario: { id: 1 } }),
    paymentService: { checkoutDinheiro: () => ++chamadas === 1 ? httpA.promise : httpB.promise }, createAutoRefresh: () => ({}),
  }, ['finalizarDinheiro', 'erro', 'processando']);
  const pagandoA = view.finalizarDinheiro(); trocarConta(); const pagandoB = view.finalizarDinheiro();
  httpA.reject(new Error('falha fictícia A')); await pagandoA;
  assert.equal(view.erro.value, ''); assert.equal(view.processando.value, true); assert.equal(cart.totalItens, 3);
  httpB.resolve({ data: { pedido: { id: 60 }, pagamento: { forma_pagamento: 'dinheiro' } } }); await pagandoB;
  assert.equal(cart.vazio, true); assert.equal(view.processando.value, false); view.desmontar();
});
