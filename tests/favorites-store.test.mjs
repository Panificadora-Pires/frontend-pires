import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createPinia, setActivePinia } from 'pinia';
import service, { auth } from './fixtures/favorite.service.mjs';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (['@/services/favorite.service', '@/stores/auth'].includes(specifier)) return { url: new URL('./fixtures/favorite.service.mjs', import.meta.url).href, shortCircuit: true };
  if (specifier === '@/services/catalog.service') return { url: 'data:text/javascript,export {catalog as default} from '+JSON.stringify(new URL('./fixtures/favorite.service.mjs', import.meta.url).href), shortCircuit: true };
  return next(specifier, context);
} });
const { useFavoritesStore } = await import('../src/stores/favorites.js');
after(() => hooks.deregister());
const item = id => ({ id: id + 100, produto_detalhe: { id, nome: `Produto ${id}`, preco: '5.00', categoria_nome: 'Pães' } });
const adiar = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
let store;
beforeEach(() => {
  setActivePinia(createPinia()); auth.usuario = { id: 1 }; store = useFavoritesStore();
  store.itens = [item(1)]; store.inicializado = true;
  service.listar = async () => [item(1)]; service.remover = async () => ({}); service.adicionar = async id => ({ data: item(id) });
  const dados = new Map(); globalThis.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k,v) => dados.set(k,v), removeItem: k => dados.delete(k) };
});
test('GET antigo não ressuscita produto removido', async () => {
  const lista = adiar(); service.listar = () => lista.promise;
  const get = store.carregar({force:true, migrarLegado:false}); await store.alternar({id:1});
  lista.resolve([item(1)]); await get; assert.equal(store.total, 0);
});
test('GET antigo não perde produto recém salvo', async () => {
  const lista = adiar(); service.listar = () => lista.promise;
  const get = store.carregar({force:true, migrarLegado:false}); await store.alternar({id:2});
  lista.resolve([item(1)]); await get; assert.deepEqual(store.produtos.map(p=>p.id), [2,1]);
});
test('clique duplicado retorna ignorado e envia uma mutação', async () => {
  const del = adiar(); let chamadas=0; service.remover=()=>{ chamadas++; return del.promise; };
  const primeira=store.alternar({id:1}); const repetida=await store.alternar({id:1});
  assert.equal(repetida, undefined); del.resolve({}); assert.equal(await primeira, false); assert.equal(chamadas,1);
});
test('troca de conta limpa imediatamente e invalida GET e POST antigos', async () => {
  const lista=adiar(), post=adiar(); service.listar=()=>lista.promise; service.adicionar=()=>post.promise;
  const get=store.carregar({force:true}), add=store.alternar({id:2});
  auth.usuario={id:2}; store.sincronizarConta(2); assert.equal(store.total,0);
  lista.resolve([item(1)]); post.resolve({data:item(2)}); await Promise.all([get,add]);
  assert.equal(store.total,0); assert.equal(store.inicializado,false); assert.equal(store.carregando,false);
});
test('logout durante resposta não repõe dados nem sucesso', async () => {
  const del=adiar(); service.remover=()=>del.promise; const removendo=store.alternar({id:1});
  auth.usuario=null; store.resetar(); del.resolve({}); assert.equal(await removendo,undefined); assert.equal(store.total,0);
});
test('migração mantém só IDs pendentes e permite retentar falha transitória', async () => {
  localStorage.setItem('pp_favoritos_1', '[2,3]'); service.listar=async()=>[item(1)];
  service.adicionar=async id=>{ if(id===3) throw new Error('offline'); return {data:item(id)}; };
  await store.carregar({force:true}); assert.equal(localStorage.getItem('pp_favoritos_1'),'[3]'); assert.equal(store.tem(2),true);
  service.adicionar=async id=>({data:item(id)}); await store.carregar({force:true}); assert.equal(store.tem(3),true); assert.equal(localStorage.getItem('pp_favoritos_1'),null);
});
test('migração não restaura favorito removido enquanto outro POST estava em voo', async () => {
  localStorage.setItem('pp_favoritos_1', '[2,1]');
  const post = adiar(), iniciou = adiar();
  const enviados = [];
  service.adicionar = async id => {
    enviados.push(id);
    if (id === 2) { iniciou.resolve(); return post.promise; }
    return { data: item(id) };
  };
  const carregando = store.carregar({ force: true });
  await iniciou.promise;
  await store.alternar({ id: 1 });
  post.resolve({ data: item(2) });
  await carregando;
  assert.deepEqual(store.produtos.map(p => p.id), [2]);
  assert.deepEqual(enviados, [2]);
  assert.equal(localStorage.getItem('pp_favoritos_1'), null);
});
test('logout suspende novas ações antes da resposta HTTP e só nova conta libera', async () => {
  store.resetar({ suspender: true });
  service.listar = async () => { throw new Error('GET não deveria ocorrer durante logout'); };
  service.adicionar = async () => { throw new Error('POST não deveria ocorrer durante logout'); };
  assert.equal(await store.alternar({ id: 2 }), undefined);
  await store.carregar({ force: true });
  assert.equal(store.total, 0);
  auth.usuario = { id: 2 }; store.sincronizarConta(2);
  service.listar = async () => [item(9)];
  await store.carregar();
  assert.deepEqual(store.produtos.map(p => p.id), [9]);
});
test('falha de atualização preserva produtos e erro recupera no próximo GET', async () => {
  service.listar=async()=>{throw new Error('offline');}; await assert.rejects(store.carregar({force:true})); assert.equal(store.total,1); assert.ok(store.erro);
  service.listar=async()=>[item(2),item(2)]; await store.carregar({force:true}); assert.equal(store.total,1); assert.equal(store.erro,null);
});
