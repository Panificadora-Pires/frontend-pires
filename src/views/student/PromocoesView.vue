<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { ArrowRight, CheckCircle2, ChevronDown, CircleAlert, Search, SearchX, Tag, X } from 'lucide-vue-next';
import PromotionCampaign from '@/components/promotions/PromotionCampaign.vue';
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue';
import catalogService from '@/services/catalog.service';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { dataDaPires, selecionarOfertas } from '@/utils/promocoes';
import { movimentoReduzido } from '@/utils/vooAoCarrinho';

const cart = useCartStore(), favorites = useFavoritesStore();
const produtos = ref([]), promocoes = ref([]), hoje = ref(dataDaPires());
const busca = ref(''), categoriaAtiva = ref(null), ordenacao = ref('desconto');
const carregando = ref(true), erro = ref(false), falhaAtualizacao = ref(false);
const produtoAdicionando = ref(null), origemAdicao = ref(null);
const modalAberto = ref(false), carregandoDetalhe = ref(false), produtoDetalhado = ref(null);
const adicionandoModal = computed(() => origemAdicao.value === 'modal');
const toast = ref('');
let toastTimer, montado = true, carregou = false, requisicaoDetalhe = 0, observer;
const trilha = useTemplateRef('trilha');
const indicador = ref({ width: '0px', transform: 'translateX(0px)' });
const promocoesAtivas = computed(() => selecionarOfertas(produtos.value, promocoes.value, hoje.value));
const categoriasPromocionais = computed(() => [...new Map(promocoesAtivas.value.map(({ produto }) => [produto.categoria, { id: produto.categoria, nome: produto.categoria_nome || 'Categoria' }])).values()].sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR')));
const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
const promocoesFiltradas = computed(() => {
  const termo = normalizar(busca.value);
  const lista = promocoesAtivas.value.filter(({ produto }) => (categoriaAtiva.value === null || produto.categoria === categoriaAtiva.value) && normalizar(`${produto.nome} ${produto.categoria_nome}`).includes(termo));
  const porNome = (a,b) => a.produto.nome.localeCompare(b.produto.nome,'pt-BR');
  return lista.sort((a,b) => {
    if (ordenacao.value === 'nome') return porNome(a,b);
    if (ordenacao.value === 'menor-preco') return Number(a.produto.preco_atual) - Number(b.produto.preco_atual) || porNome(a,b);
    if (ordenacao.value === 'termina-primeiro') return a.promocao.data_fim.localeCompare(b.promocao.data_fim) || porNome(a,b);
    return b.desconto - a.desconto || porNome(a,b);
  });
});
const destaque = computed(() => promocoesFiltradas.value[0]);
const demais = computed(() => promocoesFiltradas.value.slice(1));
const assinatura = computed(() => promocoesFiltradas.value.map(item => item.produto.id).join('-'));
const temFiltros = computed(() => Boolean(busca.value || categoriaAtiva.value !== null || ordenacao.value !== 'desconto'));
const maiorDesconto = computed(() => Math.max(0, ...promocoesAtivas.value.map(item => item.desconto)));
const textoContagem = computed(() => `${promocoesFiltradas.value.length} ${promocoesFiltradas.value.length === 1 ? 'oferta' : 'ofertas'}`);

async function alinharIndicador() {
  await nextTick();
  if (!montado) return;
  const ativo = trilha.value?.querySelector('[aria-pressed="true"]');
  if (!ativo) return;
  indicador.value = { width: `${ativo.offsetWidth}px`, transform: `translateX(${ativo.offsetLeft}px)` };
  const inicio = ativo.offsetLeft;
  if (inicio < trilha.value.scrollLeft || inicio + ativo.offsetWidth > trilha.value.scrollLeft + trilha.value.clientWidth) {
    trilha.value.scrollTo({ left: inicio - (trilha.value.clientWidth - ativo.offsetWidth) / 2, behavior: movimentoReduzido() ? 'instant' : 'smooth' });
  }
}
watch([categoriaAtiva, categoriasPromocionais], () => {
  if (categoriaAtiva.value !== null && !categoriasPromocionais.value.some(c => c.id === categoriaAtiva.value)) categoriaAtiva.value = null;
  alinharIndicador();
});
async function carregarDados() {
  hoje.value = dataDaPires();
  if (!carregou) { carregando.value = true; erro.value = false; }
  try {
    const [lista, ofertas] = await Promise.all([catalogService.listarProdutosAtivos(), catalogService.listarPromocoes()]);
    if (!montado) return;
    produtos.value = lista; promocoes.value = ofertas; carregou = true; erro.value = false; falhaAtualizacao.value = false;
  } catch {
    if (!carregou) erro.value = true;
    else falhaAtualizacao.value = true;
  } finally { carregando.value = false; }
}
const { atualizarAgora } = useAutoRefresh(carregarDados, { intervalo: 60_000 });
async function abrirProduto(produto) {
  const pedido = ++requisicaoDetalhe;
  toast.value = ''; modalAberto.value = true; carregandoDetalhe.value = true; produtoDetalhado.value = null;
  try {
    const detalhe = await catalogService.obterProduto(produto.id);
    if (montado && pedido === requisicaoDetalhe) produtoDetalhado.value = detalhe;
  } catch { /* O diálogo compartilhado apresenta o estado de falha. */ }
  finally { if (montado && pedido === requisicaoDetalhe) carregandoDetalhe.value = false; }
}
function fecharModal() { requisicaoDetalhe++; modalAberto.value = false; produtoDetalhado.value = null; carregandoDetalhe.value = false; }
async function alternarFavorito(produto) {
  const estava = favorites.tem(produto.id);
  try { await favorites.alternar(produto); if (montado) mostrarToast(`${produto.nome} ${estava ? 'removido dos favoritos' : 'adicionado aos favoritos'}.`); }
  catch { if (montado) mostrarToast('Não foi possível atualizar seus favoritos.'); }
}
async function adicionar(produto, quantidade = 1, origem = 'direta') {
  if (produtoAdicionando.value !== null || !Number.isSafeInteger(quantidade) || quantidade < 1) return;
  produtoAdicionando.value = produto.id; origemAdicao.value = origem;
  try {
    // Nenhum cache: preço, promoção e estoque são conferidos em cada tentativa, inclusive no modal.
    const detalhe = await catalogService.obterProduto(produto.id);
    if (!montado) return;
    if (origem === 'modal' && produtoDetalhado.value?.id === produto.id) produtoDetalhado.value = detalhe;
    if (!detalhe.ativo || !detalhe.em_promocao || Number(detalhe.preco_atual) !== Number(produto.preco_atual)) {
      mostrarToast('Esta oferta mudou. Confira o preço e a disponibilidade antes de adicionar.');
      await carregarDados(); return;
    }
    const estoque = Number(detalhe.estoque || 0);
    const existente = cart.itens.find(item => item.produto.id === detalhe.id);
    if (estoque <= 0) { mostrarToast(`${produto.nome} está sem estoque no momento.`); return; }
    if ((existente?.quantidade || 0) + quantidade > estoque) { mostrarToast(`Há somente ${estoque} ${estoque === 1 ? 'unidade disponível' : 'unidades disponíveis'} de ${produto.nome}.`); return; }
    // O store existente soma quantidades; atualizar também o preço do item já presente.
    if (existente) existente.produto = detalhe;
    cart.adicionar(detalhe, quantidade);
    mostrarToast(`${produto.nome} adicionado ao carrinho.`);
    if (origem === 'modal' && produtoDetalhado.value?.id === produto.id) fecharModal();
  } catch { if (montado) mostrarToast('Não foi possível verificar a disponibilidade do produto.'); }
  finally { produtoAdicionando.value = null; origemAdicao.value = null; }
}
function adicionarDoModal({ produto, quantidade }) { return adicionar(produto, quantidade, 'modal'); }
function limparFiltros() { busca.value = ''; categoriaAtiva.value = null; ordenacao.value = 'desconto'; }
function mostrarToast(mensagem) { toast.value = mensagem; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3800); }
onMounted(() => {
  favorites.carregar().catch(() => {});
  observer = new ResizeObserver(alinharIndicador); observer.observe(trilha.value);
  document.fonts.ready.then(alinharIndicador);
});
onBeforeUnmount(() => { montado = false; requisicaoDetalhe++; clearTimeout(toastTimer); observer?.disconnect(); });
</script>

