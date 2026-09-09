<template>
  <div class="promotions-page">
    <header class="promotions-page__header">
      <div>
        <span class="promotions-page__eyebrow">Ofertas vigentes</span>
        <h1>Promoções</h1>
        <p>Preços especiais cadastrados pela Pires Panificadora e válidos neste momento.</p>
      </div>

      <RouterLink :to="{ name: 'carrinho' }" class="promotions-page__cart">
        <span class="promotions-page__cart-icon">
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="promotions-page__cart-badge">{{ limitarBadge(cart.totalItens) }}</span>
        </span>
        <span>
          <small>Meu carrinho</small>
          <strong>{{ cart.totalItens ? `${cart.totalItens} ${cart.totalItens === 1 ? 'item' : 'itens'}` : 'Está vazio' }}</strong>
        </span>
        <ChevronRight :size="17" />
      </RouterLink>
    </header>

    <section v-if="!carregando && !erro && promocoesAtivas.length" class="promotions-page__summary">
      <div>
        <span class="promotions-page__summary-icon"><Tag :size="19" /></span>
        <span>
          <small>Ofertas ativas</small>
          <strong>{{ promocoesAtivas.length }}</strong>
        </span>
      </div>
      <div>
        <span class="promotions-page__summary-icon"><Percent :size="19" /></span>
        <span>
          <small>Maior desconto</small>
          <strong>{{ maiorDesconto }}%</strong>
        </span>
      </div>
      <div>
        <span class="promotions-page__summary-icon"><CalendarClock :size="19" /></span>
        <span>
          <small>Atualizado</small>
          <strong>Hoje</strong>
        </span>
      </div>
    </section>

    <section class="promotions-page__toolbar" aria-label="Busca e ordenação de promoções">
      <label class="promotions-page__search">
        <Search :size="18" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar produto em promoção..."
          autocomplete="off"
        />
        <button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''">
          <X :size="15" />
        </button>
      </label>

      <div class="promotions-page__sort">
        <SlidersHorizontal :size="16" />
        <select v-model="ordenacao" aria-label="Ordenar promoções">
          <option value="desconto">Maior desconto</option>
          <option value="menor-preco">Menor preço</option>
          <option value="termina-primeiro">Termina primeiro</option>
          <option value="nome">Nome A–Z</option>
        </select>
        <ChevronDown :size="14" />
      </div>
    </section>

    <div v-if="categoriasPromocionais.length > 1" class="promotions-page__categories">
      <button
        type="button"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="categoriaAtiva = null"
      >
        Todas
      </button>
      <button
        v-for="categoria in categoriasPromocionais"
        :key="categoria.id"
        type="button"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="categoriaAtiva = categoria.id"
      >
        {{ categoria.nome }}
      </button>
    </div>

    <section class="promotions-page__content" aria-labelledby="promotions-title">
      <div class="promotions-page__content-head">
        <div>
          <h2 id="promotions-title">Ofertas disponíveis</h2>
          <p v-if="!carregando && !erro">{{ textoContagem }}</p>
        </div>
      </div>

      <div v-if="carregando" class="promotions-page__grid" aria-label="Carregando promoções">
        <div v-for="index in 8" :key="index" class="promotions-page__skeleton">
          <div />
          <span />
          <span />
        </div>
      </div>

      <div v-else-if="erro" class="promotions-page__state" role="alert">
        <span class="promotions-page__state-icon"><CircleAlert :size="28" /></span>
        <h2>Não conseguimos carregar as promoções.</h2>
        <p>Verifique sua conexão e tente novamente.</p>
        <button type="button" @click="carregarDados">Tentar novamente</button>
      </div>

      <div v-else-if="!promocoesAtivas.length" class="promotions-page__state">
        <span class="promotions-page__state-icon"><Tag :size="28" /></span>
        <h2>Nenhuma promoção ativa agora.</h2>
        <p>O cardápio completo continua disponível normalmente.</p>
        <RouterLink :to="{ name: 'cardapio' }" class="promotions-page__state-link">Ver cardápio</RouterLink>
      </div>

      <div v-else-if="!promocoesFiltradas.length" class="promotions-page__state">
        <span class="promotions-page__state-icon"><SearchX :size="28" /></span>
        <h2>Nenhuma oferta encontrada.</h2>
        <p>Tente outra busca ou remova o filtro de categoria.</p>
        <button type="button" @click="limparFiltros">Limpar filtros</button>
      </div>

      <div v-else class="promotions-page__grid">
        <div v-for="item in promocoesFiltradas" :key="item.promocao.id" class="promotions-page__card-wrap">
          <span v-if="item.desconto > 0" class="promotions-page__discount">-{{ item.desconto }}%</span>
          <ProductCard
            :produto="item.produto"
            :favorito="favorites.tem(item.produto.id)"
            :favoritando="favorites.estaProcessando(item.produto.id)"
            :adicionando="produtoAdicionando === item.produto.id"
            @open="abrirProduto"
            @favorite="alternarFavorito"
            @add="adicionarRapido"
          />
          <div class="promotions-page__validity">
            <CalendarClock :size="13" />
            {{ textoValidade(item.promocao.data_fim) }}
          </div>
        </div>
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

    <Transition name="promotions-toast">
      <div v-if="toast" class="promotions-page__toast" role="status" aria-live="polite">
        <CheckCircle2 :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Percent,
  Search,
  SearchX,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-vue-next'

