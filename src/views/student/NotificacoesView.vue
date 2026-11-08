<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { motion, useReducedMotion } from "motion-v";
import {
  ArrowUpRight,
  Bell,
  CheckCheck,
  CircleAlert,
  RefreshCw,
  Search,
} from "lucide-vue-next";
import BaseRefreshStatus from "@/components/ui/BaseRefreshStatus.vue";
import NotificationItem from "@/components/notifications/NotificationItem.vue";
import { useNotificationsStore } from "@/stores/notifications";
import {
  agruparNotificacoes,
  filtrarNotificacoes,
} from "@/utils/notifications";

const notifications = useNotificationsStore();
const reduzir = useReducedMotion();
const filtro = ref("todas");
const busca = ref("");
const agora = ref(new Date());
const sucesso = ref("");
const erroAcao = ref("");
const novasIds = ref(new Set());
const idsVistos = new Set();
let listaInicializada = false;
let montado = true;
let timerDia;
const atualizando = computed(
  () => notifications.carregando || notifications.atualizandoSilenciosamente,
);
const acaoPendente = computed(
  () => notifications.marcandoTodas || notifications.idsEmLeitura.length > 0,
);
const filtradas = computed(() =>
  filtrarNotificacoes(notifications.itens, filtro.value, busca.value),
);
const grupos = computed(() =>
  agruparNotificacoes(filtradas.value, agora.value),
);
const filtrosAtivos = computed(
  () => filtro.value !== "todas" || busca.value.trim(),
);
const todasLidas = computed(
  () =>
    notifications.inicializado &&
    notifications.itens.length > 0 &&
    notifications.naoLidas === 0,
);

// O StudentLayout mantém as notificações atualizadas; esta tela só exibe o estado.
// Este relógio apenas troca Hoje/Ontem na meia-noite local, sem consultar a API.
function atualizarCalendario() {
  agora.value = new Date();
  clearTimeout(timerDia);
  const dia = agora.value;
  const proximo = new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate() + 1,
  );
  timerDia = setTimeout(
    atualizarCalendario,
    proximo.getTime() - dia.getTime() + 50,
  );
}
function aoRetomar() {
  if (document.visibilityState !== "hidden") atualizarCalendario();
}
onMounted(() => {
  atualizarCalendario();
  document.addEventListener("visibilitychange", aoRetomar);
});
onBeforeUnmount(() => {
  montado = false;
  clearTimeout(timerDia);
  document.removeEventListener("visibilitychange", aoRetomar);
});

watch(
  () => notifications.itens,
  (itens) => {
    const novas = listaInicializada
      ? itens
          .filter((item) => !idsVistos.has(String(item.id)))
          .map((item) => String(item.id))
      : [];
    itens.forEach((item) => idsVistos.add(String(item.id)));
    novasIds.value = new Set(novas);
    if (notifications.inicializado) listaInicializada = true;
  },
  { immediate: true },
);
function concluirEntrada(id) {
  if (!novasIds.value.has(String(id))) return;
  const restantes = new Set(novasIds.value);
  restantes.delete(String(id));
  novasIds.value = restantes;
}
function limparFiltros() {
  busca.value = "";
  filtro.value = "todas";
}
async function atualizar() {
  try {
    await notifications.atualizarAgora();
  } catch {
    /* O estado de erro já aparece na tela. */
  }
}

