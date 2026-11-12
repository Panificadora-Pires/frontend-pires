<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { AnimatePresence } from 'motion-v';
import { ArrowRight, CheckCircle2, CircleAlert, Heart, Search, SearchX, X } from 'lucide-vue-next';
import FavoriteProduct from '@/components/favorites/FavoriteProduct.vue';
import FavoriteCollectionItem from '@/components/favorites/FavoriteCollectionItem.vue';
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useAuthStore } from '@/stores/auth';
import { categoriasFavoritas, filtrarFavoritos, precoProduto, validarAdicao } from '@/utils/favoritos';
import { registrarOrigemVoo } from '@/utils/vooAoCarrinho';

const cart = useCartStore(), favorites = useFavoritesStore(), auth = useAuthStore();
const busca = ref(''), categoria = ref(''), ordem = ref('selecao');
const estado = ref(null), titulo = ref(null);
const categorias = computed(() => categoriasFavoritas(favorites.produtos));
const produtosFiltrados = computed(() => filtrarFavoritos(favorites.produtos, { busca: busca.value, categoria: categoria.value, ordem: ordem.value }));
const temFiltros = computed(() => Boolean(busca.value || categoria.value || ordem.value !== 'selecao'));
const modalAberto = ref(false), carregandoDetalhe = ref(false), produtoDetalhado = ref(null);
const produtoAdicionando = ref(null), origemAdicao = ref(null);
const toast = ref(''), tipoToast = ref('sucesso');
const adicionandoModal = computed(() => produtoAdicionando.value !== null && origemAdicao.value === 'modal');
let montado = true, geracao = 0, requisicaoDetalhe = 0, toastTimer;
let destinoModal = null, produtoModalId = null;
const vistos = new Set();
function contextoAtual(g, conta) { return montado && !favorites.suspenso && geracao === g && (auth.usuario?.id ?? null) === conta; }
function mostrarToast(mensagem, tipo = 'sucesso') {
  toast.value = mensagem; tipoToast.value = tipo; clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ''; }, 4400);
}
function limparFiltros() { busca.value = ''; categoria.value = ''; ordem.value = 'selecao'; }
async function recarregar() { try { await favorites.carregar({ force: true }); } catch {} }
function focarColecao(preferido) {
  const botao = preferido ? document.getElementById(`favorite-remove-${preferido}`) : null;
  const valido = elemento => elemento && !elemento.disabled && !elemento.closest('[inert]');
  const primeiro = produtosFiltrados.value.map(p => document.getElementById(`favorite-remove-${p.id}`)).find(valido);
  (valido(botao) ? botao : primeiro || estado.value || titulo.value)?.focus({ preventScroll: true });
}
async function alternarFavorito(produto, confirmar) {
  if (!auth.usuario || favorites.suspenso || !produto?.id || favorites.estaProcessando(produto.id)) return;
  const g = geracao, conta = auth.usuario?.id ?? null;
  const ids = produtosFiltrados.value.map(p => p.id), indice = ids.indexOf(produto.id);
  const proximo = ids[indice + 1] ?? ids[indice - 1];
  const estava = favorites.tem(produto.id);
  let resultado;
  try {
    resultado = await favorites.alternar(produto);
  } catch {
    if (contextoAtual(g, conta)) mostrarToast('Não foi possível atualizar seus favoritos. Tente novamente.', 'erro');
    return;
  }
  if (!contextoAtual(g, conta) || resultado === undefined) return;
  mostrarToast(`${produto.nome} ${resultado ? 'adicionado aos favoritos' : 'removido dos favoritos'}.`);
  if (estava && !resultado) {
    if (modalAberto.value && Number(produtoModalId) === Number(produto.id)) {
      destinoModal = { id: proximo }; fecharModal();
    } else { await nextTick(); focarColecao(proximo); }
  }
  // Feedback e foco dependem da mutação confirmada, antes do efeito visual.
  confirmar?.();
}
function detalheExibivel(detalhe) {
  if (precoProduto(detalhe) === null) return null;
  return detalhe.ativo ? detalhe : { ...detalhe, estoque: 0 };
}
async function abrirProduto(produto) {
  if (!auth.usuario || favorites.suspenso || !produto?.id) return;
  const requisicao = ++requisicaoDetalhe, g = geracao, conta = auth.usuario?.id ?? null;
  destinoModal = { elemento: document.activeElement, id: produto.id }; produtoModalId = produto.id;
  modalAberto.value = true; carregandoDetalhe.value = true; produtoDetalhado.value = null; toast.value = '';
  try {
    const detalhe = await favorites.obterDetalhe(produto.id);
    if (!contextoAtual(g, conta) || requisicao !== requisicaoDetalhe || !modalAberto.value) return;
    if (Number(detalhe?.id) !== Number(produto.id)) return;
    favorites.atualizarProduto(detalhe); produtoDetalhado.value = detalheExibivel(detalhe);
  } catch { /* O modal compartilhado apresenta o erro e permite fechar/reabrir. */ }
  finally { if (contextoAtual(g, conta) && requisicao === requisicaoDetalhe) carregandoDetalhe.value = false; }
}
async function fecharModal() {
  const destino = destinoModal; destinoModal = null; produtoModalId = null;
  requisicaoDetalhe++; modalAberto.value = false; carregandoDetalhe.value = false; produtoDetalhado.value = null;
  await nextTick();
  if (!montado) return;
  if (destino?.elemento?.isConnected && !destino.elemento.disabled && !destino.elemento.closest('[inert]')) destino.elemento.focus({ preventScroll: true });
  else focarColecao(destino?.id);
}
async function adicionar(produto, quantidade = 1, origem = 'direta', elementoOrigem = null) {
  if (!auth.usuario || favorites.suspenso || !produto?.id || produtoAdicionando.value !== null || !Number.isSafeInteger(quantidade) || quantidade < 1) return;
  const g = geracao, conta = auth.usuario?.id ?? null, requisicao = requisicaoDetalhe;
  produtoAdicionando.value = produto.id; origemAdicao.value = origem;
  const valido = () => contextoAtual(g, conta) && (origem !== 'modal' || (modalAberto.value && requisicao === requisicaoDetalhe));
  try {
    const detalhe = await favorites.obterDetalhe(produto.id);
    if (!valido()) return;
    const existente = cart.itens.find(item => Number(item.produto.id) === Number(produto.id));
    const erro = validarAdicao(produto, detalhe, quantidade, existente?.quantidade || 0);
    if (Number(detalhe?.id) === Number(produto.id)) favorites.atualizarProduto(detalhe);
    if (origem === 'modal') produtoDetalhado.value = detalheExibivel(detalhe);
    if (erro) {
      const mensagem = erro === 'preco-alterado' ? 'O preço mudou. Confira o valor atualizado e confirme a adição novamente.' : erro === 'estoque' ? 'A quantidade solicitada não está disponível. Confira o estoque e o seu carrinho.' : 'Este produto está indisponível no momento.';
      mostrarToast(mensagem, 'erro');
      if (erro === 'preco-alterado' && origem !== 'modal') {
        destinoModal = { elemento: document.activeElement, id: produto.id }; produtoModalId = produto.id;
        requisicaoDetalhe++; modalAberto.value = true; carregandoDetalhe.value = false; produtoDetalhado.value = detalheExibivel(detalhe);
      }
      return;
    }
    if (existente) existente.produto = detalhe;
    if (origem === 'direta') registrarOrigemVoo(elementoOrigem);
    // O layout existente observa esta ação e executa o voo uma única vez.
    cart.adicionar(detalhe, quantidade);
    mostrarToast(`${detalhe.nome} adicionado ao carrinho.`);
    if (origem === 'modal') fecharModal();
  } catch { if (valido()) mostrarToast('Não foi possível conferir este produto. Tente novamente.', 'erro'); }
  finally { if (contextoAtual(g, conta)) { produtoAdicionando.value = null; origemAdicao.value = null; } }
}
function adicionarRapido(produto, origem) { return adicionar(produto, 1, 'direta', origem); }
function adicionarDoModal({ produto, quantidade }) { return adicionar(produto, quantidade, 'modal'); }
watch(categorias, lista => { if (categoria.value && !lista.includes(categoria.value)) categoria.value = ''; });
// O logout limpa o store antes de aguardar HTTP. Invalidar a View no mesmo
// instante também cancela detalhes e compras que ainda aguardam a API.
watch(() => favorites.geracao, () => {
  geracao++; requisicaoDetalhe++; modalAberto.value = false; produtoDetalhado.value = null; carregandoDetalhe.value = false;
  produtoAdicionando.value = null; origemAdicao.value = null; destinoModal = null; produtoModalId = null; toast.value = '';
}, { flush: 'sync' });
watch(() => auth.usuario?.id ?? null, () => {
  geracao++; requisicaoDetalhe++; modalAberto.value = false; produtoDetalhado.value = null; carregandoDetalhe.value = false;
  produtoAdicionando.value = null; origemAdicao.value = null; destinoModal = null; toast.value = ''; limparFiltros(); vistos.clear();
  favorites.sincronizarConta(); if (auth.usuario) recarregar();
}, { flush: 'sync' });
onMounted(recarregar);
onBeforeUnmount(() => { montado = false; geracao++; requisicaoDetalhe++; clearTimeout(toastTimer); });
</script>

