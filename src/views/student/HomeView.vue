<template>
  <div class="home">
    <header class="home__header">
      <div class="home__greeting-row">
        <div class="home__greeting">
          <h1>{{ saudacao }}, {{ primeiroNome }}!</h1>
          <p>Que tal reservar algo delicioso para o intervalo?</p>
        </div>

        <RouterLink :to="{ name: 'perfil' }" class="home__mobile-avatar" aria-label="Abrir perfil">
          <img
            v-if="avatarDisponivel"
            :src="auth.usuario.avatar"
            :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
            @error="avatarComErro = true"
          />
          <template v-else>{{ iniciais }}</template>
        </RouterLink>
      </div>

      <label class="home__search">
        <Search :size="19" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar produtos, categorias..."
          aria-label="Buscar produtos e categorias"
        />
      </label>

      <div class="home__actions">
        <RouterLink :to="{ name: 'notificacoes' }" class="home__icon-btn" aria-label="Notificações">
          <Bell :size="20" />
          <span v-if="notifications.naoLidas" class="home__badge">{{ limitarBadge(notifications.naoLidas) }}</span>
        </RouterLink>

        <RouterLink :to="{ name: 'carrinho' }" class="home__icon-btn" aria-label="Carrinho">
          <ShoppingCart :size="20" />
          <span v-if="cart.totalItens" class="home__badge">{{ limitarBadge(cart.totalItens) }}</span>
        </RouterLink>

        <RouterLink :to="{ name: 'perfil' }" class="home__avatar" aria-label="Abrir perfil">
          <img
            v-if="avatarDisponivel"
            :src="auth.usuario.avatar"
            :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
            @error="avatarComErro = true"
          />
          <template v-else>{{ iniciais }}</template>
        </RouterLink>
      </div>
    </header>

    <nav class="home__categories" aria-label="Categorias do cardápio">
      <button
        type="button"
        class="home__category"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="selecionarCategoria(null)"
      >
        <LayoutGrid :size="18" aria-hidden="true" />
        <span>Todos</span>
      </button>

      <button
        v-for="categoria in categorias"
        :key="categoria.id"
        type="button"
        class="home__category"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="selecionarCategoria(categoria.id)"
      >
        <component :is="iconeParaCategoria(categoria.slug || categoria.nome)" :size="18" aria-hidden="true" />
        <span>{{ categoria.nome }}</span>
      </button>
    </nav>

    <section class="home__hero" aria-label="Destaque do dia">
      <div v-if="carregandoPromos || carregandoProdutos" class="home__hero-card home__skeleton" aria-hidden="true" />

      <template v-else-if="promoDestaque">
        <Transition name="hero-fade" mode="out-in">
          <article :key="promoDestaque.id" class="home__hero-card">
            <div class="home__hero-content">
              <span class="home__hero-tag">
                <Flame :size="14" aria-hidden="true" />
                Promoção do dia
              </span>

              <h2>{{ promoDestaque.produto_nome }}</h2>
              <p>Preço especial por tempo limitado.</p>

              <div class="home__hero-price">
                <span
                  v-if="promoDestaque.precoOriginal > Number(promoDestaque.preco_promocional)"
                  class="home__hero-price-old"
                >
                  {{ formatarPreco(promoDestaque.precoOriginal) }}
                </span>
                <strong>{{ formatarPreco(promoDestaque.preco_promocional) }}</strong>
              </div>

              <button
                type="button"
                class="home__hero-btn"
                @click="abrirProduto(promoDestaque.produto)"
              >
                Ver detalhes
                <ChevronRight :size="17" aria-hidden="true" />
              </button>
            </div>

            <div class="home__hero-media">
              <img
                v-if="imagemDisponivel(promoDestaque.produto)"
                :src="imagemProduto(promoDestaque.produto)"
                :alt="promoDestaque.produto_nome"
                fetchpriority="high"
                @error="registrarErroImagem(promoDestaque.produto?.id)"
              />
              <div v-else class="home__hero-fallback" aria-hidden="true">
                <component :is="iconeParaCategoria(promoDestaque.categoriaNome)" :size="84" />
              </div>
            </div>
          </article>
        </Transition>

        <div v-if="promosAtivas.length > 1" class="home__dots" aria-label="Selecionar promoção">
          <button
            v-for="(promo, index) in promosAtivas"
            :key="promo.id"
            type="button"
            :class="{ 'is-active': index === promoIndex }"
            :aria-label="`Mostrar promoção ${index + 1}`"
            :aria-current="index === promoIndex ? 'true' : undefined"
            @click="promoIndex = index"
          />
        </div>
      </template>

      <article v-else class="home__hero-card home__hero-card--institutional">
        <div class="home__hero-content">
          <span class="home__hero-tag">
            <ShoppingBag :size="14" aria-hidden="true" />
            Pires Panificadora
          </span>
          <h2>Seu intervalo, sem fila.</h2>
          <p>Escolha seus produtos com antecedência e retire no balcão.</p>
          <RouterLink :to="{ name: 'cardapio' }" class="home__hero-btn">
            Ver cardápio
            <ChevronRight :size="17" aria-hidden="true" />
          </RouterLink>
        </div>
        <div class="home__hero-fallback home__hero-fallback--standalone" aria-hidden="true">
          <ShoppingBag :size="82" />
        </div>
      </article>
    </section>

    <section class="home__section" aria-labelledby="titulo-destaques">
      <div class="home__section-head">
        <div>
          <h2 id="titulo-destaques">{{ tituloDestaques }}</h2>
          <p v-if="temFiltroAtivo">Resultados com base nos filtros selecionados.</p>
        </div>
        <RouterLink :to="{ name: 'cardapio' }">
          Ver todos
          <ChevronRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>

      <div v-if="carregandoProdutos" class="home__product-row" aria-label="Carregando produtos">
        <div v-for="index in 5" :key="index" class="home__product-card home__product-card--skeleton home__skeleton" />
      </div>

      <div v-else-if="erroProdutos" class="home__state home__state--error" role="alert">
        <CircleAlert :size="24" aria-hidden="true" />
        <div>
          <strong>Não foi possível carregar o cardápio.</strong>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
        <button type="button" @click="carregarProdutos">Tentar novamente</button>
      </div>

      <div v-else-if="!destaques.length" class="home__state">
        <SearchX :size="25" aria-hidden="true" />
        <div>
          <strong>Nenhum produto encontrado.</strong>
          <p>Tente mudar a busca ou selecionar outra categoria.</p>
        </div>
      </div>

      <div v-else class="home__product-row">
        <article v-for="produto in destaques" :key="produto.id" class="home__product-card">
          <button
            type="button"
            class="home__fav-btn"
            :class="{ 'is-active': favorites.tem(produto.id) }"
            :aria-label="favorites.tem(produto.id) ? `Remover ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`"
            @click="alternarFavorito(produto)"
          >
            <Heart :size="18" :fill="favorites.tem(produto.id) ? 'currentColor' : 'none'" />
          </button>

          <button
            type="button"
            class="home__product-open"
            :aria-label="`Ver detalhes de ${produto.nome}`"
            @click="abrirProduto(produto)"
          >
            <div class="home__product-image">
              <img
                v-if="imagemDisponivel(produto)"
                :src="imagemProduto(produto)"
                :alt="produto.nome"
                loading="lazy"
                @error="registrarErroImagem(produto.id)"
              />
              <div v-else class="home__product-fallback" aria-hidden="true">
                <component :is="iconeParaCategoria(produto.categoria_nome)" :size="42" />
              </div>

              <span v-if="produto.em_promocao" class="home__product-promo">Oferta</span>
            </div>

            <div class="home__product-body">
              <h3>{{ produto.nome }}</h3>
              <p>{{ produto.categoria_nome || 'Produto' }}</p>
            </div>
          </button>

          <div class="home__product-footer">
            <div class="home__product-prices">
              <span v-if="produto.em_promocao" class="home__product-price-old">{{ formatarPreco(produto.preco) }}</span>
              <strong>{{ formatarPreco(produto.preco_atual) }}</strong>
            </div>

            <button
              type="button"
              class="home__add-btn"
              :disabled="produtoAdicionando === produto.id"
              :aria-label="`Adicionar ${produto.nome} ao carrinho`"
              @click="adicionarAoCarrinho(produto)"
            >
              <LoaderCircle
                v-if="produtoAdicionando === produto.id"
                :size="18"
                class="home__add-spinner"
              />
              <Plus v-else :size="19" />
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="home__section home__section--promos" aria-labelledby="titulo-promocoes">
      <div class="home__section-head">
        <div>
          <h2 id="titulo-promocoes">Promoções especiais</h2>
        </div>
        <RouterLink :to="{ name: 'promocoes' }">
          Ver todas
          <ChevronRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>

      <div v-if="carregandoPromos || carregandoProdutos" class="home__promo-row" aria-label="Carregando promoções">
        <div v-for="index in 3" :key="index" class="home__promo-card home__skeleton" />
      </div>

      <div v-else-if="erroPromos" class="home__state home__state--compact">
        <Tag :size="23" aria-hidden="true" />
        <div>
          <strong>As promoções não puderam ser carregadas.</strong>
          <p>O restante do cardápio continua disponível.</p>
        </div>
      </div>

      <div v-else-if="!promosAtivas.length" class="home__state home__state--compact">
        <Tag :size="23" aria-hidden="true" />
        <div>
          <strong>Nenhuma promoção ativa agora.</strong>
          <p>Quando houver uma oferta vigente, ela aparecerá aqui.</p>
        </div>
      </div>

      <div v-else class="home__promo-row">
        <article
          v-for="promo in promocoesVisiveis"
          :key="promo.id"
          class="home__promo-card"
          role="button"
          tabindex="0"
          :aria-label="`Ver detalhes de ${promo.produto_nome}`"
          @click="abrirProduto(promo.produto)"
          @keydown.enter="abrirProduto(promo.produto)"
          @keydown.space.prevent="abrirProduto(promo.produto)"
        >
          <div class="home__promo-copy">
            <span class="home__promo-category">{{ promo.categoriaNome || 'Oferta' }}</span>
            <h3>{{ promo.produto_nome }}</h3>

            <div class="home__promo-prices">
              <strong>{{ formatarPreco(promo.preco_promocional) }}</strong>
              <span v-if="promo.precoOriginal > Number(promo.preco_promocional)">
                {{ formatarPreco(promo.precoOriginal) }}
              </span>
            </div>
          </div>

          <div class="home__promo-media">
            <img
              v-if="imagemDisponivel(promo.produto)"
              :src="imagemProduto(promo.produto)"
              :alt="promo.produto_nome"
              loading="lazy"
              @error="registrarErroImagem(promo.produto?.id)"
            />
            <component v-else :is="iconeParaCategoria(promo.categoriaNome)" :size="48" aria-hidden="true" />
          </div>

          <span v-if="promo.desconto > 0" class="home__promo-discount">-{{ promo.desconto }}%</span>
        </article>
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

    <Transition name="toast">
      <div v-if="toast" class="home__toast" role="status" aria-live="polite">
        <Check :size="18" aria-hidden="true" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  Coffee,
  Cookie,
  Croissant,
  Flame,
  Heart,
  LayoutGrid,
  LoaderCircle,
  Package,
  Plus,
  Search,
  SearchX,
  Sandwich,
  ShoppingBag,
  ShoppingCart,
  Tag,
} from 'lucide-vue-next'

