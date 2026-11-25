<script setup>
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { KeyRound, Lock } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AuthPage from "@/components/layout/AuthPage.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
const router = useRouter();
const { ocupado, executar, destino, focarErro } = inject("authExperience");
const pendencia = ref(auth.obterRedefinicaoPendente());
const form = reactive({ code: "", newPassword: "", confirmPassword: "" });
const erros = reactive({ code: "", newPassword: "", confirmPassword: "" });
const erroGeral = ref("");
const mensagem = ref(pendencia.value?.message || "");
const agora = ref(Date.now());
let timerId;
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
async function handleSubmit() {
  if (ocupado.value) return;
  erroGeral.value = "";
  mensagem.value = "";
  erros.code = /^\d{6}$/.test(form.code) ? "" : "Digite o código de 6 dígitos.";
  erros.newPassword =
    form.newPassword.length >= 8 ? "" : "Use pelo menos 8 caracteres.";
  erros.confirmPassword =
    form.confirmPassword && form.confirmPassword === form.newPassword
      ? ""
      : "As senhas não coincidem.";
  if (Object.values(erros).some(Boolean)) {
    await focarErro();
    return;
  }
  const resultado = await executar(() =>
    auth.redefinirSenha({ code: form.code, newPassword: form.newPassword }),
  );
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    erros.code = resultado.campos?.code || "";
    erros.newPassword =
      resultado.campos?.new_password || resultado.campos?.newPassword || "";
    await focarErro();
    return;
  }
  form.code = "";
  form.newPassword = "";
  form.confirmPassword = "";
  await router.replace(destino("login", { senhaRedefinida: "1" }));
}
async function reenviarCodigo() {
  if (ocupado.value || !pendencia.value?.email || segundosRestantes.value > 0)
    return;
  erroGeral.value = "";
  mensagem.value = "";
  const resultado = await executar(() =>
    auth.solicitarRedefinicaoSenha(pendencia.value.email),
  );
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    await focarErro();
    return;
  }
  pendencia.value = auth.obterRedefinicaoPendente();
  mensagem.value =
    resultado.data?.message ||
    "Se o e-mail estiver cadastrado, você receberá um código de recuperação.";
  form.code = "";
  erros.code = "";
  agora.value = Date.now();
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
  form.code = "";
  form.newPassword = "";
  form.confirmPassword = "";
});
</script>

<template>
  <AuthPage>
    <template #heading
      ><h1 tabindex="-1">Uma nova<br />senha.</h1>
      <p v-if="pendencia?.requestId">
        Se o e-mail estiver cadastrado, o código de recuperação chegará em
        {{ pendencia.email }}. Use-o nesta aba.
      </p>
      <p v-else>
        Solicite um código de recuperação para escolher uma nova senha.
      </p></template
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
      @submit.prevent="handleSubmit"
    >
      <fieldset class="auth-fields" :disabled="ocupado">
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
          class="auth-code"
          aria-describedby="reset-code-help"
          required
          @update:model-value="form.code = somenteDigitos($event)"
        />
        <p id="reset-code-help" class="auth-code-hint">
          Cole os 6 números recebidos por e-mail. O código é de uso único.
        </p>
        <BaseInput
          v-model="form.newPassword"
          label="Nova senha"
          type="password"
          placeholder="Pelo menos 8 caracteres"
          :icon="Lock"
          :error="erros.newPassword"
          autocomplete="new-password"
          name="new-password"
          aria-describedby="reset-password-help"
          required
        />
        <p id="reset-password-help" class="auth-small">
          Evite senhas comuns, apenas números ou semelhantes aos seus dados
          pessoais.
        </p>
        <BaseInput
          v-model="form.confirmPassword"
          label="Confirmar nova senha"
          type="password"
          placeholder="Repita sua nova senha"
          :icon="Lock"
          :error="erros.confirmPassword"
          autocomplete="new-password"
          name="confirm-new-password"
          required
        />
        <BaseButton
          type="submit"
          block
          :loading="ocupado"
          loading-text="Redefinindo..."
          >Redefinir senha</BaseButton
        >
        <button
          type="button"
          class="auth-resend"
          :disabled="segundosRestantes > 0 || ocupado"
          @click="reenviarCodigo"
        >
          {{
            segundosRestantes > 0
              ? `Reenviar em ${segundosRestantes}s`
              : "Reenviar código"
          }}
        </button>
      </fieldset>
    </form>
    <div v-else class="auth-actions-stack">
      <p class="auth-alert auth-alert--info">
        Não há solicitação de recuperação nesta aba. Se você iniciou em outra,
        volte a ela ou solicite um novo código aqui.
      </p>
      <RouterLink
        :to="destino('recuperar-senha')"
        class="auth-link auth-link--button"
        >Solicitar código</RouterLink
      >
    </div>
  </AuthPage>
</template>