import ProductCard from '@/components/catalog/ProductCard.vue'
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue'
import catalogService, { promocaoEstaAtiva } from '@/services/catalog.service'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'

const cart = useCartStore()
const favorites = useFavoritesStore()

const produtos = ref([])
const promocoes = ref([])
const busca = ref('')
const categoriaAtiva = ref(null)
const ordenacao = ref('desconto')
const carregando = ref(true)
const erro = ref(false)
const produtoAdicionando = ref(null)
const modalAberto = ref(false)
const carregandoDetalhe = ref(false)
const produtoDetalhado = ref(null)
const adicionandoModal = ref(false)
const detalhesCache = new Map()
const toast = ref('')
let toastTimer = null

const promocoesAtivas = computed(() => {
  const mapaProdutos = new Map(produtos.value.map((produto) => [produto.id, produto]))

  return promocoes.value
    .filter((promocao) => promocaoEstaAtiva(promocao))
    .map((promocao) => {
      const produtoBase = mapaProdutos.get(promocao.produto)
      if (!produtoBase) return null

      const precoOriginal = Number(produtoBase.preco || 0)
      const precoPromocional = Number(promocao.preco_promocional || 0)
      const desconto = precoOriginal > precoPromocional && precoOriginal > 0
        ? Math.round(((precoOriginal - precoPromocional) / precoOriginal) * 100)
        : 0

      return {
        promocao,
        desconto,
        produto: {
          ...produtoBase,
          em_promocao: true,
          preco_atual: promocao.preco_promocional,
          desconto_percentual: desconto,
        },
      }
    })
    .filter(Boolean)
})

