<template>
  <section class="admin-page order-detail">
    <header class="admin-page-header">
      <div>
        <RouterLink :to="{ name: 'admin-pedidos' }" class="order-detail__back"
          ><ArrowLeft :size="15" /> Pedidos</RouterLink
        >
        <h1 class="admin-page-title">
          Pedido #{{ pedido?.id || route.params.id }}
        </h1>
        <p v-if="pedido" class="admin-page-subtitle">
          {{ pedido.usuario_nome || "Cliente" }} ·
          {{ formatarData(pedido.data) }}
        </p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" :disabled="carregando" @click="carregar">
          <RefreshCw :size="16" :class="{ 'admin-spin': carregando }" />
          Atualizar
        </button>
      </div>
    </header>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>
    <div v-if="carregando && !pedido" class="admin-card admin-loading">
      Carregando pedido...
    </div>

    <template v-else-if="pedido">
      <section class="admin-card order-summary">
        <div class="order-summary__item">
          <span>Status do pedido</span>
          <strong
            ><span class="admin-badge" :class="badgePedido(pedido.status)">{{
              pedido.status_display || pedido.status
            }}</span></strong
          >
        </div>
        <div class="order-summary__item">
          <span>Forma de pagamento</span>
          <strong>{{
            pedido.forma_pagamento_display || pedido.forma_pagamento || "—"
          }}</strong>
        </div>
        <div class="order-summary__item">
          <span>Status do pagamento</span>
          <strong
            ><span
              class="admin-badge"
              :class="badgePagamento(pedido.status_pagamento)"
              >{{
                pedido.status_pagamento_display || pedido.status_pagamento
              }}</span
            ></strong
          >
        </div>
        <div class="order-summary__item">
          <span>Total</span>
          <strong>{{ moeda(pedido.total) }}</strong>
        </div>
      </section>

      <div v-if="avisoPagamento" class="admin-alert admin-alert--warning">
        <WalletCards :size="17" /><span>{{ avisoPagamento }}</span>
      </div>

      <div class="order-detail__grid">
        <main class="admin-card order-items-card">
          <div class="admin-card-header">
            <div>
              <h2 class="admin-card-title">Itens do pedido</h2>
              <span class="admin-card-meta">{{ totalItens }} itens</span>
            </div>
          </div>
          <div class="order-items">
            <div
              v-for="item in pedido.itens || []"
              :key="item.id"
              class="order-item"
            >
              <span class="order-item__qty">{{ item.quantidade }}×</span>
              <div class="order-item__main">
                <strong>{{ item.produto_nome }}</strong
                ><span>{{ moeda(item.preco_unitario) }} por unidade</span>
              </div>
              <strong class="order-item__subtotal">{{
                moeda(item.subtotal)
              }}</strong>
            </div>
          </div>
          <div class="order-total">
            <span>Total</span><strong>{{ moeda(pedido.total) }}</strong>
          </div>
        </main>

        <aside class="order-detail__side">
          <section class="admin-card">
            <div class="admin-card-header">
              <h2 class="admin-card-title">Ações</h2>
            </div>
            <div class="order-actions">
              <button
                v-if="pedido.status === 'pendente'"
                class="admin-btn admin-btn--primary order-actions__main"
                :disabled="acao || confirmacaoBloqueada"
                @click="alterar('confirmado')"
              >
                <BadgeCheck :size="17" />Confirmar pedido
              </button>
              <button
                v-if="pedido.status === 'confirmado'"
                class="admin-btn admin-btn--primary order-actions__main"
                :disabled="acao"
                @click="alterar('pronto')"
              >
                <PackageCheck :size="17" />Marcar como pronto
              </button>
              <button
                v-if="pedido.status === 'pronto'"
                class="admin-btn admin-btn--primary order-actions__main"
                :disabled="acao"
                @click="scannerAberto = true"
              >
                <QrCode :size="17" />Confirmar retirada por QR
              </button>
              <div
                v-if="['retirado', 'cancelado'].includes(pedido.status)"
                class="order-actions__done"
              >
                <CircleCheckBig :size="19" />
                <div>
                  <strong>Pedido finalizado</strong
                  ><span>Nenhuma ação pendente.</span>
                </div>
              </div>
              <button
                v-if="
                  ['pendente', 'confirmado', 'pronto'].includes(pedido.status)
                "
                class="admin-btn admin-btn--danger order-actions__main"
                :disabled="acao"
                @click="cancelar"
              >
                <CircleX :size="16" />Cancelar pedido
              </button>
            </div>
          </section>

          <section class="admin-card">
            <div class="admin-card-header">
              <h2 class="admin-card-title">Informações</h2>
            </div>
            <dl class="order-info">
              <div>
                <dt>Cliente</dt>
                <dd>{{ pedido.usuario_nome || "Cliente" }}</dd>
              </div>
              <div>
                <dt>Código de retirada</dt>
                <dd class="order-info__code">{{ pedido.codigo_retirada }}</dd>
              </div>
              <div>
                <dt>Forma de pagamento</dt>
                <dd>
                  {{ pedido.forma_pagamento_display || pedido.forma_pagamento }}
                </dd>
              </div>
              <div>
                <dt>Pagamento</dt>
                <dd>
                  {{
                    pedido.status_pagamento_display || pedido.status_pagamento
                  }}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>

    <AdminQRCodeScanner
      :aberto="scannerAberto"
      @close="scannerAberto = false"
      @retirado="onRetirado"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  PackageCheck,
  QrCode,
  RefreshCw,
  WalletCards,
} from "lucide-vue-next";
import AdminQRCodeScanner from "@/components/admin/AdminQRCodeScanner.vue";
import adminService from "@/services/admin.service";

