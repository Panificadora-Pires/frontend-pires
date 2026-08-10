<template>
  <AuthLayout
    wide
    promo-mode="register"
    :back-to="{ name: 'login' }"
    back-label="Voltar para o login"
  >
    <template #heading>
      <h1>Crie sua conta na <span>Pires Panificadora</span></h1>
      <p>É rápido, fácil e permite que você reserve seus produtos favoritos.</p>
    </template>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <form class="auth-form auth-form--register" novalidate @submit.prevent="handleRegister">
      <div class="auth-form__grid">
        <BaseInput
          :model-value="form.name"
          label="Nome completo"
          placeholder="Digite seu nome completo"
          :icon="User"
          :error="erros.name"
          autocomplete="name"
          name="name"
          @update:model-value="form.name = $event"
          @blur="validarNome"
        />

        <BaseInput
          :model-value="form.email"
          label="E-mail"
          type="email"
          placeholder="Digite seu e-mail"
          :icon="Mail"
          :error="erros.email"
          autocomplete="email"
          inputmode="email"
          name="email"
          @update:model-value="form.email = $event"
          @blur="validarEmail"
        />

        <BaseInput
          :model-value="form.phone"
          label="Telefone"
          type="tel"
          placeholder="(47) 99999-9999"
          :icon="Phone"
          :error="erros.phone"
          autocomplete="tel"
          inputmode="tel"
          maxlength="15"
          name="phone"
          @update:model-value="form.phone = formatarTelefone($event)"
          @blur="validarTelefone"
        />

        <BaseInput
          :model-value="form.password"
          label="Senha"
          type="password"
          placeholder="Crie uma senha"
          :icon="Lock"
          :error="erros.password"
          autocomplete="new-password"
          name="password"
          @update:model-value="form.password = $event"
          @blur="validarSenha"
        />

        <div class="auth-form__full">
          <BaseInput
            :model-value="form.passwordConfirm"
            label="Confirmar senha"
            type="password"
            placeholder="Confirme sua senha"
            :icon="Lock"
            :error="erros.passwordConfirm"
            autocomplete="new-password"
            name="password-confirm"
            @update:model-value="form.passwordConfirm = $event"
            @blur="validarConfirmacao"
          />
        </div>
      </div>

      <label class="auth-checkbox">
        <input v-model="form.acceptedTerms" type="checkbox" />
        <span>
          Aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong>.
        </span>
      </label>
      <p v-if="erros.acceptedTerms" class="auth-inline-error" role="alert">
        {{ erros.acceptedTerms }}
      </p>

      <BaseButton
        type="submit"
        block
        :icon="UserPlus"
        :loading="auth.carregando"
        loading-text="Criando conta..."
      >
        Criar conta
      </BaseButton>
    </form>

    <div class="auth-divider"><span>ou</span></div>

    <GoogleAuthButton
      :loading="auth.carregando"
      @credential="handleGoogleCredential"
      @error="erroGeral = $event"
    />

    <p class="auth-footer">
      Já tem uma conta?
      <RouterLink :to="{ name: 'login' }" class="auth-link">Fazer login</RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { Lock, Mail, Phone, User, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import GoogleAuthButton from '@/components/auth/GoogleAuthButton.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  acceptedTerms: false,
})

const erros = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  acceptedTerms: '',
})

const erroGeral = ref('')

function validarNome() {
  erros.name = form.name.trim().length >= 2 ? '' : 'Informe seu nome completo.'
}

function validarEmail() {
  const email = form.email.trim()
  erros.email = EMAIL_REGEX.test(email) ? '' : 'Informe um e-mail válido.'
}

function validarTelefone() {
  const digits = form.phone.replace(/\D/g, '')
  erros.phone = [10, 11].includes(digits.length) ? '' : 'Informe um telefone válido com DDD.'
}

function validarSenha() {
  erros.password = form.password.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'
}

function validarConfirmacao() {
  erros.passwordConfirm =
    form.passwordConfirm && form.passwordConfirm === form.password
      ? ''
      : 'As senhas não coincidem.'
}

function validarFormulario() {
  validarNome()
  validarEmail()
  validarTelefone()
  validarSenha()
  validarConfirmacao()
  erros.acceptedTerms = form.acceptedTerms ? '' : 'Você precisa aceitar os termos para continuar.'

  return !Object.values(erros).some(Boolean)
}

async function handleRegister() {
  erroGeral.value = ''

  if (!validarFormulario()) return

  const resultado = await auth.register({
    name: form.name,
    email: form.email,
    phone: form.phone,
    password: form.password,
  })

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    aplicarErrosBackend(resultado.campos)
    return
  }

  await router.push({ name: 'confirmar-email' })
}

async function handleGoogleCredential(credential) {
  erroGeral.value = ''
  const resultado = await auth.loginWithGoogle(credential)

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    return
  }

  await router.replace({ name: auth.isAdmin ? 'admin-dashboard' : 'home' })
}

function aplicarErrosBackend(campos) {
  for (const campo of Object.keys(erros)) {
    if (campos[campo]) {
      erros[campo] = campos[campo]
    }
  }
}

function formatarTelefone(valor) {
  const digits = String(valor || '').replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
</script>
