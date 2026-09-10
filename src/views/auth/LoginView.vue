<template>
  <AuthLayout>
    <template #heading>
      <h1>Bem-vindo à <span>Pires Panificadora</span></h1>
      <p>Faça login para acessar o sistema de pedidos da nossa cantina.</p>
    </template>

    <div
      v-if="mensagemStatus"
      class="auth-alert auth-alert--success"
      role="status"
    >
      {{ mensagemStatus }}
    </div>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <form
      class="auth-form auth-form--login"
      novalidate
      @submit.prevent="handleSubmit"
    >
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

      <div class="auth-login-help">
        <RouterLink
          :to="{ name: 'recuperar-senha' }"
          class="auth-link auth-login-help__forgot"
        >
          Esqueceu sua senha?
        </RouterLink>
      </div>

      <RouterLink
        v-if="mostrarLinkConfirmacao"
        :to="{ name: 'confirmar-email' }"
        class="auth-link auth-small auth-login-unverified"
      >
        Conta ainda não confirmada? Confirmar agora
      </RouterLink>

      <BaseButton
        type="submit"
        block
        :loading="auth.carregando"
        loading-text="Entrando..."
      >
        Entrar
      </BaseButton>
    </form>

    <div class="auth-google-login">
      <GoogleAuthButton
        :loading="auth.carregando"
        @credential="handleGoogleCredential"
        @error="erroGeral = $event"
      />
    </div>

    <div class="auth-divider auth-divider--plain" aria-hidden="true" />

    <p class="auth-footer auth-footer--login">
      Não tem uma conta?
      <RouterLink :to="{ name: 'cadastro' }" class="auth-link auth-create-link">
        Criar conta
        <ChevronRight :size="16" />
      </RouterLink>
    </p>

    <div class="auth-secure">
      <ShieldCheck :size="20" />
      <span>Acesso seguro e protegido</span>
    </div>
  </AuthLayout>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ChevronRight, Lock, Mail, ShieldCheck } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";

import GoogleAuthButton from "@/components/auth/GoogleAuthButton.vue";
import AuthLayout from "@/components/layout/AuthLayout.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ email: "", password: "" });
const erros = reactive({ email: "", password: "" });
const erroGeral = ref("");

const mensagemStatus = computed(() => {
  if (route.query.ativada === "1") {
    return "E-mail confirmado com sucesso. Agora você já pode entrar.";
  }

  if (route.query.senhaRedefinida === "1") {
    return "Senha redefinida com sucesso. Entre com sua nova senha.";
  }

  if (route.query.motivo === "sessao-expirada") {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }

  return "";
});

const mostrarLinkConfirmacao = computed(() =>
  /confirm|ativ|verific/i.test(erroGeral.value || ""),
);

function validarEmail() {
  const email = form.email.trim();

  if (!email) {
    erros.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(email)) {
    erros.email = "Informe um e-mail válido.";
  } else {
    erros.email = "";
  }
}

function validarSenha() {
  erros.password = form.password ? "" : "Informe sua senha.";
}

async function handleSubmit() {
  erroGeral.value = "";
  validarEmail();
  validarSenha();

  if (erros.email || erros.password) return;

  const resultado = await auth.login(form.email, form.password);

  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    Object.assign(erros, resultado.campos);
    return;
  }

  await redirecionarAposLogin();
}

async function handleGoogleCredential(credential) {
  erroGeral.value = "";
  const resultado = await auth.loginWithGoogle(credential);

  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    return;
  }

  await redirecionarAposLogin();
}

async function redirecionarAposLogin() {
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : "";

  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    await router.replace(redirect);
    return;
  }

  await router.replace({ name: auth.isAdmin ? "admin-dashboard" : "home" });
}
</script>