<template>
  <div class="promotions-page">
    <header class="promotions-page__header">
      <div><h1>Promoções</h1><p class="promotions-page__note">Seu intervalo, por menos.</p></div>
      <div class="promotions-page__intro">
        <p>{{ !carregando && !erro && !promocoesAtivas.length ? 'Consulte o cardápio completo da Pires.' : 'Escolha seu lanche entre as ofertas vigentes da Pires.' }}</p>
        <p v-if="!carregando && !erro && promocoesAtivas.length" class="promotions-page__facts">{{ promocoesAtivas.length }} {{ promocoesAtivas.length === 1 ? 'oferta' : 'ofertas' }} · descontos de até {{ maiorDesconto }}%</p>
      </div>
    </header>
    <section class="promotions-page__controls" aria-label="Busca e filtros de promoções">
      <label class="promotions-page__search"><Search :size="20" aria-hidden="true" /><input v-model="busca" type="search" aria-label="Buscar nas promoções" placeholder="Qual oferta você procura?" autocomplete="off" /><button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''"><X :size="18" aria-hidden="true" /></button></label>
      <div ref="trilha" class="promotions-page__categories" role="group" aria-label="Categorias em promoção"><div class="promotions-page__category-track">
        <button type="button" :aria-pressed="categoriaAtiva === null" @click="categoriaAtiva = null">Todas</button>
        <button v-for="categoria in categoriasPromocionais" :key="categoria.id" type="button" :aria-pressed="categoriaAtiva === categoria.id" @click="categoriaAtiva = categoria.id">{{ categoria.nome }}</button>
        <span class="promotions-page__indicator" :style="indicador" aria-hidden="true" />
      </div></div>
      <label class="promotions-page__sort"><select v-model="ordenacao" aria-label="Ordenar promoções"><option value="desconto">Maior desconto</option><option value="menor-preco">Menor preço</option><option value="termina-primeiro">Validade</option><option value="nome">Nome A–Z</option></select><ChevronDown :size="16" aria-hidden="true" /></label>
    </section>
    <section class="promotions-page__content" aria-labelledby="promotions-title" :aria-busy="carregando">
      <div class="promotions-page__content-head"><h2 id="promotions-title" aria-live="polite" aria-atomic="true">{{ carregando ? 'Carregando ofertas' : textoContagem }}</h2><button v-if="temFiltros" type="button" @click="limparFiltros">Limpar filtros</button></div>
      <p v-if="falhaAtualizacao" role="status">Não foi possível atualizar as ofertas. A disponibilidade será conferida ao adicionar.</p>
      <div v-if="carregando" class="promotions-page__loading" aria-label="Carregando promoções"><div class="promotions-page__skeleton" /><div class="promotions-page__skeleton" /></div>
      <div v-else-if="erro" class="promotions-page__state" role="alert"><CircleAlert :size="28" aria-hidden="true" /><h2>Não conseguimos carregar as promoções.</h2><p>Verifique sua conexão e tente novamente.</p><button type="button" @click="atualizarAgora">Tentar novamente</button></div>
      <div v-else-if="!promocoesAtivas.length" class="promotions-page__state"><Tag :size="28" aria-hidden="true" /><h2>Um novo sabor pode estar no cardápio.</h2><p>Nenhuma promoção ativa agora. Você ainda pode escolher no cardápio completo.</p><RouterLink :to="{ name: 'cardapio' }">Ver cardápio <ArrowRight :size="18" aria-hidden="true" /></RouterLink></div>
      <div v-else-if="!promocoesFiltradas.length" class="promotions-page__state"><SearchX :size="28" aria-hidden="true" /><h2>Nenhuma oferta encontrada.</h2><p>Tente outro produto ou remova os filtros.</p><button type="button" @click="limparFiltros">Ver todas as ofertas</button></div>
      <Transition v-else name="offers" @leave="(_element, concluir) => concluir()">
        <div :key="assinatura" class="promotions-page__showcase" :class="{ 'promotions-page__showcase--pair': demais.length === 1 }">
          <PromotionCampaign :key="destaque.produto.id" :item="destaque" featured :favorito="favorites.tem(destaque.produto.id)" :favoritando="favorites.estaProcessando(destaque.produto.id)" :adicionando="produtoAdicionando === destaque.produto.id" @open="abrirProduto" @favorite="alternarFavorito" @add="adicionar" />
          <section v-if="demais.length" class="promotions-page__more" aria-labelledby="more-offers"><h2 id="more-offers">{{ demais.length === 1 ? 'Também em oferta' : 'Mais ofertas para escolher' }}</h2><div class="promotions-page__grid" :class="{ 'promotions-page__grid--four': demais.length === 4 }"><PromotionCampaign v-for="item in demais" :key="item.produto.id" :item="item" :favorito="favorites.tem(item.produto.id)" :favoritando="favorites.estaProcessando(item.produto.id)" :adicionando="produtoAdicionando === item.produto.id" @open="abrirProduto" @favorite="alternarFavorito" @add="adicionar" /></div></section>
        </div>
      </Transition>
    </section>
    <section v-revelar class="promotions-page__how" aria-labelledby="how-offers"><div><h2 id="how-offers">Seu próximo<br />intervalo começa aqui.</h2><RouterLink :to="{ name: 'cardapio' }">Conhecer o cardápio <ArrowRight :size="18" aria-hidden="true" /></RouterLink></div><ol><li><strong>Escolha seu lanche</strong><p>Veja os detalhes e adicione os produtos ao carrinho.</p></li><li><strong>Conclua seu pedido</strong><p>Escolha a forma de pagamento disponível no checkout.</p></li><li><strong>Acompanhe e retire</strong><p>Acompanhe o preparo e apresente o QR Code para retirar seu pedido.</p></li></ol></section>
    <ProductDetailsModal :open="modalAberto" :produto="produtoDetalhado" :loading="carregandoDetalhe" :adding="adicionandoModal" :feedback="toast" :favorito="Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))" :favoritando="Boolean(produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id))" @close="fecharModal" @favorite="alternarFavorito" @add="adicionarDoModal" />
    <Transition name="promotions-toast"><div v-if="toast" class="promotions-page__toast" role="status" aria-live="polite"><CheckCircle2 :size="18" aria-hidden="true" />{{ toast }}</div></Transition>
  </div>
