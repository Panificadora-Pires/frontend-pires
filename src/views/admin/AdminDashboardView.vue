<template>
  <section class="admin-page pp-admin-dashboard">
    <header class="dashboard-header">
      <div><p class="dashboard-date">{{ dataContexto }}</p><h1>{{ saudacao }}, {{ nome }}.</h1><p>Um olhar para o dia. Atenção ao que vem a seguir.</p></div>
      <div class="dashboard-actions">
        <RouterLink class="dashboard-primary" :to="{ name: 'admin-pedidos' }"><ClipboardList :size="17" aria-hidden="true" />Abrir fila de pedidos</RouterLink>
      </div>
    </header>
    <div v-if="erro" class="dashboard-alert" role="alert"><CircleAlert :size="18" aria-hidden="true" /><span>{{ erro }} <template v-if="pedidosProntos || dashboard.inicializado">Os dados exibidos são da última consulta concluída.</template></span><button type="button" class="dashboard-retry" @click="atualizarTudo">Tentar novamente</button></div>
    <section class="dashboard-kpis" aria-label="Indicadores do dia">
      <AdminMetric label="Pedidos do dia" :value="pedidosProntos ? metricas.pedidosHoje : null" caption="Criados hoje, horário de Brasília" :loading="!pedidosProntos && (adminOrders.carregando || adminOrders.atualizando)" />
      <AdminMetric :label="rotuloFaturamento" :value="dashboard.inicializado ? moeda(dashboard.relatorioHoje.total_vendido) : null" :caption="dashboard.inicializado ? `${dashboard.relatorioHoje.total_pedidos} ${Number(dashboard.relatorioHoje.total_pedidos) === 1 ? 'pedido retirado' : 'pedidos retirados'}` : 'Somente pedidos retirados'" :loading="!dashboard.inicializado && dashboard.carregando" />
      <AdminMetric label="Em preparo" :value="pedidosProntos ? metricas.confirmados : null" caption="Pedidos confirmados" :loading="!pedidosProntos && (adminOrders.carregando || adminOrders.atualizando)" />
      <AdminMetric label="Prontos para retirada" :value="pedidosProntos ? metricas.prontos : null" caption="Aguardando no balcão" :loading="!pedidosProntos && (adminOrders.carregando || adminOrders.atualizando)" />
    </section>
    <div class="dashboard-middle">
      <AdminPanel title="Operação agora" :description="pedidosProntos ? `${emAndamento} pedidos em andamento` : 'Consultando a fila do balcão'">
        <div v-if="!pedidosProntos" class="dashboard-state" :role="adminOrders.erro ? undefined : 'status'">{{ adminOrders.erro ? 'Fila indisponível. Tentando restabelecer a conexão.' : 'Carregando pedidos…' }}</div>
        <div v-else class="operation-list">
          <RouterLink v-for="stage in etapas" :key="stage.status" :to="{ name: 'admin-pedidos', query: { status: stage.status } }"><span class="operation-dot" :class="`operation-dot--${stage.status}`" aria-hidden="true"></span><span>{{ stage.label }}<small>{{ stage.description }}</small></span><strong>{{ stage.count }}</strong><ChevronRight :size="16" aria-hidden="true" /></RouterLink>
          <p v-if="emAndamento === 0" class="dashboard-state">Nenhum pedido em andamento.</p>
        </div>
        <p v-if="pedidosProntos" class="operation-payments"><WalletCards :size="17" aria-hidden="true" /><span><strong>{{ metricas.pagamentosPendentes }} pagamentos</strong> pendentes ou em processamento</span></p>
      </AdminPanel>
      <AdminPanel title="Mais vendidos" :description="dashboard.dia ? `Retirados em ${formatarDia(dashboard.dia)}` : 'Vendas de pedidos retirados'">
        <div v-if="!dashboard.inicializado" class="dashboard-state" :role="dashboard.erro ? undefined : 'status'">{{ dashboard.erro ? 'Ranking indisponível. Tente atualizar.' : 'Carregando produtos…' }}</div>
        <p v-else-if="!dashboard.ranking.length" class="dashboard-state">Nenhuma venda de produto registrada neste período.</p>
        <ol v-else class="dashboard-products"><li v-for="item in dashboard.ranking" :key="item.produto_id"><ProductImage :produto="item.produto" variant="compact" loading="eager" class="dashboard-product-image" /><div><strong>{{ item.produto_nome }}</strong><span>{{ item.quantidade_vendida }} {{ Number(item.quantidade_vendida) === 1 ? 'unidade' : 'unidades' }}</span></div></li></ol>
        <p class="dashboard-note">Ranking por quantidade. Somente pedidos retirados.</p>
      </AdminPanel>
      <AdminPanel title="Faturamento" description="Últimos 7 dias · pedidos retirados">
        <div v-if="!pedidosProntos" class="dashboard-state">{{ adminOrders.erro ? 'Série indisponível: a consulta de pedidos não foi concluída.' : 'Carregando faturamento…' }}</div>
        <template v-else><div class="revenue-total"><strong>{{ moeda(totalSemana) }}</strong><span>{{ formatarDia(serie[0].dia) }} a {{ formatarDia(diaAtual) }}</span></div><AdminRevenueChart :points="serie" /></template>
      </AdminPanel>
    </div>
    <div class="dashboard-bottom">
      <AdminPanel title="Atenção ao estoque" description="Confira antes do próximo intervalo">
        <div class="stock-unavailable"><Boxes :size="27" aria-hidden="true" /><strong>Alertas automáticos indisponíveis</strong><p>Consulte Produtos para conferir quantidades e disponibilidade antes do próximo intervalo.</p></div>
        <RouterLink class="dashboard-link" :to="{ name: 'admin-produtos' }">Consultar produtos<ArrowRight :size="16" aria-hidden="true" /></RouterLink>
      </AdminPanel>
      <AdminPanel title="Pedidos recentes" description="Últimos pedidos registrados">
        <template #action><RouterLink class="dashboard-link" :to="{ name: 'admin-pedidos' }">Abrir fila<ArrowRight :size="16" aria-hidden="true" /></RouterLink></template>
        <div v-if="!pedidosProntos" class="dashboard-state" :role="adminOrders.erro ? undefined : 'status'">{{ adminOrders.erro ? 'Pedidos indisponíveis. Tente atualizar.' : 'Carregando pedidos…' }}</div>
        <p v-else-if="!recentes.length" class="dashboard-state">Nenhum pedido registrado.</p>
        <div v-else class="dashboard-table" role="table" aria-label="Pedidos recentes">
          <div class="recent-head" role="row"><span role="columnheader">Pedido / cliente</span><span role="columnheader">Etapa</span><span role="columnheader">Pagamento</span><span role="columnheader">Total</span><span role="columnheader" class="sr-only">Detalhes</span></div>
          <div role="rowgroup"><div v-for="pedido in recentes" :key="pedido.id" class="recent-row" role="row"><div class="recent-person" role="cell"><strong>#{{ pedido.id }} · {{ pedido.usuario_nome || 'Cliente' }}</strong><small>{{ formatarData(pedido.data) }}</small></div><div class="recent-status" role="cell"><span class="dashboard-badge" :class="badge(pedido.status)">{{ pedido.status_display || statusLabel(pedido.status) }}</span></div><div class="recent-payment" role="cell">{{ pedido.forma_pagamento_display || pedido.forma_pagamento || '—' }}<small>{{ pedido.status_pagamento_display || pedido.status_pagamento || '—' }}</small></div><strong class="recent-total" role="cell">{{ moeda(pedido.total) }}</strong><div class="recent-action" role="cell"><RouterLink class="dashboard-link" :aria-label="`Abrir pedido ${pedido.id}`" :to="{ name: 'admin-pedido-detalhes', params: { id: pedido.id } }">Abrir</RouterLink></div></div></div>
        </div>
      </AdminPanel>
    </div>
    <footer class="dashboard-footer"><span>Pires Panificadora · Administração</span><span v-if="dashboard.inicializado">{{ dashboard.produtos.length }} produtos ativos · {{ promocoesAtivas }} promoções ativas</span></footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ArrowRight, Boxes, ChevronRight, CircleAlert, ClipboardList, WalletCards } from 'lucide-vue-next';