import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue'
import catalogService, {
  promocaoEstaAtiva,
  resolverUrlMidia,
} from '@/services/catalog.service'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'
import { useNotificationsStore } from '@/stores/notifications'

const auth = useAuthStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const notifications = useNotificationsStore()

const busca = ref('')
const categoriaAtiva = ref(null)
const categorias = ref([])
const produtos = ref([])
const promocoes = ref([])
const imagensComErro = ref(new Set())
const avatarComErro = ref(false)

const carregandoProdutos = ref(true)
const carregandoPromos = ref(true)
const erroProdutos = ref(false)
const erroPromos = ref(false)
const modalAberto = ref(false)
const carregandoDetalhe = ref(false)
const produtoDetalhado = ref(null)
const produtoAdicionando = ref(null)
const adicionandoModal = ref(false)
const detalhesCache = new Map()

const promoIndex = ref(0)
const toast = ref('')
let intervaloPromo = null
let timeoutToast = null

const primeiroNome = computed(() => (auth.usuario?.name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno')

const avatarDisponivel = computed(() => Boolean(auth.usuario?.avatar) && !avatarComErro.value)

watch(
  () => auth.usuario?.avatar,
  () => {
    avatarComErro.value = false
  },
)

const saudacao = computed(() => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
})

const iniciais = computed(() => {
  const nome = auth.usuario?.name || ''
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'A'
  )
})

