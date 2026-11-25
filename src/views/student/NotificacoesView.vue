<script setup>
import { motion } from "motion-v";
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  CircleAlert,
  Search,
} from "lucide-vue-next";
import NotificationItem from "@/components/notifications/NotificationItem.vue";
import { useCentralNotificacoes } from "@/composables/useCentralNotificacoes";

const {
  acaoPendente,
  atualizando,
  atualizar,
  busca,
  concluirEntrada,
  erroAcao,
  filtradas,
  filtro,
  filtrosAtivos,
  grupos,
  limparFiltros,
  marcarLida,
  marcarTodas,
  notifications,
  novasIds,
  reduzir,
  sucesso,
  todasLidas,
} = useCentralNotificacoes();
</script>

<template>
  <div class="notifications-page">
    <motion.header
      class="notifications-page__header"
      :initial="reduzir ? false : { opacity: 0.7, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: reduzir ? 0 : 0.3, ease: 'easeOut' }"
    >
      <div>
        <h1>Notificações</h1>
        <p>Novidades dos seus pedidos, em um só lugar.</p>
      </div>
      <RouterLink :to="{ name: 'pedidos' }"
        >Ver meus pedidos <ArrowUpRight :size="18" aria-hidden="true"
      /></RouterLink>
    </motion.header>

    <div
      v-if="!notifications.inicializado && !notifications.erro"
      class="notifications-page__loading"
      role="status"
    >
      <span>Buscando suas notificações…</span>
      <div
        v-for="index in 4"
        :key="index"
        class="notifications-page__skeleton"
        aria-hidden="true"
      >
        <span />
        <div>
          <strong />
          <p />
        </div>
      </div>
    </div>
    <section
      v-else-if="notifications.erro && !notifications.inicializado"
      class="notifications-page__state"
      role="alert"
    >
      <CircleAlert :size="32" aria-hidden="true" />
      <h2>Não foi possível carregar os avisos.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" :disabled="atualizando" @click="atualizar">
        Tentar novamente
      </button>
    </section>
    <section
      v-else-if="!notifications.itens.length"
      class="notifications-page__state"
    >
      <Bell :size="36" aria-hidden="true" />
      <h2>Quando tiver novidade, ela chega aqui.</h2>
      <p>
        Atualizações dos seus pedidos e mensagens da panificadora aparecerão
        nesta lista.
      </p>
      <RouterLink :to="{ name: 'pedidos' }"
        >Ir para Meus Pedidos <ArrowUpRight :size="18" aria-hidden="true"
      /></RouterLink>
      <button
        v-if="notifications.erroAtualizacao"
        type="button"
        class="notifications-page__retry"
        @click="atualizar"
      >
        Tentar novamente
      </button>
    </section>
    <template v-else>
      <div class="notifications-page__summary">
        <p v-if="todasLidas">
          <CheckCheck :size="18" aria-hidden="true" /><span
            >O que chegou por aqui <strong>já foi lido.</strong></span
          >
        </p>
        <p v-else>
          <strong
            >{{ notifications.naoLidas }}
            {{
              notifications.naoLidas === 1 ? "não lida" : "não lidas"
            }}</strong
          >
        </p>
        <button
          type="button"
          class="notifications-page__mark-all"
          :disabled="!notifications.naoLidas || acaoPendente"
          :aria-busy="notifications.marcandoTodas"
          @click="marcarTodas"
        >
          <CheckCheck :size="17" aria-hidden="true" />{{
            notifications.marcandoTodas
              ? "Marcando todas…"
              : "Marcar todas como lidas"
          }}
        </button>
      </div>
      <div class="notifications-page__toolbar">
        <div
          class="notifications-page__filters"
          role="group"
          aria-label="Filtrar notificações"
        >
          <button
            v-for="opcao in [
              {
                valor: 'todas',
                label: 'Todas',
                quantidade: notifications.itens.length,
              },
              {
                valor: 'nao-lidas',
                label: 'Não lidas',
                quantidade: notifications.naoLidas,
              },
            ]"
            :key="opcao.valor"
            type="button"
            :aria-pressed="filtro === opcao.valor"
            @click="filtro = opcao.valor"
          >
            {{ opcao.label }} <span>{{ opcao.quantidade }}</span
            ><motion.span
              v-if="filtro === opcao.valor"
              class="notifications-page__indicator"
              layout-id="notifications-filter"
              :transition="{ duration: reduzir ? 0 : 0.22 }"
            />
          </button>
        </div>
        <label class="notifications-page__search"
          ><Search :size="18" aria-hidden="true" /><input
            v-model="busca"
            type="search"
            placeholder="Buscar aviso ou pedido"
            aria-label="Buscar notificação por texto ou pedido"
        /></label>
      </div>
      <div class="notifications-page__sync">
        <span
          >{{ filtradas.length }}
          {{ filtradas.length === 1 ? "aviso" : "avisos"
          }}<button v-if="filtrosAtivos" type="button" @click="limparFiltros">
            Limpar filtros
          </button></span
        >
        <button
          v-if="notifications.erroAtualizacao"
          type="button"
          class="notifications-page__retry"
          @click="atualizar"
        >
          Tentar novamente
        </button>
      </div>
      <p v-if="erroAcao" class="notifications-page__error" role="alert">
        {{ erroAcao }}
      </p>
      <p class="notifications-page__feedback" role="status" aria-atomic="true">
        {{ sucesso }}
      </p>

      <section v-if="!filtradas.length" class="notifications-page__state">
        <CheckCheck
          v-if="todasLidas && !busca.trim()"
          :size="32"
          aria-hidden="true"
        /><Search v-else :size="32" aria-hidden="true" />
        <h2>
          {{
            todasLidas && !busca.trim()
              ? "Tudo lido por aqui."
              : "Nenhum aviso com esse filtro."
          }}
        </h2>
        <p>
          {{
            todasLidas && !busca.trim()
              ? "Os avisos lidos continuam disponíveis na lista completa."
              : "Tente outro texto, número de pedido ou volte à lista completa."
          }}
        </p>
        <button type="button" @click="limparFiltros">
          Ver todas as notificações
        </button>
      </section>
      <motion.div
        v-else
        :key="filtro"
        class="notifications-page__groups"
        :initial="reduzir ? false : { opacity: 0.7 }"
        :animate="{ opacity: 1 }"
        :transition="{ duration: reduzir ? 0 : 0.2 }"
      >
        <section
          v-for="grupo in grupos"
          :key="grupo.chave"
          class="notifications-page__group"
          :aria-labelledby="`grupo-${grupo.chave}`"
        >
          <h2 :id="`grupo-${grupo.chave}`">
            {{ grupo.titulo }}<span>{{ grupo.itens.length }}</span>
          </h2>
          <ul class="notifications-page__list">
            <NotificationItem
              v-for="item in grupo.itens"
              :key="item.id"
              :notificacao="item"
              :animar="novasIds.has(String(item.id))"
              :processando="
                notifications.idsEmLeitura.includes(String(item.id))
              "
              :bloqueada="acaoPendente"
              @marcar-lida="marcarLida"
              @apareceu="concluirEntrada"
            />
          </ul>
        </section>
      </motion.div>
    </template>
  </div>
</template>

<style scoped src="./NotificacoesView.css"></style>
