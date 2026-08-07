<template>
  <AuthLayout>
    <template #heading>
      <h1>Bem-vindo à <span>Pires Panificadora</span></h1>
      <p>Faça login para acessar o sistema de pedidos da nossa cantina.</p>
    </template>

    <div v-if="mensagemStatus" class="auth-alert auth-alert--success" role="status">
      {{ mensagemStatus }}
    </div>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <BaseInput
        v-model="form.email"
        label="E-mail"
        type="email"
        placeholder="Digite seu e-mail"
        :icon="Mail"
        :error="erros.email"
        autocomplete="email"
        inputmode="email"
        name="email"
        @blur="validarEmail"
      />

      <BaseInput
        v-model="form.password"
        label="Senha"
        type="password"
        placeholder="Digite sua senha"
        :icon="Lock"
        :error="erros.password"
        autocomplete="current-password"
        name="password"
        @blur="validarSenha"
      />

      <div class="auth-row-between">
        <RouterLink :to="{ name: 'confirmar-email' }" class="auth-small auth-link">
          Conta não confirmada?
        </RouterLink>
        <RouterLink :to="{ name: 'recuperar-senha' }" class="auth-link auth-small">
          Esqueceu sua senha?
        </RouterLink>
      </div>

      <BaseButton
        type="submit"
        block
        :icon="LogIn"
        :loading="auth.carregando"
        loading-text="Entrando..."
      >
        Entrar
      </BaseButton>
    </form>

    <div class="auth-divider"><span>ou</span></div>

    <GoogleAuthButton
      :loading="auth.carregando"
      @credential="handleGoogleCredential"
      @error="erroGeral = $event"
    />

    <div class="auth-divider"><span>ou</span></div>

    <BaseButton variant="ghost" block :icon="UserPlus" @click="router.push({ name: 'cadastro' })">
      Criar nova conta
    </BaseButton>

    <div class="auth-secure">
      <ShieldCheck :size="15" />
      <span>Acesso seguro e protegido</span>
    </div>
  </AuthLayout>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Lock, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

import GoogleAuthButton from '@/components/auth/GoogleAuthButton.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const erros = reactive({ email: '', password: '' })
const erroGeral = ref('')

const mensagemStatus = computed(() => {
  if (route.query.ativada === '1') {
    return 'E-mail confirmado com sucesso. Agora você já pode entrar.'
  }

  if (route.query.senhaRedefinida === '1') {
    return 'Senha redefinida com sucesso. Entre com sua nova senha.'
  }

  if (route.query.motivo === 'sessao-expirada') {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }

  return ''
})

function validarEmail() {
  const email = form.email.trim()

  if (!email) {
    erros.email = 'Informe seu e-mail.'
  } else if (!EMAIL_REGEX.test(email)) {
    erros.email = 'Informe um e-mail válido.'
  } else {
    erros.email = ''
  }
}

function validarSenha() {
  erros.password = form.password ? '' : 'Informe sua senha.'
}

async function handleSubmit() {
  erroGeral.value = ''
  validarEmail()
  validarSenha()

  if (erros.email || erros.password) return

  const resultado = await auth.login(form.email, form.password)

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    Object.assign(erros, resultado.campos)
    return
  }

  await redirecionarAposLogin()
}

async function handleGoogleCredential(credential) {
  erroGeral.value = ''
  const resultado = await auth.loginWithGoogle(credential)

  if (!resultado.ok) {
    erroGeral.value = resultado.erro
    return
  }

  await redirecionarAposLogin()
}

async function redirecionarAposLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''

  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    await router.replace(redirect)
    return
  }

  await router.replace({ name: auth.isAdmin ? 'admin-dashboard' : 'home' })
}
</script>
