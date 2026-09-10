<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Pedidos</h1>
        <p class="admin-page-subtitle">
          Acompanhe pedidos, pagamentos e retiradas em uma única fila
          operacional.
        </p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" :disabled="carregando" @click="carregar">
          <RefreshCw :size="16" :class="{ 'admin-spin': carregando }" />
          Atualizar
        </button>
      </div>
    </header>

    <div
      class="order-tabs"
      role="tablist"
      aria-label="Filtrar pedidos por status"
    >
      <button
        v-for="item in resumo"
        :key="item.valor"
        type="button"
        :class="{ active: filtroStatus === item.valor }"
        @click="filtroStatus = item.valor"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.total }}</strong>
      </button>
    </div>

    <div class="admin-toolbar">
      <label class="admin-search">
        <Search :size="16" />
        <input
          v-model="busca"
          placeholder="Buscar por pedido, cliente ou produto"
        />
      </label>
      <select v-model="filtroPagamento" class="admin-select">
        <option value="">Todos os pagamentos</option>
        <option value="pendente">Pagamento pendente</option>
        <option value="processando">Processando</option>
        <option value="aprovado">Aprovado</option>
        <option value="reembolsado">Reembolsado</option>
      </select>
    </div>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>
    <div v-if="carregando && !pedidos.length" class="admin-loading">
      Carregando pedidos...
    </div>
    <div v-else-if="!filtrados.length" class="admin-card admin-empty">
      <ClipboardList :size="28" /><strong>Nenhum pedido encontrado</strong>
    </div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table orders-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Status</th>
            <th>Pagamento</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtrados" :key="p.id">
            <td>
              <strong>#{{ p.id }}</strong
              ><small>{{ totalItens(p) }} itens</small>
            </td>
            <td>
              <strong>{{ p.usuario_nome || "Cliente" }}</strong>
            </td>
            <td>{{ formatarData(p.data) }}</td>
            <td>
              <span class="admin-badge" :class="badgePedido(p.status)">{{
                p.status_display || p.status
              }}</span>
            </td>
            <td>
              <strong class="payment-method">{{
                p.forma_pagamento_display || p.forma_pagamento || "—"
              }}</strong
              ><small>{{
                p.status_pagamento_display || p.status_pagamento
              }}</small>
            </td>
            <td>
              <strong>{{ moeda(p.total) }}</strong>
            </td>
            <td class="orders-table__action">
              <RouterLink
                :to="{ name: 'admin-pedido-detalhes', params: { id: p.id } }"
                class="order-open"
                >Abrir <ChevronRight :size="14"
              /></RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ChevronRight,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-vue-next";
import adminService from "@/services/admin.service";

const route = useRoute();
const pedidos = ref([]);
const carregando = ref(false);
const erro = ref("");
const busca = ref("");
const filtroStatus = ref(String(route.query.status || ""));
const filtroPagamento = ref(String(route.query.pagamento || ""));
let timer = null;

watch(
  () => route.query.status,
  (v) => {
    filtroStatus.value = String(v || "");
  },
);
watch(
  () => route.query.pagamento,
  (v) => {
    filtroPagamento.value = String(v || "");
  },
);

const resumo = computed(() => [
  { valor: "", label: "Todos", total: pedidos.value.length },
  {
    valor: "pendente",
    label: "Pendentes",
    total: pedidos.value.filter((p) => p.status === "pendente").length,
  },
  {
    valor: "confirmado",
    label: "Confirmados",
    total: pedidos.value.filter((p) => p.status === "confirmado").length,
  },
  {
    valor: "pronto",
    label: "Prontos",
    total: pedidos.value.filter((p) => p.status === "pronto").length,
  },
  {
    valor: "retirado",
    label: "Retirados",
    total: pedidos.value.filter((p) => p.status === "retirado").length,
  },
]);

const filtrados = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return pedidos.value
    .filter((p) => {
      if (filtroStatus.value && p.status !== filtroStatus.value) return false;
      if (filtroPagamento.value && p.status_pagamento !== filtroPagamento.value)
        return false;
      if (!q) return true;
      return (
        String(p.id).includes(q) ||
        String(p.usuario_nome || "")
          .toLowerCase()
          .includes(q) ||
        (p.itens || []).some((i) =>
          String(i.produto_nome || "")
            .toLowerCase()
            .includes(q),
        )
      );
    })
    .slice(0, 250);
});

function moeda(v) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));
}
function formatarData(v) {
  return v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
}
function totalItens(p) {
  return (p.itens || []).reduce((s, i) => s + Number(i.quantidade || 0), 0);
}
function badgePedido(status) {
  if (status === "pendente") return "admin-badge--warning";
  if (status === "confirmado") return "admin-badge--info";
  if (status === "pronto") return "admin-badge--success";
  if (status === "cancelado") return "admin-badge--danger";
  return "admin-badge--neutral";
}

async function carregar(silencioso = false) {
  if (!silencioso) carregando.value = true;
  erro.value = "";
  try {
    pedidos.value = await adminService.listarPedidos();
  } catch {
    if (!silencioso) erro.value = "Não foi possível carregar os pedidos.";
  } finally {
    carregando.value = false;
  }
}

onMounted(() => {
  carregar();
  timer = window.setInterval(() => carregar(true), 30000);
});
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.order-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.order-tabs button {
  min-width: 112px;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 13px;
  border: 1px solid var(--admin-border);
  border-radius: 9px;
  background: #fff;
  color: var(--admin-muted);
  cursor: pointer;
}
.order-tabs button span {
  font-size: 12px;
  font-weight: 650;
}
.order-tabs button strong {
  color: var(--admin-text);
  font-size: 17px;
}
.order-tabs button.active {
  border-color: #d6a13c;
  background: #fffaf0;
  color: #7c4a08;
}
.orders-table {
  min-width: 980px;
}
.payment-method {
  font-size: 12px;
}
.orders-table__action {
  text-align: right;
}
.order-open {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--admin-accent);
  font-size: 12px;
  font-weight: 700;
}
.order-open:hover {
  color: var(--admin-accent-hover);
}
</style>
