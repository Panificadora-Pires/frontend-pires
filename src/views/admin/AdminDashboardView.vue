<template>
  <section class="admin-page pp-admin-dashboard">
    <header class="dashboard-header">
      <div>
        <p class="dashboard-date">{{ dataContexto }}</p>
        <h1>{{ saudacao }}, {{ nome }}.</h1>
        <p>Um olhar para o dia. Atenção ao que vem a seguir.</p>
      </div>
      <div class="dashboard-actions">
        <RouterLink
          class="dashboard-primary pp-card-action pp-admin-action--primary"
          data-card-action-radius
          :to="{ name: 'admin-pedidos' }"
          ><CardActionContent
            ><ClipboardList :size="17" aria-hidden="true" />Abrir fila de
            pedidos</CardActionContent
          ></RouterLink
        >
      </div>
    </header>
    <div v-if="erro" class="dashboard-alert" role="alert">
      <CircleAlert :size="18" aria-hidden="true" /><span
        >{{ erro }}
        <template v-if="pedidosProntos || dashboard.inicializado"
          >Os dados exibidos são da última consulta concluída.</template
        ></span
      ><button type="button" class="dashboard-retry" @click="atualizarTudo">
        Tentar novamente
      </button>
    </div>
    <section class="dashboard-kpis" aria-label="Indicadores do dia">
      <AdminMetric
        label="Pedidos do dia"
        :value="pedidosProntos ? metricas.pedidosHoje : null"
        caption="Criados hoje, horário de Brasília"
        :loading="!pedidosProntos && queueSummary.carregando"
      />
      <AdminMetric
        :label="rotuloFaturamento"
        :value="
          dashboard.inicializado
            ? moeda(dashboard.relatorioHoje.total_vendido)
            : null
        "
        :caption="
          dashboard.inicializado
            ? `${dashboard.relatorioHoje.total_pedidos} ${Number(dashboard.relatorioHoje.total_pedidos) === 1 ? 'pedido retirado' : 'pedidos retirados'}`
            : 'Somente pedidos retirados'
        "
        :loading="!dashboard.inicializado && dashboard.carregando"
      />
      <AdminMetric
        label="Em preparo"
        :value="pedidosProntos ? metricas.confirmados : null"
        caption="Pedidos confirmados"
        :loading="!pedidosProntos && queueSummary.carregando"
      />
      <AdminMetric
        label="Prontos para retirada"
        :value="pedidosProntos ? metricas.prontos : null"
        caption="Aguardando no balcão"
        :loading="!pedidosProntos && queueSummary.carregando"
      />
    </section>
    <div class="dashboard-middle">
      <AdminPanel
        title="Operação agora"
        :description="
          pedidosProntos
            ? `${emAndamento} pedidos em andamento`
            : 'Consultando a fila do balcão'
        "
      >
        <div
          v-if="!pedidosProntos"
          class="dashboard-state"
          :role="queueSummary.erro ? undefined : 'status'"
        >
          {{
            queueSummary.erro
              ? "Fila indisponível. Tentando restabelecer a conexão."
              : "Carregando pedidos…"
          }}
        </div>
        <div v-else class="operation-list">
          <RouterLink
            v-for="stage in etapas"
            :key="stage.status"
            :to="{ name: 'admin-pedidos', query: { status: stage.status } }"
            ><span
              class="operation-dot"
              :class="`operation-dot--${stage.status}`"
              aria-hidden="true"
            ></span
            ><span
              >{{ stage.label }}<small>{{ stage.description }}</small></span
            ><strong>{{ stage.count }}</strong
            ><ChevronRight :size="16" aria-hidden="true"
          /></RouterLink>
          <p v-if="emAndamento === 0" class="dashboard-state">
            Nenhum pedido em andamento.
          </p>
        </div>
        <p v-if="pedidosProntos" class="operation-payments">
          <WalletCards :size="17" aria-hidden="true" /><span
            ><strong>{{ metricas.pagamentosPendentes }} pagamentos</strong>
            pendentes ou em processamento</span
          >
        </p>
      </AdminPanel>
      <AdminPanel
        title="Mais vendidos"
        :description="
          dashboard.dia
            ? `Retirados em ${formatarDia(dashboard.dia)}`
            : 'Vendas de pedidos retirados'
        "
      >
        <div
          v-if="!dashboard.inicializado"
          class="dashboard-state"
          :role="dashboard.erro ? undefined : 'status'"
        >
          {{
            dashboard.erro
              ? "Ranking indisponível. Tente atualizar."
              : "Carregando produtos…"
          }}
        </div>
        <p v-else-if="!dashboard.ranking.length" class="dashboard-state">
          Nenhuma venda de produto registrada neste período.
        </p>
        <ol v-else class="dashboard-products">
          <li v-for="item in dashboard.ranking" :key="item.produto_id">
            <ProductImage
              :produto="item.produto"
              variant="compact"
              loading="eager"
              class="dashboard-product-image"
            />
            <div>
              <strong>{{ item.produto_nome }}</strong
              ><span
                >{{ item.quantidade_vendida }}
                {{
                  Number(item.quantidade_vendida) === 1 ? "unidade" : "unidades"
                }}</span
              >
            </div>
          </li>
        </ol>
        <p class="dashboard-note">
          Ranking por quantidade. Somente pedidos retirados.
        </p>
      </AdminPanel>
      <AdminPanel
        title="Faturamento"
        description="Últimos 7 dias · pedidos retirados"
      >
        <div v-if="!dashboard.inicializado" class="dashboard-state">
          {{
            dashboard.erro
              ? "Série indisponível. Tente atualizar os indicadores."
              : "Carregando faturamento…"
          }}
        </div>
        <template v-else
          ><div class="revenue-total">
            <strong>{{ moeda(totalSemana) }}</strong
            ><span
              >{{ formatarDia(serie[0].dia) }} a
              {{ formatarDia(diaAtual) }}</span
            >
          </div>
          <AdminRevenueChart :points="serie"
        /></template>
      </AdminPanel>
    </div>
    <div class="dashboard-bottom">
      <AdminPanel
        title="Atenção ao estoque"
        description="Confira antes do próximo intervalo"
      >
        <div class="stock-unavailable">
          <Boxes :size="27" aria-hidden="true" /><strong
            >Alertas automáticos indisponíveis</strong
          >
          <p>
            Consulte Produtos para conferir quantidades e disponibilidade antes
            do próximo intervalo.
          </p>
        </div>
        <RouterLink class="dashboard-link" :to="{ name: 'admin-produtos' }"
          >Consultar produtos<ArrowRight :size="16" aria-hidden="true"
        /></RouterLink>
      </AdminPanel>
      <AdminPanel
        title="Pedidos recentes"
        description="Últimos pedidos registrados"
      >
        <template #action
          ><RouterLink class="dashboard-link" :to="{ name: 'admin-pedidos' }"
            >Abrir fila<ArrowRight :size="16" aria-hidden="true" /></RouterLink
        ></template>
        <div
          v-if="!pedidosProntos"
          class="dashboard-state"
          :role="queueSummary.erro ? undefined : 'status'"
        >
          {{
            queueSummary.erro
              ? "Pedidos indisponíveis. Tente atualizar."
              : "Carregando pedidos…"
          }}
        </div>
        <p v-else-if="!recentes.length" class="dashboard-state">
          Nenhum pedido registrado.
        </p>
        <div
          v-else
          class="dashboard-table"
          role="table"
          aria-label="Pedidos recentes"
        >
          <div class="recent-head" role="row">
            <span role="columnheader">Pedido / cliente</span
            ><span role="columnheader">Etapa</span
            ><span role="columnheader">Pagamento</span
            ><span role="columnheader">Total</span
            ><span role="columnheader" class="sr-only">Detalhes</span>
          </div>
          <div role="rowgroup">
            <div
              v-for="pedido in recentes"
              :key="pedido.id"
              class="recent-row"
              role="row"
            >
              <div class="recent-person" role="cell">
                <strong
                  >#{{ pedido.id }} ·
                  {{ pedido.usuario_nome || "Cliente" }}</strong
                ><small>{{ formatarData(pedido.data) }}</small>
              </div>
              <div class="recent-status" role="cell">
                <span class="dashboard-badge" :class="badge(pedido.status)">{{
                  pedido.status_display || statusLabel(pedido.status)
                }}</span>
              </div>
              <div class="recent-payment" role="cell">
                {{
                  pedido.forma_pagamento_display ||
                  pedido.forma_pagamento ||
                  "—"
                }}<small>{{
                  pedido.status_pagamento_display ||
                  pedido.status_pagamento ||
                  "—"
                }}</small>
              </div>
              <strong class="recent-total" role="cell">{{
                moeda(pedido.total)
              }}</strong>
              <div class="recent-action" role="cell">
                <RouterLink
                  class="dashboard-link"
                  :aria-label="`Abrir pedido ${pedido.id}`"
                  :to="{
                    name: 'admin-pedido-detalhes',
                    params: { id: pedido.id },
                  }"
                  >Abrir</RouterLink
                >
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
    </div>
    <footer class="dashboard-footer">
      <span>Pires Panificadora · Administração</span
      ><span v-if="dashboard.inicializado"
        >{{ dashboard.resumoProdutos.ativos }} produtos ativos ·
        {{ dashboard.resumoPromocoes.ativas }} promoções ativas</span
      >
    </footer>
  </section>
</template>

<script setup>
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  WalletCards,
} from "lucide-vue-next";
import AdminMetric from "@/components/admin/AdminMetric.vue";
import AdminPanel from "@/components/admin/AdminPanel.vue";
import AdminRevenueChart from "@/components/admin/AdminRevenueChart.vue";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAdminDashboard } from "@/composables/useAdminDashboard";

const {
  atualizarTudo,
  badge,
  dashboard,
  dataContexto,
  diaAtual,
  emAndamento,
  erro,
  etapas,
  formatarData,
  formatarDia,
  metricas,
  moeda,
  nome,
  pedidosProntos,
  queueSummary,
  recentes,
  rotuloFaturamento,
  saudacao,
  serie,
  statusLabel,
  totalSemana,
} = useAdminDashboard();
</script>

<style scoped src="./AdminDashboardView.css"></style>
