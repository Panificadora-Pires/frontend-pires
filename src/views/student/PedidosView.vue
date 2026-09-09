<template>
  <div class="orders-page">
    <header class="orders-page__header">
      <div>
        <span class="orders-page__eyebrow">Acompanhamento</span>
        <h1>Meus pedidos</h1>
        <p>Acompanhe o preparo, a retirada e o histórico dos seus pedidos.</p>
      </div>

      <div v-if="orders.inicializado" class="orders-page__summary" aria-label="Resumo dos pedidos">
        <div>
          <span>Em andamento</span>
          <strong>{{ orders.emAndamento.length }}</strong>
        </div>
        <div class="is-ready">
          <span>Prontos</span>
          <strong>{{ orders.prontos.length }}</strong>
        </div>
        <div>
          <span>Finalizados</span>
          <strong>{{ orders.finalizados.length }}</strong>
        </div>
      </div>
    </header>

    <div class="orders-page__toolbar">
      <div class="orders-page__tabs" role="tablist" aria-label="Filtrar pedidos">
        <button
          v-for="item in filtros"
          :key="item.valor"
          type="button"
          role="tab"
          :aria-selected="filtro === item.valor"
          :class="{ 'is-active': filtro === item.valor }"
          @click="filtro = item.valor"
        >
          {{ item.label }}
          <span v-if="quantidadeFiltro(item.valor)">
            {{ quantidadeFiltro(item.valor) }}
          </span>
        </button>
      </div>

      <div class="orders-page__tools">
        <label class="orders-page__search">
          <Search :size="16" aria-hidden="true" />
          <input
            v-model.trim="busca"
            type="search"
            placeholder="Buscar pedido ou produto"
            aria-label="Buscar pedido ou produto"
          />
          <button
            v-if="busca"
            type="button"
            aria-label="Limpar busca"
            @click="busca = ''"
          >
            <X :size="14" />
          </button>
        </label>

        <button
          type="button"
          class="orders-page__refresh"
          :disabled="orders.carregando"
          aria-label="Atualizar pedidos"
          title="Atualizar"
          @click="atualizar"
        >
          <RefreshCw
            :size="17"
            :class="{ 'is-spinning': orders.carregando }"
          />
        </button>
      </div>
    </div>

    <div
      v-if="orders.carregando && !orders.inicializado"
      class="orders-page__list"
      aria-label="Carregando pedidos"
    >
      <div v-for="index in 4" :key="index" class="orders-page__skeleton" aria-hidden="true">
        <div class="orders-page__skeleton-head">
          <span />
          <div>
            <strong />
            <small />
          </div>
          <em />
        </div>
        <div class="orders-page__skeleton-lines">
          <i />
          <i />
          <i />
        </div>
        <div class="orders-page__skeleton-foot">
          <i />
          <strong />
        </div>
      </div>
    </div>

    <section
      v-else-if="orders.erro && !orders.inicializado"
      class="orders-page__state orders-page__state--error"
      role="alert"
    >
      <span class="orders-page__state-icon">
        <CircleAlert :size="30" />
      </span>
      <h2>Não conseguimos carregar seus pedidos.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" @click="atualizar">Tentar novamente</button>
    </section>

    <section
      v-else-if="!orders.itens.length"
      class="orders-page__state"
    >
      <span class="orders-page__state-icon">
        <ShoppingBag :size="30" />
      </span>
      <h2>Você ainda não fez nenhum pedido</h2>
      <p>Escolha seus produtos favoritos no cardápio e seu próximo pedido aparecerá aqui.</p>
      <RouterLink :to="{ name: 'cardapio' }">Ver cardápio</RouterLink>
    </section>

    <section
      v-else-if="!pedidosFiltrados.length"
      class="orders-page__state orders-page__state--compact"
    >
      <span class="orders-page__state-icon">
        <SearchX :size="30" />
      </span>
      <h2>Nenhum pedido encontrado</h2>
      <p>Não encontramos pedidos com os filtros ou a busca informados.</p>
      <button type="button" @click="limparFiltros">Limpar filtros</button>
    </section>

    <div v-else class="orders-page__content">
      <div class="orders-page__result-info">
        <span>
          {{ pedidosFiltrados.length }}
          {{ pedidosFiltrados.length === 1 ? 'pedido encontrado' : 'pedidos encontrados' }}
        </span>
        <span v-if="orders.atualizandoSilenciosamente" class="orders-page__sync">
          <RefreshCw :size="12" class="is-spinning" />
          Atualizando
        </span>
      </div>

      <div class="orders-page__list">
        <OrderCard
          v-for="pedido in pedidosFiltrados"
          :key="pedido.id"
          :pedido="pedido"
          @ver-qrcode="abrirQRCode"
        />
      </div>
    </div>

    <OrderQRCodeModal
      v-if="pedidoQRCode"
      :pedido="pedidoQRCode"
      @close="fecharQRCode"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CircleAlert,
  RefreshCw,
  Search,
  SearchX,
  ShoppingBag,
  X,
} from 'lucide-vue-next'

