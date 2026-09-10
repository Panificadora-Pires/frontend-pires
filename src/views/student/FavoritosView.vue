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
.favorites-page{width:min(100%,1240px);margin:0 auto;color:var(--student-text)}.favorites-page__header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.favorites-page__eyebrow{display:none}.favorites-page__header h1{margin:0;font-size:30px}.favorites-page__header p{margin:6px 0 0;color:var(--student-muted);font-size:13px}.favorites-page__count{min-width:92px;height:50px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--student-border);border-radius:8px;background:#fff;color:#6c6259;font-size:10px}.favorites-page__count span{font-size:15px;font-weight:800;color:var(--student-text)}.favorites-page__search{height:42px;display:flex;align-items:center;gap:8px;margin-bottom:22px;padding:0 12px;border:1px solid var(--student-border);border-radius:8px;background:#fff;color:#867e76}.favorites-page__search input{width:100%;border:0;outline:0;background:transparent;color:var(--student-text);font-size:12px}.favorites-page__search button{border:0;background:transparent;color:#8b837a}.favorites-page__section-head{margin-bottom:12px}.favorites-page__section-head h2{margin:0;font-size:19px}.favorites-page__section-head p{margin:4px 0 0;color:var(--student-muted);font-size:11px}.favorites-page__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.favorites-page__skeleton{min-height:310px;border:1px solid var(--student-border);border-radius:10px;background:#fff}.favorites-page__state{min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;border:1px solid var(--student-border);border-radius:10px;background:#fff}.favorites-page__state-icon{width:50px;height:50px;display:grid;place-items:center;margin-bottom:12px;border-radius:50%;background:#f2eee8;color:#82602c}.favorites-page__state-icon--heart{color:#9e4b46}.favorites-page__state h2{margin:0;font-size:17px}.favorites-page__state p{max-width:520px;margin:6px 0 14px;color:var(--student-muted);font-size:11px}.favorites-page__state a{min-height:36px;display:inline-flex;align-items:center;padding:0 12px;border-radius:7px;background:#2a211b;color:#fff;font-size:10px;font-weight:700}.favorites-page__toast{position:fixed;right:24px;bottom:24px;z-index:90;padding:10px 13px;border:1px solid #cadbcd;border-radius:8px;background:#f4faf5;color:#33583a;font-size:11px;font-weight:600}@media(max-width:1120px){.favorites-page__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.favorites-page__header{align-items:flex-start;flex-direction:column}.favorites-page__header h1{font-size:25px}.favorites-page__count{width:100%;justify-content:flex-start;padding:0 13px}.favorites-page__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.favorites-page__toast{left:13px;right:13px;bottom:78px}}
</style>
