<template>
  <div class="menu-page">
    <header class="menu-page__header">
      <div>
        <span class="menu-page__eyebrow">Pires Panificadora</span>
        <h1>Cardápio</h1>
        <p>Escolha seus produtos favoritos e deixe seu intervalo mais prático.</p>
      </div>

      <RouterLink :to="{ name: 'carrinho' }" class="menu-page__cart-summary">
        <span class="menu-page__cart-icon">
          <ShoppingCart :size="20" />
          <span v-if="cart.totalItens" class="menu-page__cart-badge">{{ limitarBadge(cart.totalItens) }}</span>
        </span>
        <span>
          <small>Meu carrinho</small>
          <strong>{{ cart.totalItens ? `${cart.totalItens} ${cart.totalItens === 1 ? 'item' : 'itens'}` : 'Está vazio' }}</strong>
        </span>
        <ChevronRight :size="18" />
      </RouterLink>
    </header>

    <section class="menu-page__toolbar" aria-label="Busca e filtros">
      <label class="menu-page__search">
        <Search :size="19" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar por produto ou categoria..."
          autocomplete="off"
        />
        <button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''">
          <X :size="16" />
        </button>
      </label>

      <div class="menu-page__sort">
        <SlidersHorizontal :size="17" aria-hidden="true" />
        <select v-model="ordenacao" aria-label="Ordenar produtos">
          <option value="relevancia">Relevância</option>
          <option value="nome">Nome A–Z</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select>
        <ChevronDown :size="15" aria-hidden="true" />
      </div>
    </section>

    <nav class="menu-page__categories" aria-label="Filtrar por categoria">
      <button
        type="button"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="categoriaAtiva = null"
      >
        <LayoutGrid :size="17" />
        Todos
      </button>

      <button
        v-for="categoria in categorias"
        :key="categoria.id"
        type="button"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="categoriaAtiva = categoria.id"
      >
        {{ categoria.nome }}
      </button>
    </nav>

    <div class="menu-page__filter-row">
      <div class="menu-page__quick-filters" aria-label="Filtros rápidos">
        <button type="button" :class="{ 'is-active': filtroRapido === 'todos' }" @click="filtroRapido = 'todos'">
          Todos os produtos
        </button>
        <button type="button" :class="{ 'is-active': filtroRapido === 'promocao' }" @click="filtroRapido = 'promocao'">
          <Tag :size="14" /> Em promoção
        </button>
        <button type="button" :class="{ 'is-active': filtroRapido === 'destaque' }" @click="filtroRapido = 'destaque'">
          <Sparkles :size="14" /> Destaques
        </button>
      </div>

      <button v-if="temFiltros" type="button" class="menu-page__clear" @click="limparFiltros">
        Limpar filtros
      </button>
    </div>

    <section class="menu-page__content" aria-labelledby="menu-page-products-title">
      <div class="menu-page__content-head">
        <div>
          <h2 id="menu-page-products-title">{{ tituloResultados }}</h2>
          <p v-if="!carregando">{{ textoContagem }}</p>
        </div>

        <span v-if="!carregando && produtosFiltrados.length" class="menu-page__result-badge">
          {{ produtosFiltrados.length }}
        </span>
      </div>

      <div v-if="carregando" class="menu-page__grid" aria-label="Carregando cardápio">
        <div v-for="index in 10" :key="index" class="menu-page__skeleton" aria-hidden="true">
          <div />
          <span />
          <span />
        </div>
      </div>

      <div v-else-if="erro" class="menu-page__state menu-page__state--error" role="alert">
        <span class="menu-page__state-icon"><CircleAlert :size="28" /></span>
        <div>
          <h2>Não conseguimos carregar o cardápio.</h2>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
        <button type="button" @click="carregarDados">Tentar novamente</button>
      </div>

      <div v-else-if="!produtosFiltrados.length" class="menu-page__state">
        <span class="menu-page__state-icon"><SearchX :size="28" /></span>
        <div>
          <h2>Nenhum produto encontrado.</h2>
          <p>Tente outra busca ou remova alguns filtros.</p>
        </div>
        <button v-if="temFiltros" type="button" @click="limparFiltros">Ver todos os produtos</button>
      </div>

      <div v-else class="menu-page__grid">
        <ProductCard
          v-for="produto in produtosFiltrados"
          :key="produto.id"
          :produto="produto"
          :favorito="favorites.tem(produto.id)"
          :favoritando="favorites.estaProcessando(produto.id)"
          :adicionando="produtoAdicionando === produto.id"
          @open="abrirProduto"
          @favorite="alternarFavorito"
          @add="adicionarRapido"
        />
      </div>
    </section>

    <ProductDetailsModal
      :open="modalAberto"
      :produto="produtoDetalhado"
      :loading="carregandoDetalhe"
      :adding="adicionandoModal"
      :favorito="Boolean(produtoDetalhado && favorites.tem(produtoDetalhado.id))"
      :favoritando="Boolean(produtoDetalhado && favorites.estaProcessando(produtoDetalhado.id))"
      @close="fecharModal"
      @favorite="alternarFavorito"
      @add="adicionarDoModal"
    />

    <Transition name="menu-toast">
      <div v-if="toast" class="menu-page__toast" role="status" aria-live="polite">
        <CheckCircle2 :size="18" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  LayoutGrid,
  Search,
  SearchX,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from 'lucide-vue-next'

