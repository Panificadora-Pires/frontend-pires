<template>
  <div class="favorites-page">
    <header class="favorites-page__header">
      <div>
        <span class="favorites-page__eyebrow">Sua seleção</span>
        <h1>Favoritos</h1>
        <p>Seus produtos preferidos sempre à mão para o próximo intervalo.</p>
      </div>

      <div v-if="favorites.inicializado" class="favorites-page__count">
        <Heart :size="18" fill="currentColor" />
        <span>
          <strong>{{ favorites.total }}</strong>
          {{ favorites.total === 1 ? 'favorito' : 'favoritos' }}
        </span>
      </div>
    </header>

    <label v-if="favorites.total" class="favorites-page__search">
      <Search :size="19" aria-hidden="true" />
      <input
        v-model="busca"
        type="search"
        placeholder="Buscar nos seus favoritos..."
        autocomplete="off"
      />
      <button
        v-if="busca"
        type="button"
        aria-label="Limpar busca"
        @click="busca = ''"
      >
        <X :size="16" />
      </button>
    </label>

    <div
      v-if="favorites.carregando && !favorites.inicializado"
      class="favorites-page__grid"
      aria-label="Carregando favoritos"
    >
      <div
        v-for="index in 5"
        :key="index"
        class="favorites-page__skeleton"
        aria-hidden="true"
      >
        <div />
        <span />
        <span />
      </div>
    </div>

    <section
      v-else-if="favorites.erro && !favorites.inicializado"
      class="favorites-page__state favorites-page__state--error"
      role="alert"
    >
      <span class="favorites-page__state-icon">
        <CircleAlert :size="30" />
      </span>
      <h2>Não conseguimos carregar seus favoritos.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" @click="recarregar">Tentar novamente</button>
    </section>

    <section v-else-if="!favorites.total" class="favorites-page__state">
      <span class="favorites-page__state-icon favorites-page__state-icon--heart">
        <Heart :size="34" />
      </span>
      <h2>Nenhum favorito ainda</h2>
      <p>
        Salve os produtos que você mais gosta para encontrá-los rapidamente
        quando chegar a hora do intervalo.
      </p>
      <RouterLink :to="{ name: 'cardapio' }">
        Explorar cardápio
        <ArrowRight :size="17" />
      </RouterLink>
    </section>

    <section
      v-else-if="!produtosFiltrados.length"
      class="favorites-page__state"
    >
      <span class="favorites-page__state-icon">
        <SearchX :size="30" />
      </span>
      <h2>Nenhum favorito encontrado.</h2>
      <p>Tente buscar por outro nome ou categoria.</p>
      <button type="button" @click="busca = ''">Limpar busca</button>
    </section>

    <section v-else>
      <div class="favorites-page__section-head">
        <div>
          <h2>Produtos salvos</h2>
          <p>
            {{ produtosFiltrados.length }}
            {{ produtosFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados' }}
          </p>
        </div>
      </div>

      <div class="favorites-page__grid">
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

    <Transition name="favorites-toast">
      <div
        v-if="toast"
        class="favorites-page__toast"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 :size="18" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Heart,
  Search,
  SearchX,
  X,
} from 'lucide-vue-next'

import ProductCard from '@/components/catalog/ProductCard.vue'
import ProductDetailsModal from '@/components/catalog/ProductDetailsModal.vue'
import catalogService from '@/services/catalog.service'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'

const cart = useCartStore()
const favorites = useFavoritesStore()

const busca = ref('')
const detalhesCache = new Map()

const modalAberto = ref(false)
const carregandoDetalhe = ref(false)
const produtoDetalhado = ref(null)
const produtoAdicionando = ref(null)
const adicionandoModal = ref(false)
const toast = ref('')
let toastTimer = null

const produtosFiltrados = computed(() => {
  const termo = normalizarTexto(busca.value)
  const lista = [...favorites.produtos]

  if (!termo) return lista

  return lista.filter((produto) => {
    const alvo = normalizarTexto(
      `${produto.nome || ''} ${produto.categoria_nome || ''}`,
    )
    return alvo.includes(termo)
  })
})

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

async function recarregar() {
  try {
    await favorites.carregar({ force: true })
  } catch {
    // A store já mantém a mensagem de erro.
  }
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
  if (detalhesCache.has(produto.id)) {
    return detalhesCache.get(produto.id)
  }

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
  if (!produto?.id || produtoAdicionando.value) return
  produtoAdicionando.value = produto.id

  try {
    const detalhe = await obterDetalhes(produto)
    const estoque = Number(detalhe?.estoque ?? 0)

    if (estoque <= 0) {
      mostrarToast(`${produto.nome} está sem estoque no momento.`)
      return
    }

    const itemAtual = cart.itens.find(
      (item) => item.produto.id === produto.id,
    )

    if ((itemAtual?.quantidade || 0) >= estoque) {
      mostrarToast(
        `Você já adicionou todo o estoque disponível de ${produto.nome}.`,
      )
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
    const itemAtual = cart.itens.find(
      (item) => item.produto.id === produto.id,
    )
    const novaQuantidade =
      (itemAtual?.quantidade || 0) + quantidade

    if (novaQuantidade > estoque) {
      mostrarToast(
        `Há somente ${estoque} ${
          estoque === 1
            ? 'unidade disponível'
            : 'unidades disponíveis'
        }.`,
      )
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
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2400)
}

onMounted(() => {
  favorites.carregar().catch(() => {})
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer)
})
</script>

<style scoped>
.favorites-page {
  width: min(100%, 1320px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.favorites-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.favorites-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7c14;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.favorites-page__header h1 {
  margin: 0;
  color: #241e19;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.favorites-page__header p {
  margin: 8px 0 0;
  color: #746b63;
  font-size: 13px;
}

.favorites-page__count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(184, 117, 24, 0.14);
  border-radius: 15px;
  background: #fff7ec;
  color: #b96d25;
  font-size: 12px;
}

.favorites-page__count span {
  display: flex;
  gap: 4px;
}

.favorites-page__search {
  width: min(100%, 620px);
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  padding: 0 15px;
  border: 1px solid rgba(44, 28, 17, 0.09);
  border-radius: 15px;
  background: #fff;
  color: #8a8077;
  box-shadow: 0 8px 24px rgba(50, 34, 24, 0.035);
}

.favorites-page__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2d2823;
  font: inherit;
  font-size: 13px;
}

.favorites-page__search button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f5f1ed;
  color: #83786e;
  cursor: pointer;
}

.favorites-page__section-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}