const route = useRoute();
const pedido = ref(null);
const carregando = ref(false);
const erro = ref("");
const acao = ref(false);
const scannerAberto = ref(false);

const totalItens = computed(() =>
  (pedido.value?.itens || []).reduce(
    (s, i) => s + Number(i.quantidade || 0),
    0,
  ),
);
const confirmacaoBloqueada = computed(() =>
  Boolean(
    pedido.value &&
    ["pix", "cartao"].includes(pedido.value.forma_pagamento) &&
    pedido.value.status_pagamento !== "aprovado",
  ),
);
const avisoPagamento = computed(() =>
  confirmacaoBloqueada.value
    ? "O pagamento online ainda não foi aprovado. A confirmação do pedido será liberada após a aprovação."
    : "",
);

function moeda(v) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));
}
function formatarData(v) {
  return v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
}
function badgePedido(status) {
  if (status === "pendente") return "admin-badge--warning";
  if (status === "confirmado") return "admin-badge--info";
  if (status === "pronto") return "admin-badge--success";
  if (status === "cancelado") return "admin-badge--danger";
  return "admin-badge--neutral";
}
function badgePagamento(status) {
  if (status === "aprovado") return "admin-badge--success";
  if (["recusado", "cancelado", "erro"].includes(status))
    return "admin-badge--danger";
  if (status === "processando") return "admin-badge--info";
  if (status === "reembolsado") return "admin-badge--neutral";
  return "admin-badge--warning";
}
function msgErro(e) {
  const d = e.response?.data;
  if (typeof d?.status === "string") return d.status;
  if (Array.isArray(d?.status)) return d.status.join(" ");
  if (typeof d?.detail === "string") return d.detail;
  return "Não foi possível concluir a operação.";
}

async function carregar() {
  carregando.value = true;
  erro.value = "";
  try {
    pedido.value = await adminService.obterPedido(route.params.id);
  } catch {
    erro.value = "Não foi possível carregar este pedido.";
  } finally {
    carregando.value = false;
  }
}

async function alterar(status) {
  acao.value = true;
  erro.value = "";
  try {
    pedido.value = await adminService.alterarStatusPedido(
      pedido.value.id,
      status,
    );
  } catch (e) {
    erro.value = msgErro(e);
  } finally {
    acao.value = false;
  }
}

async function cancelar() {
  if (!window.confirm(`Cancelar o pedido #${pedido.value.id}?`)) return;
  await alterar("cancelado");
}

function onRetirado(p) {
  scannerAberto.value = false;
  pedido.value = p;
}
onMounted(carregar);
</script>

<style scoped>
.order-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
}
.order-detail__back:hover {
  color: var(--admin-text);
}
.order-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 14px;
  overflow: hidden;
}
.order-summary__item {
  padding: 15px 17px;
  border-right: 1px solid var(--admin-border);
}
.order-summary__item:last-child {
  border-right: 0;
}
.order-summary__item > span,
.order-summary__item > strong {
  display: block;
}
.order-summary__item > span {
  color: var(--admin-muted);
  font-size: 11px;
  font-weight: 600;
}
.order-summary__item > strong {
  margin-top: 7px;
  color: var(--admin-text);
  font-size: 14px;
}
.order-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.65fr);
  gap: 14px;
}
.order-items-card {
  overflow: hidden;
}
.order-items {
  padding: 0 18px;
}
.order-item {
  min-height: 66px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #efeeec;
}
.order-item:last-child {
  border-bottom: 0;
}
.order-item__qty {
  width: 36px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f5f5f4;
  color: var(--admin-text-soft);
  font-size: 12px;
  font-weight: 700;
}
.order-item__main strong,
.order-item__main span {
  display: block;
}
.order-item__main strong {
  color: var(--admin-text);
  font-size: 13px;
}
.order-item__main span {
  margin-top: 4px;
  color: var(--admin-muted);
  font-size: 11px;
}
.order-item__subtotal {
  color: var(--admin-text);
  font-size: 13px;
}
.order-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-top: 1px solid var(--admin-border);
  background: var(--admin-surface-subtle);
  color: var(--admin-text-soft);
  font-size: 13px;
}
.order-total strong {
  color: var(--admin-text);
  font-size: 18px;
}
.order-detail__side {
  display: grid;
  align-content: start;
  gap: 14px;
}
.order-actions {
  display: grid;
  gap: 8px;
  padding: 16px;
}
.order-actions__main {
  width: 100%;
}
.order-actions__done {
  display: flex;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 9px;
  background: var(--admin-success-soft);
  color: #166534;
}
.order-actions__done strong,
.order-actions__done span {
  display: block;
}
.order-actions__done strong {
  font-size: 12px;
}
.order-actions__done span {
  margin-top: 3px;
  font-size: 11px;
}
.order-info {
  margin: 0;
  padding: 4px 16px 10px;
}
.order-info div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #efeeec;
}
.order-info div:last-child {
  border-bottom: 0;
}
.order-info dt {
  color: var(--admin-muted);
  font-size: 11px;
}
.order-info dd {
  margin: 0;
  color: var(--admin-text);
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}
.order-info__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px !important;
}
@media (max-width: 980px) {
  .order-detail__grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px) {
  .order-summary {
    grid-template-columns: 1fr 1fr;
  }
  .order-summary__item:nth-child(2) {
    border-right: 0;
  }
  .order-summary__item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--admin-border);
  }
}
</style>