import ProductCard from '@/components/catalog/ProductCard.vue'
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue'
import catalogService from '@/services/catalog.service'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'

const cart = useCartStore()
const favorites = useFavoritesStore()

const categorias = ref([])
const produtos = ref([])
const busca = ref('')
const categoriaAtiva = ref(null)
const filtroRapido = ref('todos')
const ordenacao = ref('relevancia')
const detalhesCache = new Map()

const carregando = ref(true)
const erro = ref(false)
const modalAberto = ref(false)
const carregandoDetalhe = ref(false)
const produtoDetalhado = ref(null)
const produtoAdicionando = ref(null)
const adicionandoModal = ref(false)
const toast = ref('')
let toastTimer = null

const temFiltros = computed(() => Boolean(
  busca.value.trim() ||
  categoriaAtiva.value !== null ||
  filtroRapido.value !== 'todos' ||
  ordenacao.value !== 'relevancia',
))

const produtosFiltrados = computed(() => {
  let lista = [...produtos.value]

  if (categoriaAtiva.value !== null) {
    lista = lista.filter((produto) => produto.categoria === categoriaAtiva.value)
  }

  if (filtroRapido.value === 'promocao') {
    lista = lista.filter((produto) => produto.em_promocao)
  } else if (filtroRapido.value === 'destaque') {
    lista = lista.filter((produto) => produto.destaque)
  }

  const termo = normalizarTexto(busca.value)
  if (termo) {
    lista = lista.filter((produto) => {
      const alvo = normalizarTexto(`${produto.nome || ''} ${produto.categoria_nome || ''}`)
      return alvo.includes(termo)
    })
  }

  if (ordenacao.value === 'nome') {
    lista.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
  } else if (ordenacao.value === 'menor-preco') {
    lista.sort((a, b) => precoProduto(a) - precoProduto(b))
  } else if (ordenacao.value === 'maior-preco') {
    lista.sort((a, b) => precoProduto(b) - precoProduto(a))
  } else {
    lista.sort((a, b) => {
      const scoreA = Number(Boolean(a.destaque)) * 2 + Number(Boolean(a.em_promocao))
      const scoreB = Number(Boolean(b.destaque)) * 2 + Number(Boolean(b.em_promocao))
      if (scoreA !== scoreB) return scoreB - scoreA
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
    })
  }

  return lista
})

const tituloResultados = computed(() => {
  const categoria = categorias.value.find((item) => item.id === categoriaAtiva.value)

  if (busca.value.trim()) return `Resultados para “${busca.value.trim()}”`
  if (filtroRapido.value === 'promocao') return 'Produtos em promoção'
  if (filtroRapido.value === 'destaque') return 'Destaques da Pires'
  if (categoria) return categoria.nome
  return 'Todos os produtos'
})