.favorites-page__section-head h2 {
  margin: 0;
  font-size: 19px;
}

.favorites-page__section-head p {
  margin: 4px 0 0;
  color: #8a8179;
  font-size: 11px;
}

.favorites-page__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.favorites-page__skeleton {
  min-height: 300px;
  padding: 10px;
  border-radius: 18px;
  background: #fff;
  overflow: hidden;
}

.favorites-page__skeleton div,
.favorites-page__skeleton span {
  display: block;
  border-radius: 12px;
  background: linear-gradient(
    100deg,
    #f0ece8 20%,
    #faf8f6 45%,
    #f0ece8 70%
  );
  background-size: 200% 100%;
  animation: favorites-shimmer 1.4s linear infinite;
}

.favorites-page__skeleton div {
  height: 190px;
}

.favorites-page__skeleton span {
  width: 78%;
  height: 13px;
  margin-top: 14px;
}

.favorites-page__skeleton span:last-child {
  width: 48%;
  margin-top: 8px;
}

.favorites-page__state {
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 42px 20px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.favorites-page__state-icon {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 22px;
  background: #f7f2ec;
  color: #c7902c;
}

.favorites-page__state-icon--heart {
  background: #fff3e8;
  color: #b96d25;
}

.favorites-page__state h2 {
  margin: 0;
  color: #2b251f;
  font-size: 20px;
}

.favorites-page__state p {
  width: min(100%, 430px);
  margin: 8px 0 20px;
  color: #82786f;
  font-size: 13px;
  line-height: 1.55;
}

.favorites-page__state button,
.favorites-page__state a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--pp-gradient-gold);
  color: #2c1a0e;
  font-weight: 750;
  cursor: pointer;
}

.favorites-page__state--error .favorites-page__state-icon {
  background: var(--pp-error-bg);
  color: var(--pp-error);
}

.favorites-page__toast {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 13px 16px;
  border-radius: 13px;
  background: #2d1b10;
  color: #fff5e8;
  box-shadow: 0 16px 36px rgba(28, 16, 9, 0.2);
  font-size: 12px;
  font-weight: 650;
}

.favorites-toast-enter-active,
.favorites-toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.favorites-toast-enter-from,
.favorites-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes favorites-shimmer {
  to { background-position-x: -200%; }
}

@media (max-width: 1180px) {
  .favorites-page__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .favorites-page__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .favorites-page__header {
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .favorites-page__header h1 {
    font-size: 30px;
  }

  .favorites-page__header p {
    max-width: 250px;
    font-size: 11px;
    line-height: 1.45;
  }

  .favorites-page__count {
    min-height: 42px;
    padding-inline: 12px;
  }

  .favorites-page__search {
    min-height: 46px;
    margin-bottom: 20px;
  }

  .favorites-page__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .favorites-page__state {
    min-height: 420px;
    padding-inline: 24px;
  }

  .favorites-page__toast {
    right: 16px;
    bottom: 84px;
  }
}
</style>