const ICONES_POR_CATEGORIA = {
  salgado: Croissant,
  salgados: Croissant,
  pao: Croissant,
  paes: Croissant,
  doce: Cookie,
  doces: Cookie,
  bebida: Coffee,
  bebidas: Coffee,
  lanche: Sandwich,
  lanches: Sandwich,
  combo: ShoppingBag,
  combos: ShoppingBag,
}

function chaveCategoria(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function iconeParaCategoria(valor) {
  return ICONES_POR_CATEGORIA[chaveCategoria(valor)] || Package
}

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function limitarBadge(valor) {
  const numero = Number(valor || 0)
  return numero > 99 ? '99+' : numero
}

function selecionarCategoria(id) {
  categoriaAtiva.value = id
}

function imagemProduto(produto) {
  return resolverUrlMidia(produto?.imagem)
}

function imagemDisponivel(produto) {
  return Boolean(produto?.imagem && !imagensComErro.value.has(produto?.id))
}

function registrarErroImagem(produtoId) {
  if (!produtoId) return
  imagensComErro.value.add(produtoId)
  imagensComErro.value = new Set(imagensComErro.value)
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

async function obterDetalhes(produto) {
  if (!produto?.id) return null
  if (detalhesCache.has(produto.id)) return detalhesCache.get(produto.id)

  const detalhe = await catalogService.obterProduto(produto.id)
  detalhesCache.set(produto.id, detalhe)
  return detalhe
}

async function abrirProduto(produto) {
  if (!produto?.id) return

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

async function adicionarAoCarrinho(produto) {
  if (!produto?.id || produtoAdicionando.value) return
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

function mostrarToast(mensagem) {
  toast.value = mensagem
  window.clearTimeout(timeoutToast)
  timeoutToast = window.setTimeout(() => {
    toast.value = ''
  }, 2200)
}

const temFiltroAtivo = computed(() => Boolean(categoriaAtiva.value || busca.value.trim()))

const produtosFiltrados = computed(() => {
  let lista = produtos.value

  if (categoriaAtiva.value) {
    lista = lista.filter((produto) => produto.categoria === categoriaAtiva.value)
  }

  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  if (termo) {
    lista = lista.filter((produto) => {
      const texto = `${produto.nome || ''} ${produto.categoria_nome || ''}`.toLocaleLowerCase('pt-BR')
      return texto.includes(termo)
    })
  }

  return lista
})

const destaques = computed(() => {
  const lista = produtosFiltrados.value

  if (temFiltroAtivo.value) {
    return lista.slice(0, 6)
  }

  const marcados = lista.filter((produto) => produto.destaque)
  const restantes = lista.filter((produto) => !produto.destaque)
  return [...marcados, ...restantes].slice(0, 5)
})

const tituloDestaques = computed(() => (temFiltroAtivo.value ? 'Produtos encontrados' : 'Destaques para você'))

const promosAtivas = computed(() => {
  const mapaProdutos = new Map(produtos.value.map((produto) => [produto.id, produto]))

  return promocoes.value
    .filter((promo) => promocaoEstaAtiva(promo))
    .filter((promo) => mapaProdutos.has(promo.produto))
    .map((promo) => {
      const produto = mapaProdutos.get(promo.produto)
      const precoPromocional = Number(promo.preco_promocional || 0)
      const precoOriginal = Number(produto?.preco ?? precoPromocional)
      const desconto = precoOriginal > 0 && precoOriginal > precoPromocional
        ? Math.round(((precoOriginal - precoPromocional) / precoOriginal) * 100)
        : 0

      return {
        ...promo,
        produto,
        precoOriginal,
        desconto,
        categoriaNome: produto?.categoria_nome || '',
      }
    })
})

const promoDestaque = computed(() => promosAtivas.value[promoIndex.value] || promosAtivas.value[0] || null)
const promocoesVisiveis = computed(() => promosAtivas.value.slice(0, 3))

watch(
  () => promosAtivas.value.length,
  (quantidade) => {
    if (!quantidade) {
      promoIndex.value = 0
    } else if (promoIndex.value >= quantidade) {
      promoIndex.value = 0
    }
  },
)

async function carregarCategorias() {
  try {
    categorias.value = await catalogService.listarCategoriasAtivas()
  } catch {
    categorias.value = []
  }
}

async function carregarProdutos() {
  carregandoProdutos.value = true
  erroProdutos.value = false

  try {
    produtos.value = await catalogService.listarProdutosAtivos()
  } catch {
    produtos.value = []
    erroProdutos.value = true
  } finally {
    carregandoProdutos.value = false
  }
}

async function carregarPromocoes() {
  carregandoPromos.value = true
  erroPromos.value = false

  try {
    promocoes.value = await catalogService.listarPromocoes()
  } catch {
    promocoes.value = []
    erroPromos.value = true
  } finally {
    carregandoPromos.value = false
  }
}


function iniciarCarrossel() {
  window.clearInterval(intervaloPromo)
  intervaloPromo = window.setInterval(() => {
    if (promosAtivas.value.length > 1) {
      promoIndex.value = (promoIndex.value + 1) % promosAtivas.value.length
    }
  }, 6500)
}

onMounted(() => {
  favorites.carregar().catch(() => {})
  notifications.carregar({
    force: !notifications.inicializado,
  }).catch(() => {})

  Promise.allSettled([
    carregarCategorias(),
    carregarProdutos(),
    carregarPromocoes(),
  ])
  iniciarCarrossel()
})

onBeforeUnmount(() => {
  window.clearInterval(intervaloPromo)
  window.clearTimeout(timeoutToast)
})
</script>

<style scoped>
.home {
  width: min(100%, 1380px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.home__header {
  display: grid;
  grid-template-columns: minmax(250px, auto) minmax(300px, 1fr) auto;
  align-items: center;
  gap: clamp(16px, 2vw, 28px);
  margin-bottom: 24px;
}

.home__greeting-row {
  min-width: 0;
}

.home__greeting h1 {
  margin: 0;
  font-size: clamp(22px, 1.8vw, 28px);
  line-height: 1.15;
  letter-spacing: -0.035em;
  color: #201a16;
}

.home__greeting p {
  margin: 5px 0 0;
  color: var(--pp-text-dark-soft);
  font-size: 13.5px;
}

.home__mobile-avatar {
  display: none;
}

.home__search {
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: #716a64;
  background: #fff;
  border: 1px solid rgba(36, 17, 8, 0.09);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(38, 26, 18, 0.035);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.home__search:focus-within {
  border-color: rgba(224, 168, 62, 0.7);
  box-shadow: 0 0 0 4px rgba(224, 168, 62, 0.12);
}

.home__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--pp-text-dark);
  font: inherit;
  font-size: 13.5px;
}

.home__search input::placeholder {
  color: #8b8580;
}

.home__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.home__icon-btn,
.home__avatar {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgba(36, 17, 8, 0.08);
  border-radius: 50%;
  background: #fff;
  color: #2d2824;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.home__icon-btn:hover,
.home__avatar:hover {
  transform: translateY(-1px);
  border-color: rgba(224, 168, 62, 0.45);
  box-shadow: 0 7px 18px rgba(38, 26, 18, 0.08);
}

.home__avatar {
  background: #fff5df;
  color: #a76c08;
  font-size: 12px;
  font-weight: 800;
}

.home__avatar img,
.home__mobile-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  object-fit: cover;
}

.home__badge {
  position: absolute;
  top: -4px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 2px solid var(--pp-bg-page);
  border-radius: 99px;
  background: #e7a42d;
  color: #241108;
  font-size: 9px;
  font-weight: 800;
}

.home__categories {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 1px 1px 3px;
  margin-bottom: 22px;
  scrollbar-width: none;
}

.home__categories::-webkit-scrollbar {
  display: none;
}

.home__category {
  min-width: 88px;
  min-height: 42px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid rgba(36, 17, 8, 0.08);
  border-radius: 12px;
  background: #fff;
  color: #544e49;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease, border-color 160ms ease;
}

.home__category svg {
  display: none;
}

.home__category:hover {
  transform: translateY(-1px);
  border-color: rgba(224, 168, 62, 0.35);
}

.home__category.is-active {
  border-color: #2a211b;
  background: #2a211b;
  color: #fff;
}

.home__hero {
  margin-bottom: 30px;
}

.home__hero-card {
  position: relative;
  min-height: 306px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1.25fr);
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 10%, rgba(224, 168, 62, 0.13), transparent 34%),
    linear-gradient(120deg, #241108 0%, #35180b 58%, #1e0d06 100%);
  box-shadow: 0 16px 42px rgba(53, 31, 16, 0.11);
  color: var(--pp-cream);
}

.home__hero-card--institutional {
  grid-template-columns: 1fr 0.55fr;
}

.home__hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(28px, 3vw, 44px);
}

.home__hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-bottom: 14px;
  border: 1px solid rgba(224, 168, 62, 0.16);
  border-radius: 8px;
  background: rgba(224, 168, 62, 0.12);
  color: #f2b43f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.home__hero-content h2 {
  max-width: 470px;
  margin: 0;
  color: #fff8ed;
  font-family: var(--pp-font-display);
  font-size: clamp(30px, 3vw, 43px);
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.home__hero-content p {
  max-width: 430px;
  margin: 10px 0 15px;
  color: #d9cbb8;
  font-size: 15px;
  line-height: 1.55;
}

.home__hero-price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}

.home__hero-price strong {
  color: #f1ad2c;
  font-size: clamp(29px, 3vw, 40px);
  line-height: 1;
}

.home__hero-price-old {
  color: #9b8775;
  font-size: 14px;
  text-decoration: line-through;
}

.home__hero-btn {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 22px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(100deg, #f3af2f, #ffc44d);
  color: #2b1709;
  font: inherit;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(224, 168, 62, 0.16);
  transition: transform 160ms ease, filter 160ms ease;
}

.home__hero-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.home__hero-media {
  position: relative;
  min-width: 0;
  min-height: 306px;
  overflow: hidden;
}

.home__hero-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #30150a 0%, rgba(48, 21, 10, 0.45) 18%, rgba(48, 21, 10, 0.04) 52%);
  pointer-events: none;
}

.home__hero-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.home__hero-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 60% 45%, rgba(224, 168, 62, 0.2), transparent 34%),
    rgba(255, 255, 255, 0.025);
  color: #d99a29;
}

