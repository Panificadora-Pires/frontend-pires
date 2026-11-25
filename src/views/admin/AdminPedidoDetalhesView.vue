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
import { useAdminPedidoDetalhes } from "@/composables/useAdminPedidoDetalhes";

const {
  abrirCancelamento,
  acao,
  alterar,
  atualizarAgora,
  avisoPagamento,
  badgePagamento,
  badgePedido,
  cancelamentoAberto,
  confirmacaoBloqueada,
  confirmarCancelamento,
  erro,
  erroAtualizacao,
  fecharCancelamento,
  formatarData,
  moeda,
  onRetirado,
  pedido,
  route,
  scannerAberto,
  totalItens,
} = useAdminPedidoDetalhes();
</script>

<style scoped src="./AdminPedidoDetalhesView.css"></style>