import OrderCard from '@/components/orders/OrderCard.vue'
import OrderQRCodeModal from '@/components/orders/OrderQRCodeModal.vue'
import { useOrdersStore } from '@/stores/orders'

const orders = useOrdersStore()

const filtro = ref('todos')
const busca = ref('')
const pedidoQRCode = ref(null)
let refreshTimer = null

const filtros = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'andamento', label: 'Em andamento' },
  { valor: 'finalizados', label: 'Finalizados' },
]

const pedidosFiltrados = computed(() => {
  let lista = orders.itens

  if (filtro.value === 'andamento') {
    lista = lista.filter((pedido) =>
      ['pendente', 'confirmado', 'pronto'].includes(pedido.status),
    )
  } else if (filtro.value === 'finalizados') {
    lista = lista.filter((pedido) =>
      ['retirado', 'cancelado'].includes(pedido.status),
    )
  }

  const termo = busca.value.toLocaleLowerCase('pt-BR')
  if (!termo) return lista

  return lista.filter((pedido) => {
    const id = String(pedido.id || '')
    const status = String(pedido.status_display || pedido.status || '')
      .toLocaleLowerCase('pt-BR')
    const produtos = (pedido.itens || [])
      .map((item) => item.produto_nome || '')
      .join(' ')
      .toLocaleLowerCase('pt-BR')

    return id.includes(termo) || status.includes(termo) || produtos.includes(termo)
  })
})

function quantidadeFiltro(valor) {
  if (valor === 'todos') return orders.itens.length
  if (valor === 'andamento') return orders.emAndamento.length
  return orders.finalizados.length
}

async function atualizar() {
  try {
    await orders.carregar({ force: true })
  } catch {
    // A store já mantém a mensagem de erro.
  }
}

function limparFiltros() {
  filtro.value = 'todos'
  busca.value = ''
}

function abrirQRCode(pedido) {
  if (!pedido || pedido.status !== 'pronto') return
  pedidoQRCode.value = pedido
}

function fecharQRCode() {
  pedidoQRCode.value = null
}