async function recuperarFoco(origem, id) {
  await nextTick();
  // Não roubar foco de quem já continuou a navegar durante a requisição.
  if (
    !montado ||
    origem?.isConnected ||
    document.activeElement !== document.body
  )
    return;
  const item = document.getElementById(`notificacao-${id}`);
  const alvo =
    item?.querySelector("a, button:not([disabled])") ||
    item ||
    document.querySelector(
      '.notifications-page__filters button[aria-pressed="true"]',
    );
  alvo?.focus({ preventScroll: true });
}
async function marcarLida(id) {
  if (acaoPendente.value) return;
  const origem = document.activeElement;
  erroAcao.value = "";
  sucesso.value = "";
  try {
    const confirmada = await notifications.marcarLida(id);
    if (montado && confirmada) {
      sucesso.value = "Notificação marcada como lida.";
      await recuperarFoco(origem, id);
    }
  } catch {
    if (montado)
      erroAcao.value =
        "Não foi possível marcar esta notificação como lida. Ela continua não lida. Tente novamente.";
  }
}
async function marcarTodas() {
  if (acaoPendente.value || !notifications.naoLidas) return;
  const origem = document.activeElement;
  erroAcao.value = "";
  sucesso.value = "";
  try {
    const confirmadas = await notifications.marcarTodasLidas();
    if (montado && confirmadas) {
      sucesso.value = notifications.naoLidas
        ? "Leitura confirmada. Novos avisos continuam não lidos."
        : "Notificações marcadas como lidas.";
      await recuperarFoco(origem);
    }
  } catch {
    if (montado)
      erroAcao.value =
        "Não foi possível marcar todas como lidas. Os avisos foram mantidos. Tente novamente.";
  }
}
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
        >Ir para Meus Pedidos
        <ArrowUpRight :size="18" aria-hidden="true" /></RouterLink
      ><button
        type="button"
        class="notifications-page__empty-refresh"
        :disabled="atualizando"
        @click="atualizar"
      >
        {{ atualizando ? "Atualizando…" : "Atualizar notificações" }}</button
      ><BaseRefreshStatus
        :ultima-atualizacao="notifications.ultimaAtualizacao"
        :atualizando="atualizando"
        :erro="notifications.erroAtualizacao"
      />
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
        <div>
          <BaseRefreshStatus
            :ultima-atualizacao="notifications.ultimaAtualizacao"
            :atualizando="atualizando"
            :erro="notifications.erroAtualizacao"
          /><button
            type="button"
            :disabled="atualizando"
            class="notifications-page__refresh"
            aria-label="Atualizar notificações"
            @click="atualizar"
          >
            <RefreshCw :size="17" aria-hidden="true" />
          </button>
        </div>
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