.home__hero-fallback--standalone {
  min-height: 306px;
}

.home__dots {
  min-height: 26px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
}

.home__dots button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 99px;
  background: #dcd6cf;
  cursor: pointer;
  transition: width 180ms ease, background 180ms ease;
}

.home__dots button.is-active {
  width: 22px;
  background: #dfa333;
}

.home__section {
  margin-bottom: 34px;
}

.home__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}

.home__section-head h2 {
  margin: 0;
  color: #221d19;
  font-size: 19px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.home__section-head p {
  margin: 4px 0 0;
  color: #8b847d;
  font-size: 11.5px;
}

.home__section-head > a {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #bd7b0c;
  font-size: 12.5px;
  font-weight: 700;
}

.home__product-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.home__product-card {
  min-width: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid rgba(36, 17, 8, 0.075);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 26px rgba(45, 31, 20, 0.045);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.home__product-card:hover {
  transform: translateY(-3px);
  border-color: rgba(224, 168, 62, 0.26);
  box-shadow: 0 14px 30px rgba(45, 31, 20, 0.09);
}

.home__product-card--skeleton {
  min-height: 250px;
}

.home__product-open {
  width: 100%;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.home__product-image {
  position: relative;
  height: 146px;
  overflow: hidden;
  border-radius: 12px;
  background: #f5f1ec;
}

.home__product-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 240ms ease;
}

.home__product-card:hover .home__product-image img {
  transform: scale(1.025);
}

.home__product-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #d69a2d;
  background:
    radial-gradient(circle at center, rgba(224, 168, 62, 0.12), transparent 45%),
    #f5f1ec;
}

.home__product-promo {
  position: absolute;
  left: 9px;
  bottom: 9px;
  padding: 4px 7px;
  border-radius: 7px;
  background: rgba(45, 24, 11, 0.88);
  color: #ffc14a;
  font-size: 9.5px;
  font-weight: 800;
  backdrop-filter: blur(5px);
}

.home__fav-btn {
  position: absolute;
  top: 17px;
  right: 17px;
  z-index: 3;
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(36, 17, 8, 0.07);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.93);
  color: #6f6964;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(34, 23, 17, 0.06);
}

