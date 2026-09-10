<template>
  <div class="orders-page">
    <header class="orders-page__header">
      <div>
        <span class="orders-page__eyebrow">Acompanhamento</span>
        <h1>Meus pedidos</h1>
        <p>Consulte pedidos em andamento e seu histórico.</p>
      </div>

      <div
        v-if="orders.inicializado"
        class="orders-page__summary"
        aria-label="Resumo dos pedidos"
      >
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
      <div
        class="orders-page__tabs"
        role="tablist"
        aria-label="Filtrar pedidos"
      >
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
          <RefreshCw :size="17" :class="{ 'is-spinning': orders.carregando }" />
        </button>
      </div>
    </div>

    <div
      v-if="orders.carregando && !orders.inicializado"
      class="orders-page__list"
      aria-label="Carregando pedidos"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="orders-page__skeleton"
        aria-hidden="true"
      >
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

    <section v-else-if="!orders.itens.length" class="orders-page__state">
      <span class="orders-page__state-icon">
        <ShoppingBag :size="30" />
      </span>
      <h2>Você ainda não fez nenhum pedido</h2>
      <p>
        Escolha seus produtos favoritos no cardápio e seu próximo pedido
        aparecerá aqui.
      </p>
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
          {{
            pedidosFiltrados.length === 1
              ? "pedido encontrado"
              : "pedidos encontrados"
          }}
        </span>
        <span
          v-if="orders.atualizandoSilenciosamente"
          class="orders-page__sync"
        >
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  CircleAlert,
  RefreshCw,
  Search,
  SearchX,
  ShoppingBag,
  X,
} from "lucide-vue-next";

import OrderCard from "@/components/orders/OrderCard.vue";
import OrderQRCodeModal from "@/components/orders/OrderQRCodeModal.vue";
import { useOrdersStore } from "@/stores/orders";

const orders = useOrdersStore();

const filtro = ref("todos");
const busca = ref("");
const pedidoQRCode = ref(null);
let refreshTimer = null;

const filtros = [
  { valor: "todos", label: "Todos" },
  { valor: "andamento", label: "Em andamento" },
  { valor: "finalizados", label: "Finalizados" },
];

const pedidosFiltrados = computed(() => {
  let lista = orders.itens;

  if (filtro.value === "andamento") {
    lista = lista.filter((pedido) =>
      ["pendente", "confirmado", "pronto"].includes(pedido.status),
    );
  } else if (filtro.value === "finalizados") {
    lista = lista.filter((pedido) =>
      ["retirado", "cancelado"].includes(pedido.status),
    );
  }

  const termo = busca.value.toLocaleLowerCase("pt-BR");
  if (!termo) return lista;

  return lista.filter((pedido) => {
    const id = String(pedido.id || "");
    const status = String(
      pedido.status_display || pedido.status || "",
    ).toLocaleLowerCase("pt-BR");
    const produtos = (pedido.itens || [])
      .map((item) => item.produto_nome || "")
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return (
      id.includes(termo) || status.includes(termo) || produtos.includes(termo)
    );
  });
});

function quantidadeFiltro(valor) {
  if (valor === "todos") return orders.itens.length;
  if (valor === "andamento") return orders.emAndamento.length;
  return orders.finalizados.length;
}

async function atualizar() {
  try {
    await orders.carregar({ force: true });
  } catch {
    // A store já mantém a mensagem de erro.
  }
}

function limparFiltros() {
  filtro.value = "todos";
  busca.value = "";
}

function abrirQRCode(pedido) {
  if (!pedido || pedido.status !== "pronto") return;
  pedidoQRCode.value = pedido;
}

function fecharQRCode() {
  pedidoQRCode.value = null;
}