const textoContagem = computed(() => {
  const total = produtosFiltrados.value.length
  if (!total) return ''
  return `${total} ${total === 1 ? 'produto encontrado' : 'produtos encontrados'}`
})

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function precoProduto(produto) {
  return Number(produto?.preco_atual ?? produto?.preco ?? 0)
}

function limitarBadge(valor) {
  const numero = Number(valor || 0)
  return numero > 99 ? '99+' : numero
}

async function alternarFavorito(produto) {
  if (!produto?.id) return

  const estavaFavoritado = favorites.tem(produto.id)

  try {
    await favorites.alternar(produto)
    mostrarToast(
      estavaFavoritado
        ? `${produto.nome} removido dos favoritos.`
        : `${produto.nome} adicionado aos favoritos.`,
    )
  } catch {
    mostrarToast('Não foi possível atualizar seus favoritos.')
  }
}

async function carregarDados() {
  carregando.value = true
  erro.value = false

  try {
    const [categoriasData, produtosData] = await Promise.all([
      catalogService.listarCategoriasAtivas(),
      catalogService.listarProdutosAtivos(),
    ])

    categorias.value = categoriasData
    produtos.value = produtosData
  } catch {
    erro.value = true
    categorias.value = []
    produtos.value = []
  } finally {
    carregando.value = false
  }
}

async function obterDetalhes(produto) {
  if (!produto?.id) return null
  if (detalhesCache.has(produto.id)) return detalhesCache.get(produto.id)

  const detalhe = await catalogService.obterProduto(produto.id)
  detalhesCache.set(produto.id, detalhe)
  return detalhe
}

async function abrirProduto(produto) {
  modalAberto.value = true
  carregandoDetalhe.value = true
  produtoDetalhado.value = null

  try {
    produtoDetalhado.value = await obterDetalhes(produto)
  } catch {
    produtoDetalhado.value = null
  } finally {
    carregandoDetalhe.value = false
  }
}

function fecharModal() {
  modalAberto.value = false
  produtoDetalhado.value = null
}

async function adicionarRapido(produto) {
  if (produtoAdicionando.value) return
  produtoAdicionando.value = produto.id

  try {
    const detalhe = await obterDetalhes(produto)
    const estoque = Number(detalhe?.estoque ?? 0)

    if (estoque <= 0) {
      mostrarToast(`${produto.nome} está sem estoque no momento.`)
      return
    }

    const itemAtual = cart.itens.find((item) => item.produto.id === produto.id)
    if ((itemAtual?.quantidade || 0) >= estoque) {
      mostrarToast(`Você já adicionou todo o estoque disponível de ${produto.nome}.`)
      return
    }

    cart.adicionar({ ...produto, ...detalhe }, 1)
    mostrarToast(`${produto.nome} adicionado ao carrinho.`)
  } catch {
    mostrarToast('Não foi possível verificar a disponibilidade do produto.')
  } finally {
    produtoAdicionando.value = null
  }
}

async function adicionarDoModal({ produto, quantidade }) {
  if (!produto || adicionandoModal.value) return
  adicionandoModal.value = true

  try {
    const estoque = Number(produto.estoque || 0)
    const itemAtual = cart.itens.find((item) => item.produto.id === produto.id)
    const novaQuantidade = (itemAtual?.quantidade || 0) + quantidade

    if (novaQuantidade > estoque) {
      mostrarToast(`Há somente ${estoque} ${estoque === 1 ? 'unidade disponível' : 'unidades disponíveis'}.`)
      return
    }

    cart.adicionar(produto, quantidade)
    mostrarToast(`${produto.nome} adicionado ao carrinho.`)
    fecharModal()
  } finally {
    adicionandoModal.value = false
  }
}

function limparFiltros() {
  busca.value = ''
  categoriaAtiva.value = null
  filtroRapido.value = 'todos'
  ordenacao.value = 'relevancia'
}

function mostrarToast(mensagem) {
  toast.value = mensagem
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2400)
}

onMounted(() => {
  favorites.carregar().catch(() => {})
  carregarDados()
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer)
})
</script>

