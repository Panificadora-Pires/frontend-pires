<template>
  <AuthLayout :back-to="{ name: 'login' }" back-label="Voltar para o login">
    <template #heading>
      <h1>Recupere sua <span>senha</span></h1>
      <p>Informe o e-mail da sua conta. Enviaremos um código para redefinir sua senha.</p>
    </template>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <BaseInput
        v-model="email"
        label="E-mail"
        type="email"
        placeholder="Digite seu e-mail"
        :icon="Mail"
        :error="erroEmail"
        autocomplete="email"
        inputmode="email"
        name="email"
      />

      <p class="auth-small">
        Por segurança, a resposta será a mesma mesmo que o endereço não esteja cadastrado.
      </p>

      <BaseButton
        type="submit"
        block
        :icon="Send"
        :loading="auth.carregando"
        loading-text="Enviando..."
      >
        Enviar código
      </BaseButton>
    </form>

    <p class="auth-footer">
      Lembrou sua senha?
      <RouterLink :to="{ name: 'login' }" class="auth-link">Voltar ao login</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { Mail, Send } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const erroEmail = ref('')
const erroGeral = ref('')

async function handleSubmit() {
  erroEmail.value = ''
  erroGeral.value = ''

  if (!EMAIL_REGEX.test(email.value.trim())) {
    erroEmail.value = 'Informe um e-mail válido.'
    return
  }

  const resultado = await auth.solicitarRedefinicaoSenha(email.value)

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    return
  }

  await router.push({ name: 'redefinir-senha' })
}
</script>
