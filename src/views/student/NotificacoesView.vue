<template>
  <div class="notifications-page">
    <header class="notifications-page__header">
      <div>
        <span class="notifications-page__eyebrow">Central de avisos</span>
        <h1>Notificações</h1>
        <p>Acompanhe atualizações importantes sobre seus pedidos.</p>
      </div>

      <button
        v-if="notifications.naoLidas"
        type="button"
        class="notifications-page__mark-all"
        :disabled="marcandoTodas"
        @click="marcarTodas"
      >
        <LoaderCircle
          v-if="marcandoTodas"
          :size="17"
          class="notifications-page__spinner"
        />
        <CheckCheck v-else :size="17" />
        Marcar todas como lidas
      </button>
    </header>

    <div class="notifications-page__toolbar">
      <div class="notifications-page__tabs" role="tablist" aria-label="Filtrar notificações">
        <button
          type="button"
          role="tab"
          :aria-selected="filtro === 'todas'"
          :class="{ 'is-active': filtro === 'todas' }"
          @click="filtro = 'todas'"
        >
          Todas
          <span v-if="notifications.itens.length">
            {{ notifications.itens.length }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="filtro === 'nao-lidas'"
          :class="{ 'is-active': filtro === 'nao-lidas' }"
          @click="filtro = 'nao-lidas'"
        >
          Não lidas
          <span v-if="notifications.naoLidas">
            {{ notifications.naoLidas }}
          </span>
        </button>
      </div>

      <button
        type="button"
        class="notifications-page__refresh"
        :disabled="notifications.carregando"
        aria-label="Atualizar notificações"
        title="Atualizar"
        @click="atualizar"
      >
        <RefreshCw
          :size="17"
          :class="{ 'is-spinning': notifications.carregando }"
        />
      </button>
    </div>

    <div
      v-if="notifications.carregando && !notifications.inicializado"
      class="notifications-page__list"
      aria-label="Carregando notificações"
    >
      <div
        v-for="index in 5"
        :key="index"
        class="notifications-page__skeleton"
        aria-hidden="true"
      >
        <span />
        <div>
          <strong />
          <p />
          <small />
        </div>
      </div>
    </div>

    <section
      v-else-if="notifications.erro && !notifications.inicializado"
      class="notifications-page__state notifications-page__state--error"
      role="alert"
    >
      <span class="notifications-page__state-icon">
        <CircleAlert :size="30" />
      </span>
      <h2>Não conseguimos carregar suas notificações.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button type="button" @click="atualizar">Tentar novamente</button>
    </section>

    <section
      v-else-if="!notificacoesFiltradas.length"
      class="notifications-page__state"
    >
      <span class="notifications-page__state-icon">
        <BellOff v-if="filtro === 'todas'" :size="30" />
        <CheckCheck v-else :size="30" />
      </span>
      <h2>
        {{
          filtro === 'todas'
            ? 'Nenhuma notificação por enquanto'
            : 'Tudo em dia por aqui'
        }}
      </h2>
      <p>
        {{
          filtro === 'todas'
            ? 'Quando houver uma atualização importante sobre seus pedidos, ela aparecerá aqui.'
            : 'Você não possui notificações não lidas.'
        }}
      </p>
    </section>

    <div v-else class="notifications-page__groups">
      <section
        v-for="grupo in grupos"
        :key="grupo.chave"
        class="notifications-page__group"
      >
        <div class="notifications-page__group-title">
          <h2>{{ grupo.titulo }}</h2>
          <span>{{ grupo.itens.length }}</span>
        </div>

        <div class="notifications-page__list">
          <article
            v-for="notificacao in grupo.itens"
            :key="notificacao.id"
            class="notification-card"
            :class="{ 'is-unread': !notificacao.lida }"
          >
            <button
              type="button"
              class="notification-card__main"
              :disabled="processandoId === notificacao.id"
              @click="marcarLida(notificacao)"
            >
              <span class="notification-card__icon">
                <PackageCheck v-if="notificacao.pedido" :size="21" />
                <BellRing v-else :size="21" />
              </span>

              <span class="notification-card__content">
                <span class="notification-card__title-row">
                  <strong>{{ tituloNotificacao(notificacao) }}</strong>
                  <span v-if="!notificacao.lida" class="notification-card__dot">
                    Nova
                  </span>
                </span>

                <span class="notification-card__message">
                  {{ notificacao.mensagem }}
                </span>

                <span class="notification-card__time">
                  <Clock3 :size="13" />
                  {{ formatarMomento(notificacao.criada_em) }}
                </span>
              </span>

              <LoaderCircle
                v-if="processandoId === notificacao.id"
                :size="18"
                class="notifications-page__spinner"
              />
              <Check
                v-else-if="notificacao.lida"
                :size="18"
                class="notification-card__read"
              />
              <ChevronRight
                v-else
                :size="18"
                class="notification-card__arrow"
              />
            </button>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
} from 'lucide-vue-next'

