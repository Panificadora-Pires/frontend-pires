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
      <div
        v-if="erro || erroAtualizacao"
        class="admin-detail-retry"
        role="status"
      >
        <span>Não foi possível sincronizar os dados.</span>
        <button
          type="button"
          class="admin-btn pp-card-action pp-admin-action--secondary"
          data-card-action-radius
          @click="atualizarAgora"
        >
          <CardActionContent>Tentar novamente</CardActionContent>
        </button>
      </div>
    </header>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>
    <div v-if="!pedido && !erro" class="admin-card admin-loading">
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
                class="admin-btn admin-btn--primary order-actions__main pp-card-action pp-admin-action--primary"
                data-card-action-radius
                :disabled="acao || confirmacaoBloqueada"
                @click="alterar('confirmado')"
              >
                <CardActionContent>
                  <BadgeCheck :size="17" />Confirmar pedido
                </CardActionContent>
              </button>
              <button
                v-if="pedido.status === 'confirmado'"
                class="admin-btn admin-btn--primary order-actions__main pp-card-action pp-admin-action--primary"
                data-card-action-radius
                :disabled="acao"
                @click="alterar('pronto')"
              >
                <CardActionContent>
                  <PackageCheck :size="17" />Marcar como pronto
                </CardActionContent>
              </button>
              <button
                v-if="pedido.status === 'pronto'"
                class="admin-btn admin-btn--primary order-actions__main pp-card-action pp-admin-action--primary"
                data-card-action-radius
                :disabled="acao"
                @click="scannerAberto = true"
              >
                <CardActionContent>
                  <QrCode :size="17" />Confirmar retirada por QR
                </CardActionContent>
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
                class="admin-btn admin-btn--danger order-actions__main pp-card-action pp-admin-action--danger"
                data-card-action-radius
                :disabled="acao"
                @click="abrirCancelamento"
              >
                <CardActionContent>
                  <CircleX :size="16" />Cancelar pedido
                </CardActionContent>
              </button>
            </div>
          </section>

          <section class="admin-card order-chat-card">
            <div class="admin-card-header">
              <div>
                <h2 class="admin-card-title">Conversa com o cliente</h2>
                <span class="admin-card-meta">
                  Ele recebe uma notificação a cada resposta.
                </span>
              </div>
            </div>
            <OrderChatPanel
              :key="pedido.id"
              class="order-chat-card__panel"
              :pedido-id="pedido.id"
              variante="admin"
              :nome-cliente="pedido.usuario_nome || 'Cliente'"
            />
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

    <div
      v-if="cancelamentoAberto"
      class="admin-modal"
      @click.self="fecharCancelamento"
    >
      <div
        class="admin-modal-card order-cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-cancel-title"
      >
        <div class="admin-modal-header">
          <div>
            <h2 id="order-cancel-title">Cancelar pedido</h2>
            <p class="order-cancel-modal__subtitle">
              Esta ação altera o pedido #{{ pedido.id }} para cancelado.
            </p>
          </div>
          <button
            type="button"
            class="admin-btn admin-btn--ghost admin-btn--sm"
            :disabled="acao"
            @click="fecharCancelamento"
          >
            Fechar
          </button>
        </div>

        <div class="admin-modal-body order-cancel-modal__body">
          <div class="order-cancel-modal__icon">
            <CircleAlert :size="22" />
          </div>
          <div>
            <strong>Deseja realmente cancelar este pedido?</strong>
            <p v-if="pedido.forma_pagamento === 'dinheiro'">
              O estoque reservado será devolvido após a confirmação.
            </p>
            <p v-else>
              O sistema verificará o pagamento no Mercado Pago antes de concluir
              o cancelamento. Se já houver pagamento aprovado, o fluxo
              financeiro correspondente será processado primeiro.
            </p>
          </div>
        </div>

        <div class="admin-modal-footer">
          <button
            type="button"
            class="admin-btn pp-card-action pp-admin-action--secondary"
            data-card-action-radius
            :disabled="acao"
            @click="fecharCancelamento"
          >
            <CardActionContent> Voltar </CardActionContent>
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--danger pp-card-action pp-admin-action--danger"
            data-card-action-radius
            :disabled="acao"
            @click="confirmarCancelamento"
          >
            <CardActionContent>
              <CircleX :size="16" />
              {{ acao ? "Cancelando..." : "Cancelar pedido" }}
            </CardActionContent>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  CircleCheckBig,
  CircleX,
  PackageCheck,
  QrCode,
  WalletCards,
} from "lucide-vue-next";
import AdminQRCodeScanner from "@/components/admin/AdminQRCodeScanner.vue";
import OrderChatPanel from "@/components/chat/OrderChatPanel.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { mensagemErroApi } from "@/services/admin.service";
import { useAdminOrdersStore } from "@/stores/adminOrders";

const INTERVALO_DETALHE_MS = 15_000;

const route = useRoute();
const adminOrders = useAdminOrdersStore();
const pedido = ref(adminOrders.porId(route.params.id));
const erro = ref("");
let versaoLocal = 0;
const acao = ref(false);
const scannerAberto = ref(false);
const cancelamentoAberto = ref(false);

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
  return mensagemErroApi(e, "Não foi possível concluir a operação.");
}

async function carregar() {
  const versaoNoInicio = versaoLocal;
  try {
    const atualizado = await adminOrders.obterPedido(route.params.id);
    if (versaoNoInicio === versaoLocal && !acao.value) {
      pedido.value = atualizado;
    }
    erro.value = "";
  } catch (error) {
    if (!pedido.value) erro.value = "Não foi possível carregar este pedido.";
    throw error;
  }
}

const { erro: erroAtualizacao, atualizarAgora } = useAutoRefresh(carregar, {
  intervalo: INTERVALO_DETALHE_MS,
});

watch(
  () => route.params.id,
  (id, anterior) => {
    if (!id || id === anterior) return;
    pedido.value = adminOrders.porId(id);
    erro.value = "";
    versaoLocal += 1;
    atualizarAgora();
  },
);

async function alterar(status) {
  acao.value = true;
  erro.value = "";
  try {
    versaoLocal += 1;
    pedido.value = await adminOrders.alterarStatus(pedido.value.id, status);
    return true;
  } catch (e) {
    erro.value = msgErro(e);
    return false;
  } finally {
    acao.value = false;
  }
}

function abrirCancelamento() {
  erro.value = "";
  cancelamentoAberto.value = true;
}

function fecharCancelamento() {
  if (acao.value) return;
  cancelamentoAberto.value = false;
}

async function confirmarCancelamento() {
  const sucesso = await alterar("cancelado");
  if (sucesso) {
    cancelamentoAberto.value = false;
  }
}

function onRetirado(p) {
  scannerAberto.value = false;
  versaoLocal += 1;
  pedido.value = p;
  adminOrders.substituirPedido(p);
}
</script>

<style scoped src="./AdminPedidoDetalhesView.css"></style>
