<template>
  <AuthLayout :back-to="{ name: 'recuperar-senha' }" back-label="Solicitar outro código">
    <template #heading>
      <h1>Defina uma <span>nova senha</span></h1>
      <p v-if="pendencia">
        Digite o código enviado para {{ pendencia.email }} e escolha sua nova senha.
      </p>
      <p v-else>
        Para redefinir sua senha, solicite primeiro um código de recuperação.
      </p>
    </template>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <div v-if="mensagem" class="auth-alert auth-alert--info" role="status">
      {{ mensagem }}
    </div>

    <form v-if="pendencia?.requestId" class="auth-form" novalidate @submit.prevent="handleSubmit">
      <BaseInput
        :model-value="form.code"
        label="Código de recuperação"
        placeholder="000000"
        :icon="KeyRound"
        :error="erros.code"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        name="reset-code"
        @update:model-value="form.code = somenteDigitos($event)"
      />

      <BaseInput
        v-model="form.newPassword"
        label="Nova senha"
        type="password"
        placeholder="Crie uma nova senha"
        :icon="Lock"
        :error="erros.newPassword"
        autocomplete="new-password"
        name="new-password"
      />

      <BaseInput
        v-model="form.confirmPassword"
        label="Confirmar nova senha"
        type="password"
        placeholder="Repita a nova senha"
        :icon="Lock"
        :error="erros.confirmPassword"
        autocomplete="new-password"
        name="confirm-new-password"
      />

      <BaseButton
        type="submit"
        block
        :icon="Save"
        :loading="auth.carregando"
        loading-text="Redefinindo..."
      >
        Redefinir senha
      </BaseButton>

      <button
        type="button"
        class="auth-resend"
        :disabled="segundosRestantes > 0 || auth.carregando"
        @click="reenviarCodigo"
      >
        {{ segundosRestantes > 0 ? `Reenviar em ${segundosRestantes}s` : 'Reenviar código' }}
      </button>
    </form>

    <div v-else class="auth-actions-stack">
      <div class="auth-alert auth-alert--info">
        Não encontramos uma solicitação de recuperação ativa neste navegador.
      </div>
      <BaseButton block :icon="Mail" @click="router.push({ name: 'recuperar-senha' })">
        Solicitar código
      </BaseButton>
    </div>
  </AuthLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { KeyRound, Lock, Mail, Save } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const pendencia = ref(auth.obterRedefinicaoPendente())
const form = reactive({ code: '', newPassword: '', confirmPassword: '' })
const erros = reactive({ code: '', newPassword: '', confirmPassword: '' })
const erroGeral = ref('')
const mensagem = ref('')
const agora = ref(Date.now())
let timerId = null

const segundosRestantes = computed(() => {
  const solicitadoEm = Number(pendencia.value?.requestedAt || 0)
  const cooldown = Number(pendencia.value?.retryAfterSeconds || 0) * 1000
  return Math.max(0, Math.ceil((solicitadoEm + cooldown - agora.value) / 1000))
})

function validarFormulario() {
  erros.code = /^\d{6}$/.test(form.code) ? '' : 'Digite o código de 6 dígitos.'
  erros.newPassword = form.newPassword.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'
  erros.confirmPassword =
    form.confirmPassword && form.confirmPassword === form.newPassword
      ? ''
      : 'As senhas não coincidem.'

  return !Object.values(erros).some(Boolean)
}

async function handleSubmit() {
  erroGeral.value = ''

  if (!validarFormulario()) return

  const resultado = await auth.redefinirSenha({
    code: form.code,
    newPassword: form.newPassword,
  })

  if (!resultado.ok) {
    erroGeral.value = resultado.erro

    if (resultado.campos.new_password) {
      erros.newPassword = resultado.campos.new_password
    }

    return
  }

  await router.replace({ name: 'login', query: { senhaRedefinida: '1' } })
}

async function reenviarCodigo() {
  if (!pendencia.value?.email || segundosRestantes.value > 0) return

  erroGeral.value = ''
  mensagem.value = ''

  const resultado = await auth.solicitarRedefinicaoSenha(pendencia.value.email)

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    return
  }

  pendencia.value = auth.obterRedefinicaoPendente()
  mensagem.value = resultado.data.message
  agora.value = Date.now()
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 6)
}

onMounted(() => {
  timerId = window.setInterval(() => {
    agora.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => window.clearInterval(timerId))
</script>