onMounted(() => {
  orders.carregar({ force: !orders.inicializado }).catch(() => {})

  refreshTimer = window.setInterval(() => {
    orders.carregar({
      force: true,
      silencioso: true,
    }).catch(() => {})
  }, 30_000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.orders-page {
  width: min(100%, 1080px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.orders-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 23px;
}

.orders-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7c14;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.orders-page__header h1 {
  margin: 0;
  color: #241e19;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.orders-page__header p {
  margin: 8px 0 0;
  color: #746b63;
  font-size: 13px;
}

.orders-page__summary {
  flex: 0 0 auto;
  display: flex;
  gap: 6px;
  padding: 5px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 15px;
  background: #fff;
}

.orders-page__summary div {
  min-width: 92px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
}

.orders-page__summary span {
  color: #8d8379;
  font-size: 9px;
  font-weight: 650;
}

.orders-page__summary strong {
  color: #3a3129;
  font-size: 16px;
}

.orders-page__summary .is-ready {
  background: #f1f7ef;
}

.orders-page__summary .is-ready span,
.orders-page__summary .is-ready strong {
  color: #5f815d;
}

.orders-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 17px;
}

.orders-page__tabs {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 4px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 14px;
  background: #fff;
}

.orders-page__tabs button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #7f756c;
  font-weight: 700;
  cursor: pointer;
}

.orders-page__tabs button.is-active {
  background: #2d2018;
  color: #fff9f1;
}

.orders-page__tabs span {
  min-width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  padding-inline: 5px;
  border-radius: 999px;
  background: rgba(224, 168, 62, 0.16);
  color: #c18825;
  font-size: 10px;
}

.orders-page__tabs button.is-active span {
  background: rgba(255, 255, 255, 0.14);
  color: #fff1d4;
}

.orders-page__tools {
  min-width: 0;
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.orders-page__search {
  width: min(100%, 300px);
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid rgba(44, 28, 17, 0.08);
  border-radius: 13px;
  background: #fff;
  color: #978d84;
}

.orders-page__search:focus-within {
  border-color: rgba(224, 168, 62, 0.42);
  box-shadow: 0 0 0 3px rgba(224, 168, 62, 0.08);
}

.orders-page__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3a332c;
  font: inherit;
  font-size: 11px;
}

.orders-page__search input::placeholder {
  color: #aaa19a;
}

.orders-page__search button {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f3efeb;
  color: #8d837a;
  cursor: pointer;
}

.orders-page__refresh {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(44, 28, 17, 0.08);
  border-radius: 13px;
  background: #fff;
  color: #766c63;
  cursor: pointer;
}

.orders-page__refresh:disabled {
  opacity: 0.65;
  cursor: wait;
}

.orders-page__content {
  display: grid;
  gap: 8px;
}

.orders-page__result-info {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 3px;
  color: #928981;
  font-size: 9.5px;
  font-weight: 650;
}

.orders-page__sync {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #ae7b2a;
}

.orders-page__list {
  display: grid;
  gap: 11px;
}

.orders-page__state {
  min-height: 390px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 42px 20px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.orders-page__state--compact {
  min-height: 320px;
}

.orders-page__state-icon {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 22px;
  background: #f7f2ec;
  color: #c7902c;
}

.orders-page__state h2 {
  margin: 0;
  color: #2b251f;
  font-size: 20px;
}

.orders-page__state p {
  width: min(100%, 440px);
  margin: 8px 0 20px;
  color: #82786f;
  font-size: 13px;
  line-height: 1.55;
}

.orders-page__state button,
.orders-page__state a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--pp-gradient-gold);
  color: #2c1a0e;
  font-weight: 750;
  cursor: pointer;
}

.orders-page__state--error .orders-page__state-icon {
  background: var(--pp-error-bg);
  color: var(--pp-error);
}

.orders-page__skeleton {
  overflow: hidden;
  border-radius: 19px;
  background: #fff;
}

.orders-page__skeleton-head {
  display: grid;
  grid-template-columns: 42px 1fr 82px;
  align-items: center;
  gap: 11px;
  padding: 17px 18px 15px;
  border-bottom: 1px solid rgba(44, 28, 17, 0.05);
}

.orders-page__skeleton-head > span,
.orders-page__skeleton-head strong,
.orders-page__skeleton-head small,
.orders-page__skeleton-head em,
.orders-page__skeleton-lines i,
.orders-page__skeleton-foot i,
.orders-page__skeleton-foot strong {
  display: block;
  border-radius: 9px;
  background: linear-gradient(100deg, #f0ece8 20%, #faf8f6 45%, #f0ece8 70%);
  background-size: 200% 100%;
  animation: orders-shimmer 1.4s linear infinite;
}

.orders-page__skeleton-head > span {
  width: 42px;
  height: 42px;
  border-radius: 13px;
}

.orders-page__skeleton-head div {
  display: grid;
  gap: 7px;
}

.orders-page__skeleton-head strong {
  width: 110px;
  height: 11px;
}

.orders-page__skeleton-head small {
  width: 150px;
  height: 8px;
}

.orders-page__skeleton-head em {
  width: 82px;
  height: 28px;
  justify-self: end;
  border-radius: 999px;
}

.orders-page__skeleton-lines {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
}

.orders-page__skeleton-lines i {
  width: 62%;
  height: 10px;
}

.orders-page__skeleton-lines i:nth-child(2) {
  width: 48%;
}

.orders-page__skeleton-lines i:nth-child(3) {
  width: 35%;
}

.orders-page__skeleton-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
  background: #fcfaf8;
}

.orders-page__skeleton-foot i {
  width: 38%;
  height: 9px;
}

.orders-page__skeleton-foot strong {
  width: 85px;
  height: 13px;
}

.is-spinning {
  animation: orders-spin 800ms linear infinite;
}

@keyframes orders-spin {
  to { transform: rotate(360deg); }
}

@keyframes orders-shimmer {
  to { background-position-x: -200%; }
}

@media (max-width: 820px) {
  .orders-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 17px;
  }

  .orders-page__summary {
    width: 100%;
  }

  .orders-page__summary div {
    min-width: 0;
    flex: 1;
  }

  .orders-page__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .orders-page__tabs {
    width: 100%;
    overflow-x: auto;
  }

  .orders-page__tabs button {
    flex: 1;
    justify-content: center;
    white-space: nowrap;
  }

  .orders-page__tools {
    width: 100%;
  }

  .orders-page__search {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 560px) {
  .orders-page__header {
    margin-bottom: 18px;
  }

  .orders-page__header h1 {
    font-size: 30px;
  }

  .orders-page__header p {
    max-width: 300px;
    font-size: 11px;
    line-height: 1.45;
  }

  .orders-page__summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .orders-page__summary div {
    display: block;
    padding: 8px 7px;
    text-align: center;
  }

  .orders-page__summary span,
  .orders-page__summary strong {
    display: block;
  }

  .orders-page__summary strong {
    margin-top: 4px;
  }

  .orders-page__tabs {
    scrollbar-width: none;
  }

  .orders-page__tabs::-webkit-scrollbar {
    display: none;
  }

  .orders-page__tabs button {
    padding-inline: 10px;
    font-size: 11px;
  }

  .orders-page__state {
    min-height: 420px;
  }

  .orders-page__skeleton-head {
    grid-template-columns: 38px 1fr;
    padding: 15px;
  }

  .orders-page__skeleton-head > span {
    width: 38px;
    height: 38px;
  }

  .orders-page__skeleton-head em {
    display: none;
  }

  .orders-page__skeleton-lines,
  .orders-page__skeleton-foot {
    padding-inline: 15px;
  }
}
</style>
