<template>
  <section class="admin-page kanban-page">
    <header class="kanban-header">
      <div>
        <p class="kanban-eyebrow">OPERAÇÃO DO BALCÃO</p>
        <h1>Pedidos</h1>
        <p>Acompanhe a produção por etapa, do pedido à retirada.</p>
      </div>
    </header>

    <section class="kanban-overview" aria-label="Resumo operacional">
      <div>
        <span>Em produção</span
        ><strong>{{ totalOperacao === null ? "—" : totalOperacao }}</strong
        ><small>Pedidos ativos na fila</small>
      </div>
      <div>
        <span>Prontos para retirar</span
        ><strong>{{ resumo.resumo?.prontos ?? "—" }}</strong
        ><small>Aguardando no balcão</small>
      </div>
      <div>
        <span>Mensagens novas</span
        ><strong>{{
          chat.naoLidasInicializado ? chat.naoLidas.total : "—"
        }}</strong
        ><small>Conversas com clientes</small>
      </div>
    </section>

    <div class="kanban-toolbar">
      <div
        class="kanban-modes"
        role="group"
        aria-label="Visualização de pedidos"
      >
        <button
          type="button"
          :aria-pressed="modo === 'fila'"
          :class="{ 'is-active': modo === 'fila' }"
          @click="selecionarModo('fila')"
        >
          Produção
        </button>
        <button
          type="button"
          :aria-pressed="modo === 'historico'"
          :class="{ 'is-active': modo === 'historico' }"
          @click="selecionarModo('historico')"
        >
          Histórico
        </button>
      </div>
      <div class="kanban-search" role="search">
        <Search :size="17" aria-hidden="true" />
        <input
          v-model="busca"
          type="search"
          maxlength="100"
          autocomplete="off"
          aria-label="Buscar pedido, cliente ou produto"
          placeholder="Buscar pedido, cliente ou produto"
        />
        <button
          v-if="busca"
          type="button"
          class="kanban-search-clear"
          aria-label="Limpar busca"
          @click="busca = ''"
        >
          <X :size="15" aria-hidden="true" />
        </button>
      </div>
      <AdminPaymentFilter v-model="pagamento" class="kanban-payment" />
    </div>

    <div v-if="chat.naoLidas.total > 0" class="kanban-messages" role="status">
      <MessageCircle :size="19" aria-hidden="true" />
      <div>
        <strong
          >{{ chat.naoLidas.total }}
          {{
            chat.naoLidas.total === 1
              ? "mensagem não lida"
              : "mensagens não lidas"
          }}</strong
        >
        <div class="kanban-message-links">
          <RouterLink
            v-for="id in pedidosComMensagem"
            :key="id"
            :to="{ name: 'admin-pedido-detalhes', params: { id } }"
            >Pedido #{{ id }} ({{ chat.naoLidasDoPedido(id) }})</RouterLink
          >
          <span v-if="chat.pedidosComNaoLidas > pedidosComMensagem.length"
            >e outros
            {{
              chat.pedidosComNaoLidas - pedidosComMensagem.length
            }}
            pedidos</span
          >
        </div>
      </div>
    </div>

    <div
      v-if="erroGlobal || erroAcao || resumo.erro"
      class="kanban-alert"
      role="alert"
    >
      <CircleAlert :size="18" aria-hidden="true" />
      <span>{{ erroAcao || erroGlobal || resumo.erro }}</span>
      <button type="button" @click="tentarNovamente">Tentar novamente</button>
    </div>

    <nav class="kanban-stage-tabs" aria-label="Selecionar etapa no celular">
      <button
        v-for="etapa in etapasVisiveis"
        :key="etapa.status"
        type="button"
        :class="{ 'is-current': abaMobile === etapa.status }"
        :data-status="etapa.status"
        :aria-current="abaMobile === etapa.status ? 'true' : undefined"
        @click="selecionarAba(etapa.status)"
      >
        <span>{{ etapa.titulo }}</span>
        <strong>{{ totalEtapa(etapa) }}</strong>
      </button>
    </nav>

    <Transition name="kanban-switch" mode="out-in">
      <div
        :key="modo"
        class="kanban-board"
        :class="{ 'is-history': modo === 'historico' }"
      >
        <section
          v-for="etapa in etapasVisiveis"
          :key="etapa.status"
          class="kanban-column"
          :data-status="etapa.status"
          :class="[
            'stage-' + etapa.status,
            { 'is-mobile-selected': abaMobile === etapa.status },
          ]"
          :aria-label="etapa.titulo"
          :aria-busy="carregando && !dados[etapa.status].inicializado"
        >
          <header class="kanban-column-head">
            <div class="kanban-column-title">
              <span class="kanban-stage-dot" aria-hidden="true"></span>
              <div>
                <h2>{{ etapa.titulo }}</h2>
                <p>{{ etapa.descricao }}</p>
              </div>
            </div>
            <span class="kanban-count">{{ totalEtapa(etapa) }}</span>
          </header>

          <div
            v-if="dados[etapa.status].erro"
            class="kanban-column-error"
            role="alert"
          >
            {{ dados[etapa.status].erro }}
          </div>
          <div
            v-if="
              !dados[etapa.status].inicializado && !dados[etapa.status].erro
            "
            class="kanban-placeholder"
            role="status"
          >
            Carregando pedidos…
          </div>
          <div
            v-else-if="
              dados[etapa.status].inicializado &&
              !dados[etapa.status].results.length
            "
            class="kanban-empty"
          >
            <ClipboardList :size="24" aria-hidden="true" />
            <strong>Nenhum pedido nesta etapa</strong>
            <span>{{
              filtrosAtivos
                ? "Tente ajustar os filtros."
                : "A fila está em dia."
            }}</span>
          </div>

          <div v-if="dados[etapa.status].inicializado" class="kanban-cards">
            <AdminKanbanCard
              v-for="pedido in dados[etapa.status].results"
              :key="pedido.id"
              :pedido="pedido"
              :em-acao="emAcao"
              :nao-lidas="chat.naoLidasDoPedido(pedido.id)"
              @avancar="avancar"
            />
          </div>

          <footer
            v-if="
              dados[etapa.status].inicializado &&
              dados[etapa.status].total_pages > 1
            "
            class="kanban-page-controls"
          >
            <button
              type="button"
              :disabled="paginas[etapa.status] <= 1 || carregando"
              @click="mudarPagina(etapa.status, -1)"
              aria-label="Página anterior"
            >
              Anterior
            </button>
            <span
              >Página {{ dados[etapa.status].page }} de
              {{ dados[etapa.status].total_pages }}</span
            >
            <button
              type="button"
              :disabled="!dados[etapa.status].next || carregando"
              @click="mudarPagina(etapa.status, 1)"
              aria-label="Próxima página"
            >
              Próxima
            </button>
          </footer>
        </section>
      </div>
    </Transition>

    <p class="kanban-footer">
      Os totais vêm do Django. Cada etapa apresenta até 12 pedidos por página.
      Na retirada, valide o QR Code apresentado pelo cliente.
    </p>
  </section>
</template>

<script setup>
import AdminKanbanCard from "@/components/admin/AdminKanbanCard.vue";
import {
  CircleAlert,
  ClipboardList,
  MessageCircle,
  Search,
  X,
} from "lucide-vue-next";
import AdminPaymentFilter from "@/components/admin/AdminPaymentFilter.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAdminKanban } from "@/composables/useAdminKanban";

const {
  abaMobile,
  avancar,
  busca,
  carregando,
  chat,
  dados,
  emAcao,
  erroAcao,
  erroGlobal,
  etapasVisiveis,
  filtrosAtivos,
  modo,
  mudarPagina,
  pagamento,
  paginas,
  pedidosComMensagem,
  resumo,
  selecionarAba,
  selecionarModo,
  tentarNovamente,
  totalEtapa,
  totalOperacao,
} = useAdminKanban();
</script>

<style scoped src="./AdminPedidosKanbanView.css"></style>
