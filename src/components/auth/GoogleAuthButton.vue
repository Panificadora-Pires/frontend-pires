<template>
  <div ref="container" class="google-auth">
    <div v-if="!clientId" class="google-auth__unavailable" role="status">
      Login com Google não configurado neste ambiente.
    </div>

    <div v-else class="google-auth__button" :class="{ 'is-loading': loading }">
      <div ref="buttonHost" class="google-auth__host" />

      <div v-if="loading" class="google-auth__loading" aria-label="Entrando com Google">
        <span class="google-auth__spinner" />
      </div>
    </div>

    <p v-if="erroLocal" class="google-auth__error" role="alert">
      {{ erroLocal }}
    </p>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  clearGoogleCredentialHandler,
  renderGoogleButton,
} from '@/services/google-identity'

const props = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['credential', 'error'])

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''
const container = ref(null)
const buttonHost = ref(null)
const erroLocal = ref('')

let resizeObserver = null
let lastRenderedWidth = 0
let renderSequence = 0

function handleCredential(response) {
  erroLocal.value = ''

  if (!response?.credential) {
    handleError('O Google não retornou uma credencial de autenticação.')
    return
  }

  emit('credential', response.credential)
}

function handleError(message = 'Não foi possível carregar o login com Google.') {
  erroLocal.value = message
  emit('error', message)
}

async function renderizarBotao({ force = false } = {}) {
  if (!clientId || !container.value || !buttonHost.value) return

  const width = Math.max(220, Math.min(400, Math.floor(container.value.clientWidth)))

  if (!force && Math.abs(width - lastRenderedWidth) < 8) {
    return
  }

  const sequence = ++renderSequence

  try {
    await renderGoogleButton({
      element: buttonHost.value,
      clientId,
      onCredential: handleCredential,
      width,
    })

    if (sequence === renderSequence) {
      lastRenderedWidth = width
      erroLocal.value = ''
    }
  } catch (error) {
    if (sequence === renderSequence) {
      handleError(error instanceof Error ? error.message : undefined)
    }
  }
}

onMounted(async () => {
  await nextTick()
  await renderizarBotao({ force: true })

  if ('ResizeObserver' in window && container.value) {
    resizeObserver = new ResizeObserver(() => {
      void renderizarBotao()
    })
    resizeObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  renderSequence += 1
  resizeObserver?.disconnect()
  clearGoogleCredentialHandler(handleCredential)
})
</script>

<style scoped>
.google-auth {
  width: 100%;
}

.google-auth__button {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 44px;
}

.google-auth__button.is-loading {
  pointer-events: none;
}

.google-auth__host {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 44px;
}

.google-auth__loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgba(36, 17, 8, 0.72);
}

.google-auth__spinner {
  width: 19px;
  height: 19px;
  border: 2px solid var(--pp-cream-dim);
  border-right-color: transparent;
  border-radius: 50%;
  animation: google-spin 650ms linear infinite;
}

.google-auth__unavailable,
.google-auth__error {
  margin: 0;
  color: var(--pp-cream-faint);
  font-size: 12px;
  text-align: center;
}

.google-auth__unavailable {
  padding: 12px;
  border: 1px dashed var(--pp-border-soft);
  border-radius: 8px;
}

.google-auth__error {
  margin-top: 8px;
  color: var(--pp-error);
}

@keyframes google-spin {
  to { transform: rotate(360deg); }
}
</style>
