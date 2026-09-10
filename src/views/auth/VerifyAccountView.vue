<template>
  <AuthLayout :back-to="{ name: 'login' }" back-label="Voltar para o login">
    <template #heading>
      <h1>Confirme seu <span>e-mail</span></h1>
      <p>
        {{ descricaoConfirmacao }}
      </p>
    </template>

    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert">
      {{ erroGeral }}
    </div>

    <div v-if="mensagem" class="auth-alert auth-alert--info" role="status">
      {{ mensagem }}
    </div>

    <form
      v-if="pendencia?.requestId"
      class="auth-form"
      novalidate
      @submit.prevent="confirmarCodigo"
    >
      <BaseInput
        :model-value="code"
        label="Código de confirmação"
        placeholder="000000"
        :icon="KeyRound"
        :error="erroCodigo"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        name="verification-code"
        @update:model-value="code = somenteDigitos($event)"
      />

      <p class="auth-code-hint">
        O código expira após alguns minutos e só pode ser usado uma vez.
      </p>

      <BaseButton
        type="submit"
        block
        :icon="BadgeCheck"
        :loading="auth.carregando"
        loading-text="Confirmando..."
      >
        Confirmar e-mail
      </BaseButton>

      <div class="auth-row-between">
        <button
          type="button"
          class="auth-resend"
          :disabled="segundosRestantes > 0 || auth.carregando"
          @click="reenviar"
        >
          {{
            segundosRestantes > 0
              ? `Reenviar em ${segundosRestantes}s`
              : "Reenviar código"
          }}
        </button>

        <button type="button" class="auth-resend" @click="trocarEmail">
          Usar outro e-mail
        </button>
      </div>
    </form>

    <form v-else class="auth-form" novalidate @submit.prevent="solicitarCodigo">
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
      Já confirmou sua conta?
      <RouterLink :to="{ name: 'login' }" class="auth-link"
        >Fazer login</RouterLink
      >
    </p>
  </AuthLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { BadgeCheck, KeyRound, Mail, Send } from "lucide-vue-next";
import { useRouter } from "vue-router";

import AuthLayout from "@/components/layout/AuthLayout.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const auth = useAuthStore();
const router = useRouter();

const pendencia = ref(auth.obterAtivacaoPendente());
const email = ref(pendencia.value?.email || "");
const code = ref("");
const erroEmail = ref("");
const erroCodigo = ref("");
const erroGeral = ref("");
const mensagem = ref("");
const agora = ref(Date.now());
let timerId = null;

const descricaoConfirmacao = computed(() => {
  if (!pendencia.value?.requestId) {
    return "Informe seu e-mail para receber um novo código de confirmação.";
  }

  if (pendencia.value.emailSent === false) {
    return `Sua conta foi criada, mas o primeiro envio para ${pendencia.value.email} falhou. Solicite um novo código.`;
  }

  return `Enviamos um código de 6 dígitos para ${pendencia.value.email}.`;
});

const segundosRestantes = computed(() => {
  const solicitadoEm = Number(pendencia.value?.requestedAt || 0);
  const cooldown = Number(pendencia.value?.retryAfterSeconds || 0) * 1000;
  const restante = Math.ceil((solicitadoEm + cooldown - agora.value) / 1000);
  return Math.max(0, restante);
});

async function confirmarCodigo() {
  erroGeral.value = "";
  erroCodigo.value = "";

  if (!/^\d{6}$/.test(code.value)) {
    erroCodigo.value = "Digite os 6 números recebidos por e-mail.";
    return;
  }

  const resultado = await auth.confirmarAtivacao(code.value);

  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    return;
  }

  await router.replace({ name: "login", query: { ativada: "1" } });
}

async function solicitarCodigo() {
  erroGeral.value = "";
  erroEmail.value = "";
  mensagem.value = "";

  const emailNormalizado = email.value.trim();

  if (!EMAIL_REGEX.test(emailNormalizado)) {
    erroEmail.value = "Informe um e-mail válido.";
    return;
  }

  const resultado = await auth.reenviarAtivacao(emailNormalizado);

  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    return;
  }

  pendencia.value = auth.obterAtivacaoPendente();
  mensagem.value = resultado.data.message;
  agora.value = Date.now();
}

async function reenviar() {
  if (!pendencia.value?.email || segundosRestantes.value > 0) return;

  erroGeral.value = "";
  mensagem.value = "";

  const resultado = await auth.reenviarAtivacao(pendencia.value.email);

  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    return;
  }

  pendencia.value = auth.obterAtivacaoPendente();
  mensagem.value = resultado.data.message;
  agora.value = Date.now();
}

function trocarEmail() {
  auth.limparAtivacaoPendente();
  pendencia.value = null;
  code.value = "";
  mensagem.value = "";
  erroGeral.value = "";
}

function somenteDigitos(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 6);
}

onMounted(() => {
  timerId = window.setInterval(() => {
    agora.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => window.clearInterval(timerId));
</script>