<style scoped>
.menu-page {
  width: min(100%, 1320px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.menu-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 24px;
}

.menu-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7c14;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.menu-page__header h1 {
  margin: 0;
  color: #241e19;
  font-size: clamp(28px, 3.1vw, 42px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.menu-page__header p {
  margin: 8px 0 0;
  color: #746b63;
  font-size: 13px;
}

.menu-page__cart-summary {
  min-width: 190px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(49, 33, 22, 0.075);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.82);
  color: #382f28;
  box-shadow: 0 7px 22px rgba(48, 32, 21, 0.04);
}

.menu-page__cart-icon {
  width: 38px;
  height: 38px;
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 11px;
  background: #fff4dc;
  color: #bd7a10;
}

.menu-page__cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #d99b2f;
  color: #2b180c;
  font-size: 8px;
  font-weight: 900;
}

.menu-page__cart-summary > span:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.menu-page__cart-summary small,
.menu-page__cart-summary strong {
  display: block;
}

.menu-page__cart-summary small {
  color: #91877e;
  font-size: 9px;
}

.menu-page__cart-summary strong {
  margin-top: 2px;
  font-size: 11.5px;
}

.menu-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
  margin-bottom: 15px;
}

.menu-page__search,
.menu-page__sort {
  min-height: 48px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(50, 33, 22, 0.085);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: #827970;
  box-shadow: 0 5px 17px rgba(48, 32, 21, 0.025);
}

.menu-page__search {
  gap: 10px;
  padding: 0 15px;
}

.menu-page__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #302923;
  font: inherit;
  font-size: 12px;
}

.menu-page__search input::placeholder {
  color: #9d958d;
}

.menu-page__search button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f5f1ec;
  color: #80776f;
  cursor: pointer;
}

.menu-page__sort {
  position: relative;
  gap: 8px;
  padding: 0 12px;
}

.menu-page__sort select {
  min-width: 0;
  flex: 1;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: #51483f;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.menu-page__categories {
  display: flex;
  gap: 9px;
  padding: 2px 0 9px;
  overflow-x: auto;
  scrollbar-width: none;
}

.menu-page__categories::-webkit-scrollbar,
.menu-page__quick-filters::-webkit-scrollbar {
  display: none;
}

.menu-page__categories button {
  min-height: 40px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 17px;
  border: 1px solid rgba(49, 33, 22, 0.08);
  border-radius: 12px;
  background: #fff;
  color: #51483f;
  font: inherit;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.menu-page__categories button.is-active {
  border-color: #2d1d14;
  background: #2d211a;
  color: #fff4e5;
}

.menu-page__filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 8px 0 27px;
}

.menu-page__quick-filters {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
}

.menu-page__quick-filters button,
.menu-page__clear {
  min-height: 31px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #847a71;
  font: inherit;
  font-size: 10px;
  font-weight: 720;
  cursor: pointer;
}

.menu-page__quick-filters button.is-active {
  border-color: #eadfce;
  background: #fff8ec;
  color: #a56b0e;
}

