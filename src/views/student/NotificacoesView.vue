<template>
  <div class="notifications-page">
    <header class="notifications-page__header">
      <div>
        <span class="notifications-page__eyebrow"></span>
        <h1>Notificações</h1>
        <p>Atualizações de pedidos e avisos da sua conta.</p>
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
            : 'Nenhuma notificação não lida'
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
.notifications-page{width:min(100%,900px);margin:0 auto;color:var(--student-text)}.notifications-page__header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.notifications-page__eyebrow{display:none}.notifications-page__header h1{margin:0;font-size:30px}.notifications-page__header p{margin:6px 0 0;color:var(--student-muted);font-size:13px}.notifications-page__mark-all{min-height:36px;display:flex;align-items:center;gap:6px;padding:0 10px;border:1px solid var(--student-border);border-radius:7px;background:#fff;color:#615850;font-size:10px;font-weight:700}.notifications-page__toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.notifications-page__tabs{display:flex;gap:4px;padding:3px;border:1px solid var(--student-border);border-radius:8px;background:#fff}.notifications-page__tabs button{min-height:31px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:#756d65;font-size:10px;font-weight:700}.notifications-page__tabs button.is-active{background:#2a211b;color:#fff}.notifications-page__tabs span{margin-left:4px;opacity:.7}.notifications-page__refresh{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--student-border);border-radius:8px;background:#fff;color:#716960}.notifications-page__groups{display:grid;gap:18px}.notifications-page__group-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}.notifications-page__group-title h2{margin:0;color:#5b544d;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.notifications-page__group-title span{color:var(--student-muted);font-size:9px}.notifications-page__list{overflow:hidden;border:1px solid var(--student-border);border-radius:10px;background:#fff}.notification-card{border-bottom:1px solid var(--student-border)}.notification-card:last-child{border-bottom:0}.notification-card.is-unread{background:#fffaf1}.notification-card__main{width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) 20px;align-items:center;gap:11px;padding:13px 14px;border:0;background:transparent;text-align:left;color:inherit;cursor:pointer}.notification-card__icon{width:34px;height:34px;display:grid;place-items:center;border-radius:7px;background:#f1eee9;color:#746354}.notification-card.is-unread .notification-card__icon{background:#faedcf;color:#875c1c}.notification-card__content{min-width:0}.notification-card__title-row{display:flex;align-items:center;gap:7px}.notification-card__title-row strong{font-size:11px}.notification-card__dot{padding:2px 5px;border-radius:4px;background:#9b681c;color:#fff;font-size:7px;font-weight:800;text-transform:uppercase}.notification-card__message{display:block;margin-top:4px;color:var(--student-muted);font-size:10px;line-height:1.45}.notification-card__time{display:flex;align-items:center;gap:4px;margin-top:6px;color:#9b938b;font-size:8px}.notification-card__read,.notification-card__arrow{color:#a19890}.notifications-page__state{min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;border:1px solid var(--student-border);border-radius:10px;background:#fff}.notifications-page__state-icon{width:50px;height:50px;display:grid;place-items:center;margin-bottom:12px;border-radius:50%;background:#f2eee8;color:#82602c}.notifications-page__state h2{margin:0;font-size:17px}.notifications-page__state p{max-width:520px;margin:6px 0 14px;color:var(--student-muted);font-size:11px}.notifications-page__state button{min-height:36px;padding:0 12px;border:1px solid var(--student-border-strong);border-radius:7px;background:#fff;font-size:10px;font-weight:700}.notifications-page__skeleton{min-height:70px;display:grid;grid-template-columns:34px 1fr;gap:11px;padding:13px;border-bottom:1px solid var(--student-border)}.notifications-page__spinner,.is-spinning{animation:notif-spin .7s linear infinite}@keyframes notif-spin{to{transform:rotate(360deg)}}@media(max-width:700px){.notifications-page__header{align-items:flex-start;flex-direction:column}.notifications-page__header h1{font-size:25px}.notifications-page__mark-all{width:100%;justify-content:center}.notifications-page__toolbar{align-items:stretch}.notifications-page__tabs{flex:1}.notifications-page__tabs button{flex:1}.notification-card__main{grid-template-columns:32px minmax(0,1fr) 16px;padding:12px 10px}.notification-card__icon{width:32px;height:32px}.notification-card__title-row{align-items:flex-start;flex-direction:column;gap:4px}}
</style>