import AdminMetric from '@/components/admin/AdminMetric.vue';
import AdminPanel from '@/components/admin/AdminPanel.vue';
import AdminRevenueChart from '@/components/admin/AdminRevenueChart.vue';
import ProductImage from '@/components/catalog/ProductImage.vue';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useAdminDashboardStore } from '@/stores/adminDashboard';
import { useAdminOrdersStore } from '@/stores/adminOrders';
import { useAuthStore } from '@/stores/auth';
import { diaEmSaoPaulo, metricasPedidos, serieRetiradas } from '@/utils/adminDashboard';
const dashboard = useAdminDashboardStore();
const adminOrders = useAdminOrdersStore();
const auth = useAuthStore();
const referencia = ref(new Date());
const diaAtual = computed(() => diaEmSaoPaulo(referencia.value));
const nome = computed(() => auth.usuario?.name?.trim().split(/\s+/)[0] || 'equipe');
const hora = computed(() => Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(referencia.value)));
const saudacao = computed(() => hora.value < 12 ? 'Bom dia' : hora.value < 18 ? 'Boa tarde' : 'Boa noite');
const dataContexto = computed(() => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(referencia.value));
const pedidosProntos = computed(() => adminOrders.inicializado);
const metricas = computed(() => metricasPedidos(adminOrders.itens, diaAtual.value));
const emAndamento = computed(() => metricas.value.pendentes + metricas.value.confirmados + metricas.value.prontos);
const etapas = computed(() => [
  { status: 'pendente', label: 'Pendentes', description: 'Aguardam confirmação', count: metricas.value.pendentes },
  { status: 'confirmado', label: 'Em preparo', description: 'Na produção', count: metricas.value.confirmados },
  { status: 'pronto', label: 'Prontos', description: 'Já podem ser retirados', count: metricas.value.prontos },
]);
const recentes = computed(() => adminOrders.itens.slice(0, 4));
const serie = computed(() => serieRetiradas(adminOrders.itens, diaAtual.value));
const totalSemana = computed(() => serie.value.reduce((sum, p) => sum + Math.round(p.value * 100), 0) / 100);
const promocoesAtivas = computed(() => dashboard.promocoes.filter(p => p.data_inicio <= diaAtual.value && p.data_fim >= diaAtual.value).length);
const rotuloFaturamento = computed(() => !dashboard.dia || dashboard.dia === diaAtual.value ? 'Faturamento do dia' : `Faturamento de ${formatarDia(dashboard.dia)}`);
// Catálogo/relatório mudam devagar; a fila continua pertencendo ao AdminLayout.
const extras = useAutoRefresh(() => {
  referencia.value = new Date();
  return dashboard.carregar({ agora: referencia.value });
}, { intervalo: 60_000 });
const erro = computed(() => adminOrders.erro || dashboard.erro || (adminOrders.erroAtualizacao ? 'Não foi possível atualizar a fila de pedidos.' : '') || (extras.erro.value ? 'Não foi possível atualizar os indicadores.' : ''));
function atualizarTudo() { return Promise.allSettled([extras.atualizarAgora(), adminOrders.atualizarAgora()]); }
function moeda(valor) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0)); }
function formatarDia(dia) { return dia ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}` : '—'; }
function formatarData(valor) { const data = new Date(valor); return Number.isFinite(data.getTime()) ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(data) : '—'; }
function statusLabel(status) { return { pendente: 'Pendente', confirmado: 'Em preparo', pronto: 'Pronto', retirado: 'Retirado', cancelado: 'Cancelado' }[status] || status || '—'; }
function badge(status) { return ['pendente', 'confirmado', 'pronto', 'retirado', 'cancelado'].includes(status) ? `dashboard-badge--${status}` : ''; }
</script>

<style scoped>
.pp-admin-dashboard{color:var(--pp-admin-text)}.dashboard-header{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:24px}
.dashboard-header h1{font-size:30px;line-height:1.25;letter-spacing:-.025em;margin:8px 0 6px;font-weight:650}.dashboard-header p{font-size:14px;line-height:1.5;color:var(--pp-admin-muted);margin:0}.dashboard-header .dashboard-date{font-size:13px}
.dashboard-actions{display:flex;align-items:flex-end;flex-direction:column;gap:10px;flex:none}.dashboard-primary,.dashboard-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;text-decoration:none;font-size:14px;font-weight:500}
.dashboard-primary{background:var(--pp-admin-text);color:var(--pp-admin-bg);padding:10px 18px;border-radius:10px}.dashboard-primary:hover{background:var(--pp-marrom-2)}.dashboard-link{color:var(--pp-admin-accent)}.dashboard-link:hover{text-decoration:underline;text-underline-offset:4px}
.dashboard-primary:focus-visible,.dashboard-link:focus-visible,.dashboard-retry:focus-visible,.operation-list a:focus-visible{outline:3px solid var(--pp-admin-accent);outline-offset:4px}
.dashboard-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:20px 0;background:var(--pp-creme-2);border-radius:14px;margin-bottom:24px}.dashboard-kpis>:not(:first-child){border-left:1px solid var(--pp-admin-border)}
.dashboard-middle{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.08fr) minmax(0,1.28fr);gap:18px;align-items:stretch}.dashboard-bottom{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,2.36fr);gap:18px;margin-top:20px}
.dashboard-alert{display:flex;align-items:flex-start;gap:10px;background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger);padding:14px 16px;border-radius:10px;margin-bottom:18px;font-size:14px;line-height:1.5}.dashboard-alert svg{flex:none;margin-top:2px}.dashboard-alert span{flex:1}.dashboard-retry{border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;padding:8px 12px;min-height:38px;font-size:12px;font-weight:650;cursor:pointer;flex:none}.dashboard-retry:hover{background:var(--pp-admin-surface)}
.operation-list a{display:flex;align-items:center;gap:9px;min-height:66px;padding:12px 0;border-bottom:1px solid var(--pp-admin-border);text-decoration:none;color:var(--pp-admin-text);font-size:14px}.operation-list a:last-of-type{border-bottom:0}.operation-list a>span:nth-child(2){flex:1;min-width:0}.operation-list small{display:block;color:var(--pp-admin-muted);font-size:13px;margin-top:3px}.operation-list strong{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums}.operation-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--pp-admin-accent)}.operation-dot--confirmado{background:var(--pp-marrom-2)}.operation-dot--pronto{background:var(--pp-admin-success)}.operation-payments{display:flex;align-items:flex-start;gap:8px;border-top:1px solid var(--pp-admin-border);padding-top:15px;color:var(--pp-admin-muted);font-size:13px;line-height:1.5;margin:10px 0 0}.operation-payments svg{flex:none;margin-top:2px}.operation-payments strong{color:var(--pp-admin-text);font-weight:500}
.dashboard-state{color:var(--pp-admin-muted);font-size:14px;line-height:1.6;padding:16px 0;margin:0}.dashboard-products{list-style:none;padding:0;margin:0}.dashboard-products li{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--pp-admin-border)}.dashboard-products li:first-child{padding-top:0}.dashboard-products li:last-child{border-bottom:0}.dashboard-products li>div:last-child{min-width:0}.dashboard-products strong{font-size:14px;line-height:1.45;font-weight:600;display:block;overflow-wrap:anywhere}.dashboard-products span{display:block;color:var(--pp-admin-muted);font-size:13px;margin-top:3px}.dashboard-product-image{width:58px;height:58px;flex:0 0 58px;border-radius:10px}.dashboard-note{font-size:13px;color:var(--pp-admin-muted);line-height:1.5;margin:12px 0 0}
.revenue-total{display:flex;flex-direction:column;gap:4px;margin:14px 0 12px}.revenue-total strong{font-size:26px;line-height:1.3;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.revenue-total span{font-size:13px;color:var(--pp-admin-muted)}
.stock-unavailable{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:12px 0 18px}.stock-unavailable>svg{color:var(--pp-admin-accent)}.stock-unavailable strong{font-size:15px;font-weight:600}.stock-unavailable p{font-size:14px;line-height:1.6;color:var(--pp-admin-muted);margin:0}
.recent-head,.recent-row{display:grid;grid-template-columns:minmax(130px,1.25fr) minmax(80px,.8fr) minmax(100px,1fr) 80px 44px;gap:12px;align-items:center}.recent-head{font-size:13px;color:var(--pp-admin-muted);padding:12px 0;border-bottom:1px solid var(--pp-admin-border)}.recent-row{font-size:14px;padding:14px 0;border-bottom:1px solid var(--pp-admin-border)}.recent-row:last-child{border-bottom:0}.recent-person{min-width:0}.recent-person strong{font-size:14px;font-weight:500;overflow-wrap:anywhere;display:block}.recent-person small,.recent-payment small{font-size:13px;color:var(--pp-admin-muted);display:block;margin-top:3px}.recent-payment{font-size:13px;overflow-wrap:anywhere;min-width:0}.recent-total{font-size:14px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}.recent-action{display:flex;justify-content:flex-end}.dashboard-badge{font-size:12px;line-height:1.4;display:inline-flex;padding:5px 7px;border-radius:6px;background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent);max-width:100%;overflow-wrap:anywhere}.dashboard-badge--confirmado{background:var(--pp-admin-bg);color:var(--pp-marrom-2)}.dashboard-badge--pronto,.dashboard-badge--retirado{background:var(--pp-admin-success-bg);color:var(--pp-admin-text)}.dashboard-badge--cancelado{background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger)}
.dashboard-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--pp-admin-muted);font-size:13px;line-height:1.5;padding:22px 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1250px){.dashboard-middle{grid-template-columns:1fr 1.2fr}.dashboard-middle>:last-child{grid-column:1/-1}.dashboard-bottom{grid-template-columns:1fr}.dashboard-header{align-items:flex-start}.dashboard-actions{max-width:290px}}
@media(max-width:767px){.dashboard-header{display:block;margin-bottom:22px}.dashboard-header h1{font-size:27px}.dashboard-actions{align-items:flex-start;margin-top:18px;max-width:none}.dashboard-kpis{grid-template-columns:repeat(2,minmax(0,1fr));padding:0;overflow:hidden;margin-bottom:20px}.dashboard-kpis>:nth-child(3){border-left:0;border-top:1px solid var(--pp-admin-border)}.dashboard-kpis>:nth-child(4){border-top:1px solid var(--pp-admin-border)}.dashboard-middle,.dashboard-bottom{grid-template-columns:1fr;gap:16px}.dashboard-middle>:last-child{grid-column:auto}.dashboard-bottom{margin-top:16px}.recent-head{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}.recent-row{grid-template-columns:minmax(0,1fr) auto;gap:9px 12px;padding:16px 0}.recent-person{grid-column:1;grid-row:1}.recent-status{grid-column:2;grid-row:1;justify-self:end}.recent-payment{grid-column:1;grid-row:2}.recent-payment small{display:inline}.recent-payment small::before{content:' / '}.recent-total{grid-column:1;grid-row:3;font-size:15px}.recent-action{grid-column:2;grid-row:2/4;align-self:end}.dashboard-footer{display:block}.dashboard-footer span{display:block}.dashboard-footer span+span{margin-top:5px}}
@media(prefers-reduced-motion:reduce){.pp-admin-dashboard *{transition:none!important;animation:none!important}}
</style>
