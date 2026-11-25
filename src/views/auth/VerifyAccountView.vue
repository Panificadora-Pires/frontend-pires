<script setup>
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
import { KeyRound, Mail } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AuthPage from "@/components/layout/AuthPage.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
const router = useRouter();
const { ocupado, executar, destino, focarErro } = inject("authExperience");
const pendencia = ref(auth.obterAtivacaoPendente());
const email = ref(pendencia.value?.email || "");
const code = ref("");
const erroEmail = ref("");
const erroCodigo = ref("");
const erroGeral = ref("");
const mensagem = ref("");
const agora = ref(Date.now());
let timerId;
const descricaoConfirmacao = computed(() => {
  if (!pendencia.value?.requestId)
    return "Informe o e-mail de uma conta existente para solicitar a confirmação. Isso não altera o e-mail cadastrado.";
  if (pendencia.value.emailSent === false)
    return `Sua conta foi criada, mas o envio para ${pendencia.value.email} falhou. Solicite um novo código.`;
  if (pendencia.value.emailSent === true)
    return `Enviamos um código de 6 dígitos para ${pendencia.value.email}. Continue nesta aba.`;
  return `Se a conta ${pendencia.value.email} ainda precisar de confirmação, você receberá um código. Continue nesta aba.`;
});
const segundosRestantes = computed(() =>
  Math.max(
    0,
    Math.ceil(
      (Number(pendencia.value?.requestedAt || 0) +
        Number(pendencia.value?.retryAfterSeconds || 0) * 1000 -
        agora.value) /
        1000,
    ),
  ),
);
async function confirmarCodigo() {
  if (ocupado.value) return;
  erroGeral.value = "";
  mensagem.value = "";
  erroCodigo.value = /^\d{6}$/.test(code.value)
    ? ""
    : "Digite os 6 números recebidos por e-mail.";
  if (erroCodigo.value) {
    await focarErro();
    return;
  }
  const resultado = await executar(() => auth.confirmarAtivacao(code.value));
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    erroCodigo.value = resultado.campos?.code || "";
    await focarErro();
    return;
  }
  code.value = "";
  await router.replace(destino("login", { ativada: "1" }));
}
async function solicitarCodigo() {
  if (ocupado.value) return;
  erroGeral.value = "";
  mensagem.value = "";
  erroEmail.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
    ? ""
    : "Informe um e-mail válido.";
  if (erroEmail.value) {
    await focarErro();
    return;
  }
  await enviar(email.value.trim());
}
async function reenviar() {
  if (ocupado.value || !pendencia.value?.email || segundosRestantes.value > 0)
    return;
  erroGeral.value = "";
  mensagem.value = "";
  await enviar(pendencia.value.email);
}
async function enviar(endereco) {
  const resultado = await executar(() => auth.reenviarAtivacao(endereco));
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    erroEmail.value = resultado.campos?.email || "";
    await focarErro();
    return;
  }
  pendencia.value = auth.obterAtivacaoPendente();
  mensagem.value =
    resultado.data?.message ||
    "Se a conta ainda precisar de confirmação, você receberá um código no e-mail informado.";
  code.value = "";
  erroCodigo.value = "";
  agora.value = Date.now();
}
async function trocarEmail() {
  if (ocupado.value) return;
  auth.limparAtivacaoPendente();
  pendencia.value = null;
  code.value = "";
  mensagem.value = "";
  erroGeral.value = "";
  erroCodigo.value = "";
  email.value = "";
  await nextTick();
  document.querySelector('.auth-page input[name="email"]')?.focus();
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
onBeforeUnmount(() => {
  window.clearInterval(timerId);
  code.value = "";
});
</script>

<template>
  <AuthPage>
    <template #heading
      ><h1 tabindex="-1">Falta só<br />confirmar.</h1>
      <p>{{ descricaoConfirmacao }}</p></template
    >
    <div
      v-if="erroGeral"
      class="auth-alert auth-alert--error"
      role="alert"
      tabindex="-1"
    >
      {{ erroGeral }}
    </div>
    <div v-if="mensagem" class="auth-alert auth-alert--info" role="status">
      {{ mensagem }}
    </div>
    <form
      v-if="pendencia?.requestId"
      class="auth-form"
      novalidate
      :aria-busy="ocupado"
      @submit.prevent="confirmarCodigo"
    >
      <fieldset class="auth-fields" :disabled="ocupado">
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
          class="auth-code"
          aria-describedby="verification-code-help"
          required
          @update:model-value="code = somenteDigitos($event)"
        />
        <p id="verification-code-help" class="auth-code-hint">
          Cole os 6 números recebidos. O código expira após alguns minutos e só
          pode ser usado uma vez.
        </p>
        <BaseButton
          type="submit"
          block
          :loading="ocupado"
          loading-text="Confirmando..."
          >Confirmar e-mail</BaseButton
        >
        <div class="auth-row-between">
          <button
            type="button"
            class="auth-resend"
            :disabled="segundosRestantes > 0 || ocupado"
            @click="reenviar"
          >
            {{
              segundosRestantes > 0
                ? `Reenviar em ${segundosRestantes}s`
                : "Reenviar código"
            }}</button
          ><button
            type="button"
            class="auth-resend"
            :disabled="ocupado"
            @click="trocarEmail"
          >
            Confirmar outra conta
          </button>
        </div>
        <p class="auth-small">
          Informou o endereço errado no cadastro? Esta etapa confirma uma conta
          existente e não altera o e-mail cadastrado.
        </p>
      </fieldset>
    </form>
    <form
      v-else
      class="auth-form"
      novalidate
      :aria-busy="ocupado"
      @submit.prevent="solicitarCodigo"
    >
      <fieldset class="auth-fields" :disabled="ocupado">
        <BaseInput
          v-model="email"
          label="E-mail da conta"
          type="email"
          placeholder="voce@exemplo.com"
          :icon="Mail"
          :error="erroEmail"
          autocomplete="email"
          inputmode="email"
          name="email"
          required
        /><BaseButton
          type="submit"
          block
          :loading="ocupado"
          loading-text="Enviando..."
          >Enviar código</BaseButton
        >
      </fieldset>
    </form>
    <p class="auth-footer">
      Já confirmou sua conta?
      <RouterLink :to="destino('login')" class="auth-link">Entrar</RouterLink>
    </p>
  </AuthPage>
</template>