</template>

<style scoped>
.promotions-page { width: min(100%, 1160px); margin: 0 auto; color: var(--pp-marrom); --pp-home-action-duration: 450ms; }
.promotions-page__header { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; margin-bottom: 32px; animation: promotion-intro 350ms var(--pp-ease); }
.promotions-page h1 { margin: 0; font: 400 clamp(50px, 7vw, 88px)/1.1 var(--pp-font-titulo); letter-spacing: -.025em; }
.promotions-page__note { margin: 8px 0 0; font: 700 27px/1.2 var(--pp-font-nota); color: var(--pp-dourado-profundo); }
.promotions-page__intro { max-width: 310px; font-size: 15px; line-height: 1.6; }
.promotions-page__intro p { margin: 0; }
.promotions-page__facts { margin-top: 8px !important; color: var(--pp-texto-2); font-size: 13px; }
.promotions-page__controls { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; align-items: center; gap: 12px 24px; border-bottom: 1px solid var(--pp-creme-borda); }
.promotions-page__search { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 48px; }
.promotions-page__search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; font: 400 15px/1.5 var(--pp-font-body); color: var(--pp-marrom); }
.promotions-page__search input::placeholder { color: var(--pp-texto-2); opacity: 1; }
.promotions-page__search input::-webkit-search-cancel-button { display: none; }
.promotions-page__search button { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border: 0; background: transparent; color: inherit; cursor: pointer; }
.promotions-page__categories { min-width: 0; overflow-x: auto; scrollbar-width: none; }
.promotions-page__categories::-webkit-scrollbar { display: none; }
.promotions-page__category-track { position: relative; display: flex; gap: 20px; width: max-content; min-width: 100%; }
.promotions-page__categories button { min-width: 44px; min-height: 48px; padding: 0 3px; border: 0; background: transparent; color: inherit; font: 400 14px/1.5 var(--pp-font-body); cursor: pointer; }
.promotions-page__categories button[aria-pressed="true"] { font-weight: 700; }
.promotions-page__indicator { position: absolute; left: 0; bottom: 0; height: 2px; background: var(--pp-dourado-escuro); transition: width 220ms var(--pp-ease), transform 220ms var(--pp-ease); }
.promotions-page__sort { display: flex; align-items: center; gap: 8px; }
.promotions-page__sort select { min-width: 0; width: 100%; min-height: 48px; border: 0; outline: 0; appearance: none; background: transparent; font: 400 14px/1.5 var(--pp-font-body); color: inherit; cursor: pointer; }
.promotions-page__sort svg { flex: none; pointer-events: none; }
.promotions-page__content-head { display: flex; justify-content: space-between; align-items: center; min-height: 52px; gap: 16px; }
.promotions-page__content-head h2 { margin: 0; color: var(--pp-texto-2); font: 400 14px/1.5 var(--pp-font-body); }
.promotions-page__content-head button { min-height: 44px; border: 0; background: transparent; color: var(--pp-dourado-profundo); font: 600 13px/1.5 var(--pp-font-body); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.promotions-page__showcase--pair { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); align-items: start; gap: clamp(24px, 4vw, 56px); }
.promotions-page__showcase--pair :deep(.promotion-campaign--featured) { grid-template-columns: .9fr 1.1fr; }
.promotions-page__showcase--pair :deep(.promotion-campaign--featured .promotion-campaign__copy) { padding: 28px 24px; }
.promotions-page__showcase--pair :deep(.promotion-campaign--featured h2) { font-size: 42px; }
.promotions-page__showcase--pair :deep(.promotion-campaign--featured .promotion-campaign__price strong) { font-size: 44px; }
.promotions-page__more { min-width: 0; margin-top: 48px; }
.promotions-page__more > h2 { margin: 0 0 20px; font: 400 40px/1.15 var(--pp-font-titulo); }
.promotions-page__showcase--pair .promotions-page__more { margin-top: 72px; }
.promotions-page__showcase--pair .promotions-page__more > h2 { font: 600 16px/1.5 var(--pp-font-body); }
.promotions-page__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px 24px; }
@media (min-width: 1001px) { .promotions-page__grid--four { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.promotions-page__showcase--pair .promotions-page__grid { grid-template-columns: minmax(0, 1fr); }
.promotions-page__loading { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }
.promotions-page__skeleton { min-height: 400px; background: var(--pp-creme-2); }
.promotions-page__state { display: flex; flex-direction: column; align-items: flex-start; gap: 20px; padding: 48px 0; }
.promotions-page__state h2 { margin: 0; max-width: 700px; font: 400 clamp(32px, 5vw, 56px)/1.1 var(--pp-font-titulo); }
.promotions-page__state p { margin: 0; max-width: 65ch; color: var(--pp-texto-2); line-height: 1.6; }
.promotions-page__state a, .promotions-page__state button { display: inline-flex; align-items: center; gap: 12px; min-height: 48px; padding: 12px 20px; border: 1px solid var(--pp-marrom); border-radius: var(--pp-radius-full); background: var(--pp-marrom); color: var(--pp-creme); font: 600 14px/1.5 var(--pp-font-body); cursor: pointer; }
.promotions-page__how { display: grid; grid-template-columns: 1.1fr 1fr; gap: 64px; padding-block: 56px; margin-top: 64px; border-top: 1px solid var(--pp-creme-borda); }
.promotions-page__how h2 { margin: 12px 0 24px; font: 400 clamp(32px, 4vw, 50px)/1.15 var(--pp-font-titulo); }
.promotions-page__how a { display: inline-flex; align-items: center; gap: 12px; min-height: 44px; color: var(--pp-dourado-profundo); font-weight: 600; font-size: 14px; }
.promotions-page__how ol { display: grid; gap: 24px; margin: 0; padding-left: 22px; }
.promotions-page__how li { padding-left: 12px; }
.promotions-page__how li::marker { color: var(--pp-dourado-profundo); font-weight: 700; }
.promotions-page__how strong { font-size: 17px; }
.promotions-page__how li p { max-width: 48ch; margin: 6px 0 0; color: var(--pp-texto-2); font-size: 14px; line-height: 1.6; }
.promotions-page__toast { position: fixed; z-index: 90; bottom: 28px; left: 50%; display: flex; align-items: center; gap: 8px; width: max-content; max-width: calc(100vw - 32px); padding: 12px 24px; border-radius: var(--pp-radius-btn); background: var(--pp-marrom); color: var(--pp-creme); font-size: 14px; line-height: 1.5; transform: translateX(-50%); }
.promotions-page button:focus-visible, .promotions-page a:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
.promotions-page__categories button:focus-visible { outline-offset: -4px; }
.promotions-page__search:focus-within, .promotions-page__sort:focus-within { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 2px; }
.offers-enter-active, .promotions-toast-enter-active, .promotions-toast-leave-active { transition: opacity 250ms var(--pp-ease), transform 250ms var(--pp-ease); }
.offers-enter-from { opacity: .35; transform: translateY(10px); }
.promotions-toast-enter-from, .promotions-toast-leave-to { opacity: 0; }
@keyframes promotion-intro { from { opacity: .6; transform: translateY(8px); } }
@media (max-width: 1000px) { .promotions-page__controls { grid-template-columns: minmax(0, 1fr) auto; } .promotions-page__search { grid-column: 1/-1; border-bottom: 1px solid var(--pp-creme-borda); } .promotions-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 768px) and (max-width: 1000px) { .promotions-page__showcase--pair { display: block; } .promotions-page__showcase--pair .promotions-page__more { margin-top: 40px; max-width: 65%; } }
@media (max-width: 767px) {
  .promotions-page__header { display: block; margin-bottom: 24px; }
  .promotions-page__note { font-size: 24px; }
  .promotions-page__intro { max-width: 100%; margin-top: 16px; font-size: 14px; }
  .promotions-page__controls { gap: 0 12px; }
  .promotions-page__categories { grid-column: 1/-1; }
  .promotions-page__sort { grid-column: 2; }
  .promotions-page__showcase--pair { display: block; }
  .promotions-page__showcase--pair :deep(.promotion-campaign--featured .promotion-campaign__media) { aspect-ratio: 1.25; }
  .promotions-page__showcase--pair :deep(.promotion-campaign--featured .promotion-campaign__copy) { padding: 24px 20px; }
  .promotions-page__more, .promotions-page__showcase--pair .promotions-page__more { margin-top: 40px; }
  .promotions-page__grid { grid-template-columns: minmax(0, 1fr); }
  .promotions-page__how { grid-template-columns: minmax(0, 1fr); gap: 32px; margin-top: 48px; padding-block: 40px; }
  .promotions-page__how ol { padding-right: 56px; }
  .promotions-page__loading { grid-template-columns: minmax(0, 1fr); }
  .promotions-page__toast { bottom: calc(144px + env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion: reduce) { .promotions-page__header { animation: none; } .promotions-page__indicator, .offers-enter-active, .promotions-toast-enter-active, .promotions-toast-leave-active { transition: none; } .offers-enter-from { opacity: 1; transform: none; } }
</style>