onMounted(() => {
  orders.carregar({ force: !orders.inicializado }).catch(() => {});

  refreshTimer = window.setInterval(() => {
    orders
      .carregar({
        force: true,
        silencioso: true,
      })
      .catch(() => {});
  }, 30_000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
});
</script>

<style scoped>
.orders-page {
  width: min(100%, 1080px);
  margin: 0 auto;
  color: var(--student-text);
}
.orders-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 18px;
}
.orders-page__eyebrow {
  display: none;
}
.orders-page__header h1 {
  margin: 0;
  font-size: 30px;
}
.orders-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.orders-page__summary {
  display: grid;
  grid-template-columns: repeat(3, 92px);
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
}
.orders-page__summary div {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 11px;
  border-right: 1px solid var(--student-border);
}
.orders-page__summary div:last-child {
  border-right: 0;
}
.orders-page__summary span {
  color: var(--student-muted);
  font-size: 8px;
}
.orders-page__summary strong {
  margin-top: 2px;
  font-size: 15px;
}
.orders-page__summary .is-ready strong {
  color: #6c8a50;
}
.orders-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.orders-page__tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
}
.orders-page__tabs button {
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #766e66;
  font-size: 10px;
  font-weight: 700;
}
.orders-page__tabs button.is-active {
  background: #2a211b;
  color: #fff;
}
.orders-page__tabs span {
  margin-left: 4px;
  opacity: 0.7;
}
.orders-page__tools {
  display: flex;
  gap: 7px;
}
.orders-page__search {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #8c847c;
}
.orders-page__search:focus-within {
  border-color: #c9a466;
}
.orders-page__search input {
  width: 210px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 10px;
}
.orders-page__search button {
  border: 0;
  background: transparent;
  color: #8c847c;
}
.orders-page__refresh {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--student-border);
  border-radius: 8px;
  background: #fff;
  color: #716960;
}
.orders-page__refresh:disabled {
  opacity: 0.5;
}
.orders-page__content {
  display: grid;
  gap: 8px;
}
.orders-page__result-info {
  display: flex;
  justify-content: space-between;
  color: var(--student-muted);
  font-size: 9px;
}
.orders-page__sync {
  display: flex;
  align-items: center;
  gap: 4px;
}
.orders-page__list {
  display: grid;
  gap: 9px;
}
.orders-page__state {
  min-height: 290px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.orders-page__state--compact {
  min-height: 220px;
}
.orders-page__state-icon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 50%;
  background: #f2eee8;
  color: #82602c;
}
.orders-page__state h2 {
  margin: 0;
  font-size: 17px;
}
.orders-page__state p {
  margin: 6px 0 14px;
  color: var(--student-muted);
  font-size: 11px;
}
.orders-page__state a,
.orders-page__state button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  background: #fff;
  color: var(--student-text);
  font-size: 10px;
  font-weight: 700;
}
.orders-page__skeleton {
  min-height: 170px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  padding: 16px;
}
.orders-page__skeleton-head,
.orders-page__skeleton-foot {
  display: flex;
  align-items: center;
  gap: 10px;
}
.orders-page__skeleton-head > span {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eeeae5;
}
.orders-page__skeleton-head div {
  flex: 1;
}
.orders-page__skeleton-head strong,
.orders-page__skeleton-head small,
.orders-page__skeleton-lines i,
.orders-page__skeleton-foot i,
.orders-page__skeleton-foot strong {
  display: block;
  height: 10px;
  border-radius: 4px;
  background: #eeeae5;
}
.orders-page__skeleton-head strong {
  width: 120px;
}
.orders-page__skeleton-head small {
  width: 80px;
  margin-top: 7px;
}
.orders-page__skeleton-head em {
  width: 74px;
  height: 24px;
  border-radius: 6px;
  background: #eeeae5;
}
.orders-page__skeleton-lines {
  display: grid;
  gap: 7px;
  margin: 18px 0;
}
.orders-page__skeleton-lines i:nth-child(2) {
  width: 70%;
}
.orders-page__skeleton-lines i:nth-child(3) {
  width: 55%;
}
.orders-page__skeleton-foot {
  justify-content: space-between;
}
.orders-page__skeleton-foot i {
  width: 130px;
}
.orders-page__skeleton-foot strong {
  width: 90px;
}
.is-spinning {
  animation: orders-spin 0.7s linear infinite;
}
@keyframes orders-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 760px) {
  .orders-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .orders-page__header h1 {
    font-size: 25px;
  }
  .orders-page__summary {
    width: 100%;
    grid-template-columns: repeat(3, 1fr);
  }
  .orders-page__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .orders-page__tabs {
    overflow: auto;
  }
  .orders-page__tools {
    width: 100%;
  }
  .orders-page__search {
    flex: 1;
  }
  .orders-page__search input {
    width: 100%;
  }
}
</style>