.menu-page__clear {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.menu-page__content-head {
  min-height: 46px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.menu-page__content-head h2 {
  margin: 0;
  color: #29231e;
  font-size: 17px;
  letter-spacing: -0.02em;
}

.menu-page__content-head p {
  margin: 4px 0 0;
  color: #928981;
  font-size: 10.5px;
}

.menu-page__result-badge {
  min-width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: #efe5d8;
  color: #755020;
  font-size: 10px;
  font-weight: 850;
}

.menu-page__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.menu-page__skeleton {
  min-height: 290px;
  padding: 10px;
  border-radius: 18px;
  background: #fff;
  overflow: hidden;
}

.menu-page__skeleton div,
.menu-page__skeleton span {
  display: block;
  border-radius: 12px;
  background: linear-gradient(90deg, #eee9e3 25%, #f6f2ed 45%, #eee9e3 65%);
  background-size: 250% 100%;
  animation: menu-shimmer 1.3s linear infinite;
}

.menu-page__skeleton div {
  aspect-ratio: 1.2 / 1;
}

.menu-page__skeleton span {
  width: 72%;
  height: 12px;
  margin-top: 13px;
}

.menu-page__skeleton span:last-child {
  width: 45%;
  height: 9px;
  margin-top: 8px;
}

@keyframes menu-shimmer {
  to { background-position: -150% 0; }
}

.menu-page__state {
  min-height: 330px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  border: 1px dashed #dfd5cb;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.56);
  text-align: center;
}

.menu-page__state-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: #f7efe3;
  color: #c18423;
}

.menu-page__state h2 {
  margin: 5px 0 0;
  font-size: 16px;
}

.menu-page__state p {
  margin: 5px 0 0;
  color: #877e76;
  font-size: 11px;
}

.menu-page__state button {
  min-height: 38px;
  margin-top: 5px;
  padding: 0 16px;
  border: 0;
  border-radius: 9px;
  background: #dfa438;
  color: #29170b;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.menu-page__toast {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(380px, calc(100vw - 32px));
  min-height: 46px;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: #2f1c11;
  color: #f8ebd9;
  box-shadow: 0 16px 40px rgba(35, 20, 11, 0.22);
  font-size: 11.5px;
  font-weight: 650;
}

.menu-toast-enter-active,
.menu-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.menu-toast-enter-from,
.menu-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1260px) {
  .menu-page__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .menu-page__header {
    align-items: center;
  }

  .menu-page__cart-summary {
    min-width: 176px;
  }

  .menu-page__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .menu-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .menu-page__header {
    align-items: flex-start;
    margin-bottom: 17px;
  }

  .menu-page__eyebrow {
    margin-bottom: 4px;
    font-size: 8.5px;
  }

  .menu-page__header h1 {
    font-size: 29px;
  }

  .menu-page__header p {
    max-width: 250px;
    margin-top: 5px;
    font-size: 10.5px;
    line-height: 1.45;
  }

  .menu-page__cart-summary {
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .menu-page__cart-summary > span:nth-child(2),
  .menu-page__cart-summary > svg {
    display: none;
  }

  .menu-page__cart-icon {
    width: 40px;
    height: 40px;
    background: #fff;
    box-shadow: 0 5px 15px rgba(45, 29, 18, 0.06);
  }

  .menu-page__toolbar {
    grid-template-columns: minmax(0, 1fr) 45px;
    gap: 8px;
    margin-bottom: 11px;
  }

  .menu-page__search,
  .menu-page__sort {
    min-height: 44px;
    border-radius: 12px;
  }

  .menu-page__search {
    padding-inline: 12px;
  }

  .menu-page__search input {
    font-size: 10.5px;
  }

  .menu-page__sort {
    justify-content: center;
    padding: 0;
  }

  .menu-page__sort select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .menu-page__sort > svg:last-child {
    display: none;
  }

  .menu-page__categories {
    gap: 7px;
    margin-inline: -16px;
    padding: 2px 16px 8px;
  }

  .menu-page__categories button {
    min-height: 36px;
    padding-inline: 13px;
    border-radius: 11px;
    font-size: 9.5px;
  }

  .menu-page__filter-row {
    margin: 5px 0 19px;
  }

  .menu-page__quick-filters {
    margin-right: -16px;
    padding-right: 16px;
  }

  .menu-page__quick-filters button {
    min-height: 28px;
    font-size: 9px;
  }

  .menu-page__clear {
    display: none;
  }

  .menu-page__content-head {
    min-height: 39px;
    margin-bottom: 10px;
  }

  .menu-page__content-head h2 {
    font-size: 14px;
  }

  .menu-page__content-head p {
    font-size: 9.5px;
  }

  .menu-page__result-badge {
    min-width: 27px;
    height: 27px;
    font-size: 9px;
  }

  .menu-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .menu-page__skeleton {
    min-height: 232px;
    padding: 7px;
    border-radius: 15px;
  }

  .menu-page__state {
    min-height: 300px;
    padding: 24px 18px;
  }

  .menu-page__toast {
    left: 16px;
    right: 16px;
    bottom: 82px;
    justify-content: center;
  }
}
</style>