<template>
  <div class="favorites-page">
    <header class="favorites-page__header">
      <div><h1 ref="titulo" tabindex="-1">Favoritos</h1><p class="favorites-page__note">Seus sabores de sempre, por perto.</p></div>
      <div class="favorites-page__summary"><p v-if="favorites.inicializado"><Heart :size="15" fill="currentColor" aria-hidden="true" /><strong>{{ favorites.total }}</strong> {{ favorites.total === 1 ? 'produto salvo' : 'produtos salvos' }}</p><RouterLink :to="{ name: 'cardapio' }">Explorar cardápio <ArrowRight :size="17" aria-hidden="true" /></RouterLink></div>
    </header>
    <div v-if="favorites.inicializado && favorites.total" class="favorites-page__controls" :class="{ 'favorites-page__controls--compact': favorites.total <= 2 }">
      <label class="favorites-page__search"><Search :size="19" aria-hidden="true" /><input v-model="busca" type="search" aria-label="Buscar nos favoritos" placeholder="Buscar um sabor salvo" autocomplete="off" /><button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''"><X :size="17" aria-hidden="true" /></button></label>
      <label class="favorites-page__select"><span>Categoria</span><select v-model="categoria" aria-label="Filtrar por categoria"><option value="">Todas</option><option v-for="nome in categorias" :key="nome" :value="nome">{{ nome }}</option></select></label>
      <label class="favorites-page__select"><span>Ordenar</span><select v-model="ordem" aria-label="Ordenar favoritos"><option value="selecao">Ordem da seleção</option><option value="nome">Nome A–Z</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></label>
    </div>
    <section class="favorites-page__collection" aria-label="Sua coleção de favoritos" :aria-busy="favorites.carregando">
      <p v-if="favorites.inicializado && favorites.erro" class="favorites-page__update-error" role="status">Não foi possível atualizar sua coleção. Seus produtos continuam aqui. <button type="button" :disabled="favorites.carregando" @click="recarregar">Tentar novamente</button></p>
      <div v-if="!favorites.inicializado && !favorites.erro" class="favorites-page__loading" role="status"><span>Carregando seus favoritos…</span><div class="favorites-page__skeletons" aria-hidden="true"><div v-for="n in 4" :key="n" /></div></div>
      <div v-else-if="!favorites.inicializado && favorites.erro" ref="estado" tabindex="-1" class="favorites-page__state" role="alert"><CircleAlert :size="32" aria-hidden="true" /><h2>Sua coleção não carregou.</h2><p>Verifique sua conexão e tente novamente.</p><button type="button" :disabled="favorites.carregando" @click="recarregar">{{ favorites.carregando ? 'Carregando…' : 'Tentar novamente' }}</button></div>
      <template v-else>
        <div v-if="favorites.total" class="favorites-page__collection-head"><p aria-live="polite" aria-atomic="true">{{ produtosFiltrados.length }} {{ produtosFiltrados.length === 1 ? 'sabor para o seu intervalo' : 'sabores para o seu intervalo' }}</p><button v-if="temFiltros" type="button" @click="limparFiltros">Limpar filtros</button></div>
        <div class="favorites-page__grid" :class="{ 'favorites-page__grid--single': produtosFiltrados.length === 1, 'favorites-page__grid--duo': produtosFiltrados.length === 2 }">
          <AnimatePresence mode="popLayout">
            <FavoriteCollectionItem v-for="produto in produtosFiltrados" :key="produto.id" :produto-id="produto.id" :animar="!vistos.has(produto.id)" @apareceu="vistos.add($event)">
              <FavoriteProduct :produto="produto" :destaque="produtosFiltrados.length === 1" :favoritando="favorites.estaProcessando(produto.id)" :adicionando="produtoAdicionando === produto.id" @open="abrirProduto" @favorite="alternarFavorito" @add="adicionarRapido" />
            </FavoriteCollectionItem>
          </AnimatePresence>
        </div>
        <div v-if="!favorites.total" class="favorites-page__state favorites-page__state--empty">
          <svg class="favorites-page__illustration" viewBox="0 0 200 150" fill="none" aria-hidden="true"><path d="M30 110h140M45 110l-7-55h124l-7 55M60 110v18m80-18v18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M65 54c-16-6-17-27-4-32 8-4 16 0 20 7 4-7 12-11 20-7 13 5 12 26-4 32L81 66 65 54Z" fill="var(--pp-creme-3)" stroke="currentColor" stroke-width="2"/><path d="M110 53c-6-14 5-28 18-25 10 2 16 14 10 25M67 81h66m-58 13h50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
          <h2 ref="estado" tabindex="-1">Guarde um lugar<br />para os seus preferidos.</h2><p>Toque no coração dos produtos que você gosta.<br class="favorites-page__desktop-break" /> Eles ficam aqui para o próximo intervalo.</p><RouterLink :to="{ name: 'cardapio' }">Encontrar meu próximo favorito <ArrowRight :size="17" aria-hidden="true" /></RouterLink>
        </div>
        <div v-else-if="!produtosFiltrados.length" ref="estado" tabindex="-1" class="favorites-page__state"><SearchX :size="32" aria-hidden="true" /><h2>Esse sabor não está na seleção.</h2><p>Tente outro nome ou veja todos os produtos que você salvou.</p><button type="button" @click="limparFiltros">Ver todos os favoritos</button></div>
      </template>
    </section>
    <ProductDetailsModal :open="modalAberto" :produto="produtoDetalhado" :loading="carregandoDetalhe" :adding="adicionandoModal" :feedback="toast" :favorito="Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))" :favoritando="Boolean(produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id))" @close="fecharModal" @favorite="alternarFavorito" @add="adicionarDoModal" />
    <Transition name="favorites-toast"><div v-if="toast" class="favorites-page__toast" :class="{ 'favorites-page__toast--error': tipoToast === 'erro' }" :role="tipoToast === 'erro' ? 'alert' : 'status'" aria-live="polite"><CircleAlert v-if="tipoToast === 'erro'" :size="19" aria-hidden="true" /><CheckCircle2 v-else :size="19" aria-hidden="true" />{{ toast }}</div></Transition>
  </div>
