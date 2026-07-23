<template>
  <div class="home">
    <!-- ===== Cabeçalho: saudação + busca + ações ===== -->
    <header class="home__header">
      <div class="home__greeting">
        <h1>Bom dia, {{ primeiroNome }}! 👋</h1>
        <p>Que tal reservar algo delicioso para o intervalo?</p>
      </div>

      <div class="home__search">
        <Search :size="18" />
        <input v-model="busca" type="search" placeholder="Buscar produtos, categorias..." aria-label="Buscar produtos" />
      </div>

      <div class="home__actions">
        <RouterLink :to="{ name: 'notificacoes' }" class="home__icon-btn" aria-label="Notificações">
          <Bell :size="19" />
          <span v-if="notifCount" class="home__badge">{{ notifCount }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'carrinho' }" class="home__icon-btn" aria-label="Carrinho">
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="home__badge">{{ cart.totalItens }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'perfil' }" class="home__avatar" aria-label="Perfil">
          {{ iniciais }}
        </RouterLink>
      </div>
    </header>

    <!-- ===== Categorias ===== -->
    <div class="home__chips">
      <button
        class="home__chip"
        :class="{ 'is-active': categoriaAtiva === null }"
        @click="categoriaAtiva = null"
      >
        Todos
      </button>
      <button
        v-for="categoria in categorias"
        :key="categoria.id"
        class="home__chip"
        :class="{ 'is-active': categoriaAtiva === categoria.id }"
        @click="categoriaAtiva = categoria.id"
      >
        {{ categoria.nome }}
      </button>
    </div>

    <!-- ===== Banner / carrossel de promoção em destaque ===== -->
    <section v-if="promosAtivas.length" class="home__hero">
      <Transition name="hero-fade" mode="out-in">
        <div class="home__hero-card" :key="promoDestaque.id">
          <div class="home__hero-text">
            <span class="home__hero-tag">🔥 Promoção do dia</span>
            <h2>{{ promoDestaque.produto_nome }}</h2>
            <p>Aproveite antes que acabe o estoque!</p>
            <div class="home__hero-price">
              <span class="home__hero-price-old">{{ formatarPreco(promoDestaque.precoOriginal) }}</span>
              {{ formatarPreco(promoDestaque.preco_promocional) }}
            </div>
            <RouterLink :to="{ name: 'cardapio' }" class="home__hero-btn">
              Reservar agora <ChevronRight :size="16" />
            </RouterLink>
          </div>
          <div class="home__hero-image">
            <component :is="iconeParaCategoria(promoDestaque.categoriaNome)" :size="72" />
          </div>
        </div>
      </Transition>

      <div v-if="promosAtivas.length > 1" class="home__dots">
        <span
          v-for="(p, i) in promosAtivas"
          :key="p.id"
          :class="{ 'is-active': i === promoIndex }"
          @click="promoIndex = i"
        />
      </div>
    </section>

    <!-- ===== Destaques ===== -->
    <section class="home__section">
      <div class="home__section-head">
        <h3>Destaques para você</h3>
        <RouterLink :to="{ name: 'cardapio' }">Ver todos <ChevronRight :size="15" /></RouterLink>
      </div>

      <p v-if="carregandoProdutos" class="home__loading">Carregando cardápio...</p>
      <p v-else-if="!destaques.length" class="home__empty">Nenhum destaque no momento.</p>

      <div v-else class="home__product-row">
        <article v-for="produto in destaques" :key="produto.id" class="home__product-card">
          <button
            class="home__fav-btn"
            :class="{ 'is-active': favoritos.has(produto.id) }"
            :aria-label="favoritos.has(produto.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
            @click="alternarFavorito(produto.id)"
          >
            <Heart :size="16" :fill="favoritos.has(produto.id) ? 'currentColor' : 'none'" />
          </button>

          <div class="home__product-image">
            <img v-if="produto.imagem" :src="produto.imagem" :alt="produto.nome" />
            <component :is="iconeParaCategoria(produto.categoria_nome)" v-else :size="34" />
          </div>

          <h4>{{ produto.nome }}</h4>
          <p>{{ produto.categoria_nome }}</p>

          <div class="home__product-footer">
            <span class="home__product-price">{{ formatarPreco(produto.preco_atual) }}</span>
            <button class="home__add-btn" aria-label="Adicionar ao carrinho" @click="cart.adicionar(produto)">
              <Plus :size="16" />
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- ===== Promoções especiais ===== -->
    <section class="home__section">
      <div class="home__section-head">
        <h3>Promoções especiais</h3>
        <RouterLink :to="{ name: 'promocoes' }">Ver todas <ChevronRight :size="15" /></RouterLink>
      </div>

      <p v-if="carregandoPromos" class="home__loading">Carregando promoções...</p>
      <p v-else-if="!promosAtivas.length" class="home__empty">Nenhuma promoção ativa no momento.</p>

      <div v-else class="home__promo-row">
        <article v-for="promo in promosAtivas" :key="promo.id" class="home__promo-card">
          <span class="home__promo-discount">-{{ promo.desconto }}%</span>
          <div class="home__promo-image">
            <component :is="iconeParaCategoria(promo.categoriaNome)" :size="34" />
          </div>
          <div class="home__promo-info">
            <strong>{{ promo.produto_nome }}</strong>
            <div class="home__promo-price">
              <span class="home__promo-price-old">{{ formatarPreco(promo.precoOriginal) }}</span>
              {{ formatarPreco(promo.preco_promocional) }}
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Bell, ShoppingCart, Heart, Plus, ChevronRight, Croissant, Cookie, Coffee, Sandwich, Package } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import api from '@/services/api'