.home__fav-btn.is-active {
  color: #cf594d;
}

.home__product-body {
  min-height: 58px;
  padding: 11px 2px 4px;
}

.home__product-body h3 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #29241f;
  font-size: 13.5px;
  font-weight: 750;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.home__product-body p {
  margin: 4px 0 0;
  color: #96908a;
  font-size: 11px;
}

.home__product-footer {
  min-height: 42px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 1px;
}

.home__product-prices {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.home__product-prices strong {
  color: #29241f;
  font-size: 14px;
}

.home__product-price-old {
  color: #a29b94;
  font-size: 10.5px;
  text-decoration: line-through;
}

.home__add-btn {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #e0a83e, #f3b839);
  color: #2c1b0e;
  cursor: pointer;
  transition: transform 150ms ease, filter 150ms ease;
}

.home__add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.home__add-btn:disabled {
  opacity: 0.68;
  cursor: wait;
}

.home__add-spinner {
  animation: home-add-spin 700ms linear infinite;
}

@keyframes home-add-spin {
  to { transform: rotate(360deg); }
}

.home__promo-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.home__promo-card {
  min-height: 154px;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 42%;
  align-items: center;
  padding: 20px;
  border: 1px solid rgba(110, 71, 35, 0.11);
  border-radius: 16px;
  background: linear-gradient(130deg, #fff6e9, #f1dfc5);
  box-shadow: 0 9px 24px rgba(66, 42, 24, 0.05);
}

.home__promo-card[role='button'] {
  cursor: pointer;
}

.home__promo-card[role='button']:focus-visible {
  outline: 2.5px solid var(--pp-gold);
  outline-offset: 2px;
}

.home__promo-card:nth-child(2) {
  background: linear-gradient(130deg, #fff9ef, #f7e8cc);
}

.home__promo-card:nth-child(3) {
  background: linear-gradient(130deg, #2c1409, #4a1f0d);
  color: #fff2df;
}

.home__promo-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
}

.home__promo-category {
  display: block;
  margin-bottom: 5px;
  color: #bd5b31;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
}

.home__promo-card:nth-child(3) .home__promo-category {
  color: #f1b23d;
}

.home__promo-copy h3 {
  margin: 0 0 14px;
  color: #33251c;
  font-size: 14px;
  line-height: 1.35;
}

.home__promo-card:nth-child(3) .home__promo-copy h3 {
  color: #fff2df;
}

.home__promo-prices {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home__promo-prices strong {
  color: #2e2118;
  font-size: 18px;
}

.home__promo-card:nth-child(3) .home__promo-prices strong {
  color: #fff4e1;
}

.home__promo-prices span {
  color: #8f8177;
  font-size: 11px;
  text-decoration: line-through;
}

.home__promo-media {
  min-width: 0;
  align-self: stretch;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #c9891c;
}

.home__promo-media img {
  width: 100%;
  height: 100%;
  max-height: 130px;
  display: block;
  object-fit: cover;
  border-radius: 12px;
}

.home__promo-discount {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  padding: 6px 9px;
  border-radius: 9px;
  background: #c84d2c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.home__state {
  min-height: 112px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px dashed rgba(36, 17, 8, 0.15);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.45);
  color: #756e68;
}

.home__state strong {
  display: block;
  color: #403934;
  font-size: 13px;
}

.home__state p {
  margin: 3px 0 0;
  font-size: 12px;
}

.home__state button {
  margin-left: auto;
  padding: 8px 12px;
  border: 1px solid rgba(224, 168, 62, 0.4);
  border-radius: 9px;
  background: #fff8ea;
  color: #8f5d08;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.home__state--compact {
  min-height: 92px;
}

.home__skeleton {
  position: relative;
  overflow: hidden;
  background: #e9e4de;
}

.home__skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: home-shimmer 1.35s infinite;
}

.home__toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #2d1a0e;
  color: #fff2df;
  font-size: 12.5px;
  font-weight: 650;
  box-shadow: 0 12px 35px rgba(27, 15, 8, 0.22);
}

.hero-fade-enter-active,
.hero-fade-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes home-shimmer {
  to { transform: translateX(100%); }
}

@media (max-width: 1220px) {
  .home__header {
    grid-template-columns: minmax(230px, auto) minmax(260px, 1fr) auto;
  }

  .home__hero-card {
    grid-template-columns: minmax(320px, 0.95fr) 1.05fr;
  }

  .home__product-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .home__product-row > :nth-child(5) {
    display: none;
  }
}

@media (max-width: 1024px) {
  .home {
    width: 100%;
  }

  .home__header {
    grid-template-columns: minmax(240px, auto) 1fr;
  }

  .home__actions {
    display: none;
  }
}

@media (max-width: 720px) {
  .home__header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    margin-bottom: 18px;
  }

  .home__greeting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .home__greeting h1 {
    font-size: 21px;
  }

  .home__greeting p {
    max-width: 260px;
    font-size: 11.5px;
    line-height: 1.45;
  }

  .home__mobile-avatar {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #efe5d8;
    color: #9a650d;
    font-size: 12px;
    font-weight: 800;
  }

  .home__search {
    min-height: 45px;
    border-radius: 12px;
  }

  .home__categories {
    gap: 6px;
    margin: 0 -16px 16px;
    padding: 0 16px 5px;
  }

  .home__category {
    min-width: 66px;
    min-height: 55px;
    flex-direction: column;
    gap: 5px;
    padding: 6px 10px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    color: #433d38;
    font-size: 9.5px;
  }

  .home__category svg {
    display: block;
  }

  .home__category:hover {
    transform: none;
  }

  .home__category.is-active {
    border-color: #df9d29;
    background: transparent;
    color: #b8750b;
  }

  .home__hero {
    margin-bottom: 25px;
  }

  .home__hero-card,
  .home__hero-card--institutional {
    min-height: 268px;
    grid-template-columns: 1fr 42%;
    border-radius: 14px;
  }

  .home__hero-content {
    padding: 21px 10px 21px 18px;
  }

  .home__hero-tag {
    margin-bottom: 9px;
    padding: 5px 7px;
    font-size: 8.5px;
  }

  .home__hero-content h2 {
    font-family: var(--pp-font-body);
    font-size: clamp(21px, 7vw, 29px);
    line-height: 1.08;
  }

  .home__hero-content p {
    margin: 7px 0 10px;
    font-size: 10.5px;
    line-height: 1.45;
  }

  .home__hero-price {
    flex-direction: column;
    gap: 2px;
    margin-bottom: 13px;
  }

  .home__hero-price strong {
    font-size: 27px;
  }

  .home__hero-price-old {
    font-size: 10px;
  }

  .home__hero-btn {
    min-height: 38px;
    padding: 0 13px;
    border-radius: 8px;
    font-size: 10.5px;
  }

  .home__hero-media,
  .home__hero-fallback--standalone {
    min-height: 268px;
  }

  .home__hero-media::after {
    background: linear-gradient(90deg, #30150a 0%, rgba(48, 21, 10, 0.4) 20%, transparent 70%);
  }

  .home__section {
    margin-bottom: 28px;
  }

  .home__section-head {
    margin-bottom: 12px;
  }

  .home__section-head h2 {
    font-size: 14px;
  }

  .home__section-head p {
    display: none;
  }

  .home__section-head > a {
    font-size: 10px;
  }

  .home__product-row {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    margin: 0 -16px;
    padding: 0 16px 5px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .home__product-row::-webkit-scrollbar,
  .home__promo-row::-webkit-scrollbar {
    display: none;
  }

  .home__product-row > :nth-child(5) {
    display: flex;
  }

  .home__product-card {
    width: 145px;
    flex: 0 0 145px;
    scroll-snap-align: start;
    padding: 8px;
    border-radius: 13px;
  }

  .home__product-card--skeleton {
    min-height: 220px;
  }

  .home__product-image {
    height: 112px;
    border-radius: 10px;
  }

  .home__fav-btn {
    top: 13px;
    right: 13px;
    width: 27px;
    height: 27px;
  }

  .home__product-body {
    min-height: 54px;
    padding-top: 9px;
  }

  .home__product-body h3 {
    font-size: 11.5px;
  }

  .home__product-body p {
    font-size: 9.5px;
  }

  .home__product-prices strong {
    font-size: 12px;
  }

  .home__add-btn {
    width: 29px;
    height: 29px;
  }

  .home__promo-row {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    margin: 0 -16px;
    padding: 0 16px 5px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }

  .home__promo-card {
    width: 280px;
    min-height: 132px;
    flex: 0 0 280px;
    scroll-snap-align: start;
    padding: 16px;
    border-radius: 14px;
  }

  .home__promo-copy h3 {
    font-size: 12px;
    margin-bottom: 10px;
  }

  .home__promo-prices strong {
    font-size: 15px;
  }

  .home__toast {
    left: 16px;
    right: 16px;
    bottom: 82px;
    justify-content: center;
  }
}

@media (max-width: 420px) {
  .home__hero-card,
  .home__hero-card--institutional {
    min-height: 248px;
    grid-template-columns: 58% 42%;
  }

  .home__hero-media,
  .home__hero-fallback--standalone {
    min-height: 248px;
  }
}
</style>