const categoriasPromocionais = computed(() => {
  const mapa = new Map()

  promocoesAtivas.value.forEach(({ produto }) => {
    if (produto.categoria && !mapa.has(produto.categoria)) {
      mapa.set(produto.categoria, {
        id: produto.categoria,
        nome: produto.categoria_nome || 'Categoria',
      })
    }
  })

  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const promocoesFiltradas = computed(() => {
  let lista = [...promocoesAtivas.value]

  if (categoriaAtiva.value !== null) {
    lista = lista.filter(({ produto }) => produto.categoria === categoriaAtiva.value)
  }

  const termo = normalizarTexto(busca.value)
  if (termo) {
    lista = lista.filter(({ produto }) =>
      normalizarTexto(`${produto.nome || ''} ${produto.categoria_nome || ''}`).includes(termo),
    )
  }

  if (ordenacao.value === 'menor-preco') {
    lista.sort((a, b) => Number(a.produto.preco_atual) - Number(b.produto.preco_atual))
  } else if (ordenacao.value === 'termina-primeiro') {
    lista.sort((a, b) => String(a.promocao.data_fim).localeCompare(String(b.promocao.data_fim)))
  } else if (ordenacao.value === 'nome') {
    lista.sort((a, b) => String(a.produto.nome).localeCompare(String(b.produto.nome), 'pt-BR'))
  } else {
    lista.sort((a, b) => b.desconto - a.desconto)
  }

  return lista
})

const maiorDesconto = computed(() => Math.max(0, ...promocoesAtivas.value.map((item) => item.desconto)))

const textoContagem = computed(() => {
  const total = promocoesFiltradas.value.length
  return `${total} ${total === 1 ? 'oferta encontrada' : 'ofertas encontradas'}`
})

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function limitarBadge(valor) {
  const numero = Number(valor || 0)
  return numero > 99 ? '99+' : numero
}

function textoValidade(dataFim) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const fim = new Date(`${dataFim}T00:00:00`)
  const dias = Math.round((fim - hoje) / 86_400_000)

  if (dias <= 0) return 'Termina hoje'
  if (dias === 1) return 'Termina amanhã'
  return `Válida por mais ${dias} dias`
}

async function carregarDados() {
  carregando.value = true
  erro.value = false

  try {
    const [produtosData, promocoesData] = await Promise.all([
      catalogService.listarProdutosAtivos(),
      catalogService.listarPromocoes(),
    ])

    produtos.value = produtosData
    promocoes.value = promocoesData
  } catch {
    produtos.value = []
    promocoes.value = []
    erro.value = true
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
  ordenacao.value = 'desconto'
}

function mostrarToast(mensagem) {
  toast.value = mensagem
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2300)
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
.promotions-page {
  width: min(100%, 1320px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.promotions-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.promotions-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7a10;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.promotions-page__header h1 {
  margin: 0;
  color: #201b17;
  font-size: clamp(31px, 4vw, 43px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.promotions-page__header p {
  margin: 9px 0 0;
  color: #81776e;
  font-size: 12.5px;
}

.promotions-page__cart {
  min-width: 210px;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 7px 12px;
  border: 1px solid rgba(46, 31, 20, 0.08);
  border-radius: 15px;
  background: #fff;
  color: #40372f;
  box-shadow: 0 7px 22px rgba(48, 32, 21, 0.04);
}

.promotions-page__cart-icon {
  width: 38px;
  height: 38px;
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #fff4dc;
  color: #bd7a10;
}

.promotions-page__cart-badge {
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

.promotions-page__cart > span:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.promotions-page__cart small,
.promotions-page__cart strong {
  display: block;
}

.promotions-page__cart small {
  color: #91877e;
  font-size: 9px;
}

.promotions-page__cart strong {
  margin-top: 2px;
  font-size: 11.5px;
}

.promotions-page__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 17px;
}

.promotions-page__summary > div {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 67px;
  padding: 11px 14px;
  border: 1px solid rgba(45, 29, 19, 0.07);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.92);
}

.promotions-page__summary-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #fff3dc;
  color: #b9760d;
}

.promotions-page__summary small,
.promotions-page__summary strong {
  display: block;
}

.promotions-page__summary small {
  color: #978e86;
  font-size: 9px;
}

.promotions-page__summary strong {
  margin-top: 2px;
  color: #322b25;
  font-size: 13px;
}

.promotions-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 11px;
  margin-bottom: 11px;
}

.promotions-page__search,
.promotions-page__sort {
  min-height: 47px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(50, 33, 22, 0.085);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: #827970;
}

.promotions-page__search {
  gap: 9px;
  padding: 0 14px;
}

.promotions-page__search input,
.promotions-page__sort select {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #403831;
  font: inherit;
  font-size: 11px;
}

.promotions-page__search button {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f5f1ec;
  color: #81776e;
}

.promotions-page__sort {
  position: relative;
  gap: 7px;
  padding: 0 11px;
}

.promotions-page__sort select {
  appearance: none;
  font-weight: 700;
  cursor: pointer;
}

.promotions-page__categories {
  display: flex;
  gap: 7px;
  margin-bottom: 22px;
  overflow-x: auto;
  scrollbar-width: none;
}

.promotions-page__categories::-webkit-scrollbar {
  display: none;
}

.promotions-page__categories button {
  min-height: 32px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid #e7ded4;
  border-radius: 999px;
  background: #fff;
  color: #776c62;
  font-size: 9.5px;
  font-weight: 750;
  cursor: pointer;
}

.promotions-page__categories button.is-active {
  border-color: #2e2119;
  background: #2e2119;
  color: #fff4e5;
}

.promotions-page__content-head {
  margin-bottom: 13px;
}

.promotions-page__content-head h2 {
  margin: 0;
  color: #29231e;
  font-size: 17px;
}

.promotions-page__content-head p {
  margin: 4px 0 0;
  color: #948a82;
  font-size: 10px;
}

.promotions-page__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
}

.promotions-page__card-wrap {
  min-width: 0;
  position: relative;
}

.promotions-page__discount {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 4;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: #2b170c;
  color: #ffc14a;
  font-size: 9.5px;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(42, 23, 12, 0.18);
}

.promotions-page__validity {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 0 3px;
  color: #948a81;
  font-size: 9px;
  font-weight: 650;
}

.promotions-page__skeleton {
  min-height: 300px;
  padding: 10px;
  border-radius: 18px;
  background: #fff;
}

.promotions-page__skeleton div,
.promotions-page__skeleton span {
  display: block;
  border-radius: 11px;
  background: linear-gradient(90deg, #eee9e3 25%, #f6f2ed 45%, #eee9e3 65%);
  background-size: 250% 100%;
  animation: promo-shimmer 1.3s linear infinite;
}

.promotions-page__skeleton div {
  aspect-ratio: 1.2 / 1;
}

.promotions-page__skeleton span {
  width: 70%;
  height: 11px;
  margin-top: 13px;
}

.promotions-page__skeleton span:last-child {
  width: 42%;
  height: 9px;
  margin-top: 8px;
}

@keyframes promo-shimmer {
  to { background-position: -150% 0; }
}

.promotions-page__state {
  min-height: 330px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  border: 1px dashed #dfd5cb;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.56);
  text-align: center;
}

.promotions-page__state-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-bottom: 3px;
  border-radius: 15px;
  background: #fff1dc;
  color: #bd7a10;
}

.promotions-page__state h2 {
  margin: 0;
  font-size: 16px;
}

.promotions-page__state p {
  margin: 0 0 5px;
  color: #877e76;
  font-size: 10.5px;
}

.promotions-page__state button,
.promotions-page__state-link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 15px;
  border: 0;
  border-radius: 9px;
  background: #dfa438;
  color: #29170b;
  font-size: 10.5px;
  font-weight: 800;
  cursor: pointer;
}

.promotions-page__toast {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 120;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 12px;
  background: #2f1c11;
  color: #f8ebd9;
  box-shadow: 0 16px 40px rgba(35, 20, 11, 0.22);
  font-size: 11px;
  font-weight: 700;
}

.promotions-toast-enter-active,
.promotions-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.promotions-toast-enter-from,
.promotions-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1100px) {
  .promotions-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .promotions-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .promotions-page__header {
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .promotions-page__header h1 {
    font-size: 29px;
  }

  .promotions-page__header p {
    max-width: 250px;
    font-size: 10.5px;
  }

  .promotions-page__cart {
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .promotions-page__cart > span:nth-child(2),
  .promotions-page__cart > svg {
    display: none;
  }

  .promotions-page__cart-icon {
    width: 40px;
    height: 40px;
    background: #fff;
    box-shadow: 0 5px 15px rgba(45, 29, 18, 0.06);
  }

  .promotions-page__summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .promotions-page__summary > div {
    min-height: 58px;
    padding: 8px;
  }

  .promotions-page__summary-icon {
    width: 31px;
    height: 31px;
  }

  .promotions-page__summary small {
    font-size: 7.5px;
  }

  .promotions-page__summary strong {
    font-size: 10.5px;
  }

  .promotions-page__toolbar {
    grid-template-columns: minmax(0, 1fr) 44px;
    gap: 7px;
  }

  .promotions-page__search,
  .promotions-page__sort {
    min-height: 43px;
    border-radius: 12px;
  }

  .promotions-page__sort {
    justify-content: center;
    padding: 0;
  }

  .promotions-page__sort select {
    position: absolute;
    inset: 0;
    opacity: 0;
  }

  .promotions-page__sort > svg:last-child {
    display: none;
  }

  .promotions-page__categories {
    margin-inline: -16px;
    padding-inline: 16px;
  }

  .promotions-page__grid {
    gap: 9px;
  }

  .promotions-page__discount {
    top: 14px;
    left: 14px;
    min-height: 22px;
    font-size: 8.5px;
  }

  .promotions-page__toast {
    left: 16px;
    right: 16px;
    bottom: 82px;
    justify-content: center;
  }
}
</style>