const auth = useAuthStore()
const cart = useCartStore()

const busca = ref('')
const categoriaAtiva = ref(null)
const categorias = ref([])
const produtos = ref([])
const promocoes = ref([])
const notifCount = ref(0)
const favoritos = ref(new Set())

const carregandoProdutos = ref(true)
const carregandoPromos = ref(true)

const promoIndex = ref(0)
let intervaloPromo = null

const primeiroNome = computed(() => (auth.usuario?.name || 'Aluno').split(' ')[0])

const iniciais = computed(() => {
  const nome = auth.usuario?.name || ''
  return (
    nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'A'
  )
})

const ICONES_POR_CATEGORIA = {
  salgados: Croissant,
  doces: Cookie,
  bebidas: Coffee,
  combos: Sandwich,
}

function iconeParaCategoria(nomeCategoria) {
  const chave = (nomeCategoria || '').toLowerCase()
  return ICONES_POR_CATEGORIA[chave] || Package
}

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function alternarFavorito(produtoId) {
  if (favoritos.value.has(produtoId)) {
    favoritos.value.delete(produtoId)
  } else {
    favoritos.value.add(produtoId)
  }
  // Nota: ainda não existe endpoint de favoritos no backend — fica só local por enquanto.
  favoritos.value = new Set(favoritos.value)
}

const produtosFiltrados = computed(() => {
  let lista = produtos.value
  if (categoriaAtiva.value) {
    lista = lista.filter((p) => p.categoria === categoriaAtiva.value)
  }
  if (busca.value.trim()) {
    const termo = busca.value.trim().toLowerCase()
    lista = lista.filter((p) => p.nome.toLowerCase().includes(termo))
  }
  return lista
})

const destaques = computed(() => produtosFiltrados.value.filter((p) => p.destaque).slice(0, 6))

// junta a promoção com os dados do produto (preço original, categoria) pra exibir desconto
const promosAtivas = computed(() => {
  const mapaProdutos = new Map(produtos.value.map((p) => [p.id, p]))
  const hoje = new Date().toISOString().slice(0, 10)

  return promocoes.value
    .filter((promo) => promo.data_inicio <= hoje && promo.data_fim >= hoje)
    .map((promo) => {
      const produto = mapaProdutos.get(promo.produto)
      const precoOriginal = Number(produto?.preco ?? promo.preco_promocional)
      const desconto = precoOriginal
        ? Math.round(((precoOriginal - Number(promo.preco_promocional)) / precoOriginal) * 100)
        : 0

      return {
        ...promo,
        precoOriginal,
        desconto,
        categoriaNome: produto?.categoria_nome,
      }
    })
})