</template>

<style scoped>
.favorites-page { width: min(100%, 1160px); margin: 0 auto; color: var(--pp-marrom); }
.favorites-page__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding-bottom: 30px; }
.favorites-page h1 { margin: 0; font: 400 clamp(40px, 4.5vw, 64px)/1.08 var(--pp-font-titulo); letter-spacing: -.025em; }
.favorites-page__note { margin: 9px 0 0; font: 700 26px/1.2 var(--pp-font-nota); color: var(--pp-dourado-profundo); }
.favorites-page__summary { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; font-size: 13px; }
.favorites-page__summary p { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--pp-texto-2); }
.favorites-page__summary svg { color: var(--pp-dourado-profundo); }
.favorites-page__summary a { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-weight: 600; color: var(--pp-dourado-profundo); }
.favorites-page__controls { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(150px, 190px) minmax(160px, 200px); align-items: center; gap: 24px; border-block: 1px solid var(--pp-creme-borda); }
.favorites-page__search { display: flex; align-items: center; gap: 10px; min-height: 64px; min-width: 0; }
.favorites-page__search input { width: 100%; min-width: 0; min-height: 44px; padding: 0; border: 0; outline: 0; background: transparent; color: inherit; font: 400 14px/1.5 var(--pp-font-body); }
.favorites-page__search input::placeholder { opacity: 1; color: var(--pp-texto-2); }
.favorites-page__search input::-webkit-search-cancel-button { display: none; }
.favorites-page__search button { flex: none; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.favorites-page__select { display: flex; align-items: center; gap: 8px; min-width: 0; }
.favorites-page__select span { font-size: 11px; color: var(--pp-texto-2); }
.favorites-page__select select { width: 100%; min-width: 0; min-height: 44px; border: 0; background: transparent; color: inherit; font: 500 12px/1.5 var(--pp-font-body); cursor: pointer; }
.favorites-page__controls--compact .favorites-page__search { min-height: 56px; }
.favorites-page__collection-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 58px; }
.favorites-page__collection-head p { margin: 0; color: var(--pp-texto-2); font-size: 12px; }
.favorites-page__collection-head button, .favorites-page__update-error button { padding: 0; min-height: 44px; border: 0; background: transparent; color: var(--pp-dourado-profundo); font: 600 12px/1.5 var(--pp-font-body); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.favorites-page__grid { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 38px 24px; }
.favorites-page__grid--single { grid-template-columns: minmax(0, 1fr); }
.favorites-page__grid--duo { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px; }
.favorites-page__state { display: flex; flex-direction: column; align-items: flex-start; gap: 18px; padding-block: 48px; }
.favorites-page__state h2 { margin: 0; max-width: 700px; font: 400 clamp(32px, 4vw, 48px)/1.15 var(--pp-font-titulo); }
.favorites-page__state p { max-width: 52ch; margin: 0; color: var(--pp-texto-2); font-size: 15px; line-height: 1.7; }
.favorites-page__state a, .favorites-page__state button { display: inline-flex; align-items: center; gap: 12px; min-height: 48px; margin-top: 6px; padding: 12px 24px; border: 1px solid var(--pp-marrom); border-radius: var(--pp-radius-full); background: var(--pp-marrom); color: var(--pp-creme); font: 600 14px/1.5 var(--pp-font-body); cursor: pointer; }
.favorites-page__state--empty { align-items: center; text-align: center; padding-top: 30px; }
.favorites-page__illustration { width: 180px; height: 135px; color: var(--pp-dourado-profundo); }
.favorites-page__loading > span { display: block; margin-block: 20px; color: var(--pp-texto-2); font-size: 14px; }
.favorites-page__skeletons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.favorites-page__skeletons div { aspect-ratio: .75; border-radius: var(--pp-radius-sm); background: var(--pp-creme-2); }
.favorites-page__update-error { display: flex; align-items: center; gap: 12px; margin: 16px 0 0; color: var(--pp-texto-2); font-size: 13px; line-height: 1.5; }
.favorites-page__toast { position: fixed; left: 50%; bottom: 28px; z-index: 90; display: flex; align-items: center; gap: 10px; width: max-content; max-width: min(540px, calc(100vw - 32px)); padding: 14px 20px; border: 1px solid var(--pp-marrom-2); border-radius: var(--pp-radius-btn); background: var(--pp-marrom); color: var(--pp-creme); transform: translateX(-50%); font: 400 14px/1.5 var(--pp-font-body); }
.favorites-page__toast svg { flex: none; }
.favorites-page__toast--error { border-width: 2px; }
.favorites-page button:focus-visible, .favorites-page a:focus-visible, .favorites-page h1:focus-visible, .favorites-page h2:focus-visible, .favorites-page__state:focus-visible { outline: 3px solid var(--pp-dourado-profundo); outline-offset: 4px; }
.favorites-page__search:focus-within, .favorites-page__select:focus-within { outline: 3px solid var(--pp-dourado-profundo); outline-offset: 3px; }
.favorites-toast-enter-active, .favorites-toast-leave-active { transition: opacity 180ms var(--pp-ease); }
.favorites-toast-enter-from, .favorites-toast-leave-to { opacity: 0; }
@media (max-width: 1100px) { .favorites-page__grid:not(.favorites-page__grid--single):not(.favorites-page__grid--duo) { grid-template-columns: repeat(3,minmax(0,1fr)); } }
@media (max-width: 760px) { .favorites-page__header { gap: 16px; padding-bottom: 22px; } .favorites-page__note { font-size: 22px; max-width: 230px; } .favorites-page__summary { font-size: 12px; } .favorites-page__controls { grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 0 20px; } .favorites-page__search { grid-column: 1/-1; min-height: 52px; border-bottom: 1px solid var(--pp-creme-borda); } .favorites-page__grid:not(.favorites-page__grid--single), .favorites-page__skeletons { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 32px 20px; } .favorites-page__select { min-height: 48px; } .favorites-page__toast { bottom: calc(145px + env(safe-area-inset-bottom)); } .favorites-page__update-error { flex-wrap: wrap; gap: 0 12px; } }
@media (max-width: 480px) { .favorites-page__header { display: block; } .favorites-page__summary { flex-direction: row; justify-content: space-between; align-items: center; margin-top: 14px; gap: 12px; } .favorites-page__note { max-width: none; } .favorites-page__grid, .favorites-page__grid:not(.favorites-page__grid--single), .favorites-page__skeletons { grid-template-columns: minmax(0,1fr) !important; gap: 34px; } .favorites-page__collection-head { min-height: 54px; } .favorites-page__select { gap: 5px; } .favorites-page__select span { font-size: 10px; } .favorites-page__select select { font-size: 11px; } .favorites-page__controls { gap: 0 12px; } .favorites-page__state { padding-block: 32px; } .favorites-page__state p { font-size: 14px; } .favorites-page__state a { padding-inline: 18px; font-size: 13px; } .favorites-page__illustration { width: 150px; height: 112px; } .favorites-page__desktop-break { display: none; } }
@media (prefers-reduced-motion: reduce) { .favorites-toast-enter-active, .favorites-toast-leave-active { transition: none; } }
</style>