import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()

const filtro = ref('todas')
const processandoId = ref(null)
const marcandoTodas = ref(false)

const notificacoesFiltradas = computed(() => {
  if (filtro.value === 'nao-lidas') {
    return notifications.itens.filter((item) => !item.lida)
  }

  return notifications.itens
})

const grupos = computed(() => {
  const mapa = new Map()

  for (const item of notificacoesFiltradas.value) {
    const data = new Date(item.criada_em)
    const chave = chaveData(data)
    const titulo = tituloData(data)

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        titulo,
        itens: [],
      })
    }

    mapa.get(chave).itens.push(item)
  }

  return [...mapa.values()]
})

function chaveData(data) {
  if (Number.isNaN(data.getTime())) return 'sem-data'

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, '0'),
    String(data.getDate()).padStart(2, '0'),
  ].join('-')
}

function inicioDoDia(data = new Date()) {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
  )
}

function tituloData(data) {
  if (Number.isNaN(data.getTime())) return 'Anteriores'

  const hoje = inicioDoDia()
  const dia = inicioDoDia(data)
  const diferenca =
    Math.round((hoje.getTime() - dia.getTime()) / 86_400_000)

  if (diferenca === 0) return 'Hoje'
  if (diferenca === 1) return 'Ontem'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year:
      data.getFullYear() === hoje.getFullYear()
        ? undefined
        : 'numeric',
  }).format(data)
}

function tituloNotificacao(notificacao) {
  if (notificacao?.pedido) {
    return `Pedido #${notificacao.pedido} pronto`
  }

  return 'Atualização da Pires'
}

function formatarMomento(valor) {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Agora'

  const agora = new Date()
  const diferencaMs = agora.getTime() - data.getTime()
  const minutos = Math.floor(diferencaMs / 60_000)

  if (minutos >= 0 && minutos < 1) return 'Agora'
  if (minutos >= 1 && minutos < 60) {
    return `Há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  }

  const horas = Math.floor(minutos / 60)
  if (horas < 24 && chaveData(data) === chaveData(agora)) {
    return `Há ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data)
}

async function atualizar() {
  try {
    await notifications.carregar({ force: true })
  } catch {
    // A store já mantém o erro.
  }
}

async function marcarLida(notificacao) {
  if (!notificacao || notificacao.lida || processandoId.value) return

  processandoId.value = notificacao.id
  try {
    await notifications.marcarLida(notificacao.id)
  } catch {
    // Mantém o item como não lido.
  } finally {
    processandoId.value = null
  }
}

async function marcarTodas() {
  if (!notifications.naoLidas || marcandoTodas.value) return

  marcandoTodas.value = true
  try {
    await notifications.marcarTodasLidas()
  } catch {
    // Mantém o estado atual em caso de erro.
  } finally {
    marcandoTodas.value = false
  }
}

onMounted(() => {
  notifications.carregar({
    force: !notifications.inicializado,
  }).catch(() => {})
})
</script>