const promoDestaque = computed(() => promosAtivas.value[promoIndex.value] || promosAtivas.value[0])

async function carregarCategorias() {
  try {
    const { data } = await api.get('/categorias/', { params: { ativa: true } })
    categorias.value = data.results ?? data
  } catch {
    categorias.value = []
  }
}

async function carregarProdutos() {
  carregandoProdutos.value = true
  try {
    const { data } = await api.get('/produtos/', { params: { ativo: true } })
    produtos.value = data.results ?? data
  } catch {
    produtos.value = []
  } finally {
    carregandoProdutos.value = false
  }
}

async function carregarPromocoes() {
  carregandoPromos.value = true
  try {
    const { data } = await api.get('/promocoes/')
    promocoes.value = data.results ?? data
  } catch {
    promocoes.value = []
  } finally {
    carregandoPromos.value = false
  }
}

async function carregarNotificacoes() {
  try {
    const { data } = await api.get('/notificacoes/', { params: { lida: false } })
    notifCount.value = data.count ?? data.results?.length ?? 0
  } catch {
    notifCount.value = 0
  }
}

onMounted(async () => {
  await Promise.all([carregarCategorias(), carregarProdutos(), carregarPromocoes(), carregarNotificacoes()])

  intervaloPromo = setInterval(() => {
    if (promosAtivas.value.length > 1) {
      promoIndex.value = (promoIndex.value + 1) % promosAtivas.value.length
    }
  }, 5000)
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Cabeçalho ===== */
.home__header {
  display: flex;
  align-items: center;
  gap: var(--pp-space-4);
  margin-bottom: var(--pp-space-4);
  flex-wrap: wrap;
}

.home__greeting {
  flex: 0 0 auto;
}

.home__greeting h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: var(--pp-text-dark);
}

.home__greeting p {
  font-size: 13.5px;
  color: var(--pp-text-dark-soft);
  margin: 2px 0 0;
}

.home__search {
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: var(--pp-space-1);
  background: var(--pp-surface-card);
  border: 1.5px solid var(--pp-surface-border);
  border-radius: var(--pp-radius-full);
  padding: 11px var(--pp-space-3);
  color: var(--pp-text-dark-soft);
}

.home__search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  font-family: var(--pp-font-body);
  color: var(--pp-text-dark);
}

.home__actions {
  display: flex;
  align-items: center;
  gap: var(--pp-space-1);
  flex: 0 0 auto;
}

.home__icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-surface-card);
  border: 1.5px solid var(--pp-surface-border);
  color: var(--pp-text-dark);
  display: flex;
  align-items: center;
  justify-content: center;
}

.home__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--pp-gold);
  color: var(--pp-bg-dark);
  font-size: 10px;
  font-weight: 700;
  min-width: 17px;
  height: 17px;
  border-radius: var(--pp-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--pp-bg-page);
}

.home__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-gold-soft);
  color: var(--pp-gold-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}

/* ===== Chips de categoria ===== */
.home__chips {
  display: flex;
  gap: var(--pp-space-1);
  overflow-x: auto;
  margin-bottom: var(--pp-space-4);
  padding-bottom: 2px;
}

.home__chip {
  flex: 0 0 auto;
  background: var(--pp-surface-card);
  border: 1.5px solid var(--pp-surface-border);
  color: var(--pp-text-dark-soft);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: var(--pp-radius-full);
  transition: background 180ms ease, color 180ms ease;
}

.home__chip.is-active {
  background: var(--pp-text-dark);
  border-color: var(--pp-text-dark);
  color: #fff;
}

/* ===== Hero / carrossel ===== */
.home__hero {
  margin-bottom: var(--pp-space-5);
}

.home__hero-card {
  background: var(--pp-gradient-left, var(--pp-bg-dark));
  border-radius: var(--pp-radius-card);
  padding: var(--pp-space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pp-space-4);
  min-height: 200px;
  color: var(--pp-cream);
}