<style scoped>
.notifications-page {
  width: min(100%, 1040px);
  margin: 12px auto 0;
  padding-bottom: 72px;
  color: var(--pp-marrom);
}
.notifications-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
}
.notifications-page__header h1 {
  margin: 0 0 10px;
  font: 400 clamp(46px, 5vw, 64px)/1.12 var(--pp-font-titulo);
  letter-spacing: -0.025em;
}
.notifications-page__header p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--pp-texto-2);
}
.notifications-page__header a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pp-marrom);
  text-decoration: underline;
  text-underline-offset: 5px;
}
.notifications-page__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 24px;
  padding: 8px 0;
  border-top: 1px solid var(--pp-creme-borda);
}
.notifications-page__summary p {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--pp-texto-2);
}
.notifications-page__summary strong {
  color: var(--pp-marrom);
  font-weight: 650;
}
.notifications-page__mark-all {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pp-marrom);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.notifications-page__mark-all:disabled {
  color: var(--pp-texto-3);
  cursor: default;
}
.notifications-page__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin-top: 8px;
}
.notifications-page__filters {
  display: flex;
  gap: 28px;
}
.notifications-page__filters button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 0 8px;
  border: 0;
  background: transparent;
  color: var(--pp-texto-2);
  font-size: 13px;
  cursor: pointer;
}
.notifications-page__filters button[aria-pressed="true"] {
  color: var(--pp-marrom);
  font-weight: 700;
}
.notifications-page__filters button > span:not(.notifications-page__indicator) {
  font-size: 11px;
  font-weight: 500;
}
.notifications-page__indicator {
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  background: var(--pp-gold);
}
.notifications-page__search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 280px;
  min-height: 44px;
  border-bottom: 1px solid var(--pp-creme-borda);
  color: var(--pp-texto-2);
}
.notifications-page__search input {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  outline: none;
  color: var(--pp-marrom);
  font-size: 14px;
}
.notifications-page__search input::placeholder {
  color: var(--pp-texto-3);
}
.notifications-page__search:focus-within {
  outline: 2px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.notifications-page__sync {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  color: var(--pp-texto-3);
  font-size: 12px;
}
.notifications-page :deep(.pp-refresh-status) {
  opacity: 1;
}
.notifications-page :deep(.pp-refresh-status.is-error) {
  color: var(--student-danger);
}
.notifications-page__sync > span,
.notifications-page__sync > div {
  display: flex;
  align-items: center;
  gap: 14px;
}
.notifications-page__sync button {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pp-texto-2);
  cursor: pointer;
}
.notifications-page__sync > span button {
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 12px;
}
.notifications-page__sync .notifications-page__refresh {
  min-width: 44px;
  display: grid;
  place-items: center;
}
.notifications-page__feedback,
.notifications-page__error {
  margin: 0;
  color: var(--pp-marrom);
  font-size: 13px;
  line-height: 1.6;
}
.notifications-page__feedback:not(:empty),
.notifications-page__error {
  padding: 12px 0;
}
.notifications-page__error {
  color: var(--student-danger);
}
.notifications-page__group {
  margin-top: 28px;
}
.notifications-page__group:first-child {
  margin-top: 0;
}
.notifications-page__group > h2 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--pp-creme-borda);
  color: var(--pp-marrom);
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0;
}
.notifications-page__group > h2 span {
  font-size: 11px;
  color: var(--pp-texto-3);
  font-weight: 500;
}
.notifications-page__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.notifications-page__state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  padding: 48px 0 72px;
  max-width: 60ch;
}
.notifications-page__state h2 {
  margin: 0;
  font: 400 clamp(30px, 4vw, 40px)/1.2 var(--pp-font-titulo);
  letter-spacing: -0.02em;
}
.notifications-page__state p {
  margin: 0;
  color: var(--pp-texto-2);
  font-size: 15px;
  line-height: 1.7;
}
.notifications-page__state :is(a, button) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 12px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.notifications-page__state .notifications-page__empty-refresh {
  color: var(--pp-marrom);
  background: transparent;
  border: 1px solid var(--pp-creme-borda);
}
.notifications-page__loading {
  color: var(--pp-texto-2);
  font-size: 14px;
  padding-top: 18px;
}
.notifications-page__skeleton {
  display: flex;
  gap: 20px;
  min-height: 120px;
  padding: 24px 16px;
  border-bottom: 1px solid var(--pp-creme-borda);
}
.notifications-page__skeleton > span {
  width: 24px;
  height: 24px;
  background: var(--pp-creme-3);
  border-radius: 50%;
}
.notifications-page__skeleton > div {
  flex: 1;
}
.notifications-page__skeleton strong,
.notifications-page__skeleton p {
  display: block;
  height: 16px;
  background: var(--pp-creme-2);
  width: min(65%, 340px);
  margin: 0 0 14px;
}
.notifications-page__skeleton p {
  width: 90%;
}
.notifications-page :is(a, button):focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (max-width: 760px) {
  .notifications-page__header a {
    display: none;
  }
  .notifications-page {
    margin-top: 0;
  }
  .notifications-page__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding-bottom: 20px;
  }
  .notifications-page__header h1 {
    font-size: 48px;
  }
  .notifications-page__toolbar {
    gap: 8px;
  }
  .notifications-page__search {
    width: 100%;
  }
  .notifications-page__summary {
    padding: 8px 0;
    gap: 8px;
  }
}
@media (max-width: 390px) {
  .notifications-page__header h1 {
    font-size: 44px;
  }
  .notifications-page__header p {
    font-size: 14px;
  }
  .notifications-page__sync {
    flex-wrap: wrap;
    gap: 0;
    padding: 4px 0;
  }
  .notifications-page__sync > div {
    margin-left: auto;
    gap: 4px;
  }
  .notifications-page__sync > span {
    min-height: 30px;
  }
}
</style>