<style scoped>
.notifications-page {
  width: min(100%, 1080px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.notifications-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.notifications-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7c14;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.notifications-page__header h1 {
  margin: 0;
  color: #241e19;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.notifications-page__header p {
  margin: 8px 0 0;
  color: #746b63;
  font-size: 13px;
}

.notifications-page__mark-all {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid rgba(185, 109, 37, 0.15);
  border-radius: 13px;
  background: #fff7ed;
  color: #a96120;
  font-weight: 700;
  cursor: pointer;
}

.notifications-page__mark-all:disabled {
  opacity: 0.65;
  cursor: wait;
}

.notifications-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.notifications-page__tabs {
  display: inline-flex;
  padding: 4px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 14px;
  background: #fff;
}

.notifications-page__tabs button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #7f756c;
  font-weight: 700;
  cursor: pointer;
}

.notifications-page__tabs button.is-active {
  background: #2d2018;
  color: #fff9f1;
}

.notifications-page__tabs span {
  min-width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  padding-inline: 5px;
  border-radius: 999px;
  background: rgba(224, 168, 62, 0.16);
  color: #c18825;
  font-size: 10px;
}

.notifications-page__tabs button.is-active span {
  background: rgba(255, 255, 255, 0.14);
  color: #fff1d4;
}

.notifications-page__refresh {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(44, 28, 17, 0.08);
  border-radius: 13px;
  background: #fff;
  color: #766c63;
  cursor: pointer;
}

.notifications-page__group {
  margin-bottom: 24px;
}

.notifications-page__group-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.notifications-page__group-title h2 {
  margin: 0;
  color: #5f554c;
  font-size: 12px;
  font-weight: 800;
}

.notifications-page__group-title span {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #ece6e0;
  color: #8b8178;
  font-size: 9px;
  font-weight: 800;
}

.notifications-page__list {
  display: grid;
  gap: 9px;
}

.notification-card {
  overflow: hidden;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 17px;
  background: #fff;
  transition: border-color 160ms ease, background 160ms ease;
}

.notification-card.is-unread {
  border-color: rgba(224, 168, 62, 0.26);
  background:
    linear-gradient(90deg, rgba(224, 168, 62, 0.07), transparent 28%),
    #fff;
}

.notification-card__main {
  width: 100%;
  min-height: 98px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notification-card__main:disabled {
  cursor: wait;
}

.notification-card__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: #f5efe9;
  color: #c88c27;
}

.notification-card.is-unread .notification-card__icon {
  background: #fff0d9;
  color: #b66d1c;
}

.notification-card__content {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.notification-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-card__title-row strong {
  color: #2d2722;
  font-size: 13px;
}

.notification-card__dot {
  min-height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 999px;
  background: #f7dfb4;
  color: #9f5c15;
  font-size: 8px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notification-card__message {
  overflow: hidden;
  color: #776d64;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
}

.notification-card__time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a0968d;
  font-size: 10px;
}

.notification-card__arrow,
.notification-card__read {
  color: #aaa096;
}

.notification-card__read {
  color: #7aa077;
}

.notifications-page__state {
  min-height: 380px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 42px 20px;
  border: 1px solid rgba(44, 28, 17, 0.07);
  border-radius: 22px;
  background: #fff;
  text-align: center;
}

.notifications-page__state-icon {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 22px;
  background: #f7f2ec;
  color: #c7902c;
}

.notifications-page__state h2 {
  margin: 0;
  color: #2b251f;
  font-size: 20px;
}

.notifications-page__state p {
  width: min(100%, 430px);
  margin: 8px 0 20px;
  color: #82786f;
  font-size: 13px;
  line-height: 1.55;
}

.notifications-page__state button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--pp-gradient-gold);
  color: #2c1a0e;
  font-weight: 750;
  cursor: pointer;
}

.notifications-page__state--error .notifications-page__state-icon {
  background: var(--pp-error-bg);
  color: var(--pp-error);
}

.notifications-page__skeleton {
  min-height: 98px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 17px;
  background: #fff;
}

.notifications-page__skeleton > span,
.notifications-page__skeleton strong,
.notifications-page__skeleton p,
.notifications-page__skeleton small {
  display: block;
  border-radius: 10px;
  background: linear-gradient(
    100deg,
    #f0ece8 20%,
    #faf8f6 45%,
    #f0ece8 70%
  );
  background-size: 200% 100%;
  animation: notifications-shimmer 1.4s linear infinite;
}

.notifications-page__skeleton > span {
  width: 48px;
  height: 48px;
}

.notifications-page__skeleton strong {
  width: 34%;
  height: 12px;
}

.notifications-page__skeleton p {
  width: 78%;
  height: 11px;
  margin: 9px 0;
}

.notifications-page__skeleton small {
  width: 18%;
  height: 9px;
}

.notifications-page__spinner,
.is-spinning {
  animation: notifications-spin 800ms linear infinite;
}

@keyframes notifications-spin {
  to { transform: rotate(360deg); }
}

@keyframes notifications-shimmer {
  to { background-position-x: -200%; }
}

@media (max-width: 680px) {
  .notifications-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 18px;
  }

  .notifications-page__header h1 {
    font-size: 30px;
  }

  .notifications-page__header p {
    max-width: 280px;
    font-size: 11px;
    line-height: 1.45;
  }

  .notifications-page__mark-all {
    width: 100%;
    justify-content: center;
  }

  .notifications-page__toolbar {
    margin-bottom: 14px;
  }

  .notifications-page__tabs {
    flex: 1;
  }

  .notifications-page__tabs button {
    flex: 1;
    justify-content: center;
    padding-inline: 10px;
  }

  .notification-card__main {
    min-height: 108px;
    gap: 11px;
    padding: 14px;
  }

  .notification-card__icon {
    width: 42px;
    height: 42px;
    border-radius: 13px;
  }

  .notification-card__title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .notification-card__message {
    display: -webkit-box;
    font-size: 11px;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .notifications-page__state {
    min-height: 420px;
  }
}
</style>