.home__hero-tag {
  display: inline-block;
  background: var(--pp-gold-soft);
  color: var(--pp-gold);
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--pp-radius-full);
  margin-bottom: var(--pp-space-2);
}

.home__hero-text h2 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
}

.home__hero-text p {
  font-size: 13.5px;
  color: var(--pp-cream-dim);
  margin: 0 0 var(--pp-space-2);
}

.home__hero-price {
  font-size: 26px;
  font-weight: 700;
  color: var(--pp-gold);
  margin-bottom: var(--pp-space-3);
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.home__hero-price-old {
  font-size: 15px;
  font-weight: 500;
  color: var(--pp-cream-faint);
  text-decoration: line-through;
}

.home__hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--pp-gradient-gold, var(--pp-gold));
  color: var(--pp-bg-dark);
  font-weight: 700;
  font-size: 13.5px;
  padding: 12px 20px;
  border-radius: var(--pp-radius-btn);
}

.home__hero-image {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: var(--pp-radius-card);
  background: rgba(255, 255, 255, 0.06);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.home__dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: var(--pp-space-2);
}

.home__dots span {
  width: 7px;
  height: 7px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-surface-border);
  cursor: pointer;
  transition: all 200ms ease;
}

.home__dots span.is-active {
  background: var(--pp-gold);
  width: 20px;
}

.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 300ms ease;
}
.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

/* ===== Seções (destaques / promoções) ===== */
.home__section {
  margin-bottom: var(--pp-space-5);
}

.home__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--pp-space-3);
}

.home__section-head h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--pp-text-dark);
  margin: 0;
}

.home__section-head a {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pp-gold-hover);
}

.home__loading,
.home__empty {
  color: var(--pp-text-dark-soft);
  font-size: 13.5px;
}

/* ===== Cards de produto ===== */
.home__product-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--pp-space-3);
}

.home__product-card {
  position: relative;
  background: var(--pp-surface-card);
  border: 1px solid var(--pp-surface-border);
  border-radius: var(--pp-radius-card);
  padding: var(--pp-space-2);
}

.home__fav-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: var(--pp-radius-full);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--pp-text-dark-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.home__fav-btn.is-active {
  color: var(--pp-error);
}

.home__product-image {
  height: 100px;
  border-radius: var(--pp-radius-btn);
  background: var(--pp-bg-page);
  color: var(--pp-gold-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: var(--pp-space-2);
}

.home__product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home__product-card h4 {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--pp-text-dark);
  margin: 0 0 2px;
}

.home__product-card p {
  font-size: 11.5px;
  color: var(--pp-text-secondary);
  margin: 0 0 var(--pp-space-2);
}

.home__product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home__product-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--pp-text-dark);
}

.home__add-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-gradient-gold, var(--pp-gold));
  color: var(--pp-bg-dark);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Cards de promoção ===== */
.home__promo-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--pp-space-3);
}

.home__promo-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--pp-space-2);
  background: var(--pp-gradient-left, var(--pp-bg-dark));
  color: var(--pp-cream);
  border-radius: var(--pp-radius-card);
  padding: var(--pp-space-3);
}

.home__promo-discount {
  position: absolute;
  top: var(--pp-space-2);
  right: var(--pp-space-2);
  background: var(--pp-error);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--pp-radius-full);
}

.home__promo-image {
  width: 56px;
  height: 56px;
  border-radius: var(--pp-radius-btn);
  background: rgba(255, 255, 255, 0.08);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.home__promo-info strong {
  display: block;
  font-size: 13.5px;
  margin-bottom: 4px;
}

.home__promo-price {
  color: var(--pp-gold);
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.home__promo-price-old {
  color: var(--pp-cream-faint);
  font-size: 12px;
  font-weight: 500;
  text-decoration: line-through;
}

/* ===== Responsivo ===== */
@media (max-width: 640px) {
  .home__header {
    flex-direction: column;
    align-items: stretch;
  }

  .home__actions {
    display: none; /* já existe no header mobile do StudentLayout */
  }

  .home__hero-card {
    flex-direction: column;
    text-align: center;
  }

  .home__hero-price {
    justify-content: center;
  }
}
</style>
