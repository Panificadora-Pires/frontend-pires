<script setup>
import { inject, ref } from "vue";
import { Mail } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AuthPage from "@/components/layout/AuthPage.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
const router = useRouter();
const { ocupado, executar, destino, focarErro } = inject("authExperience");
const email = ref("");
const erroEmail = ref("");
const erroGeral = ref("");
async function handleSubmit() {
  if (ocupado.value) return;
  erroGeral.value = "";
  erroEmail.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
    ? ""
    : "Informe um e-mail válido.";
  if (erroEmail.value) {
    await focarErro();
    return;
  }
  const resultado = await executar(() =>
    auth.solicitarRedefinicaoSenha(email.value),
  );
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    erroEmail.value = resultado.campos?.email || "";
    await focarErro();
    return;
  }
  await router.push(destino("redefinir-senha"));
}
</script>

<template>
  <AuthPage>
    <template #heading
      ><h1 tabindex="-1">Esqueceu<br />a senha?</h1>
      <p>
        Informe o e-mail da sua conta para solicitar um código de recuperação.
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
    <form
      class="auth-form"
      novalidate
      :aria-busy="ocupado"
      @submit.prevent="handleSubmit"
    >
      <fieldset class="auth-fields" :disabled="ocupado">
        <BaseInput
          v-model="email"
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          :icon="Mail"
          :error="erroEmail"
          autocomplete="email"
          inputmode="email"
          name="email"
          required
        />
        <p class="auth-small">
          Por segurança, a resposta é a mesma para qualquer endereço. Continue
          nesta aba para usar o código.
        </p>
        <BaseButton
          type="submit"
          block
          :loading="ocupado"
          loading-text="Enviando..."
          >Enviar código</BaseButton
        >
      </fieldset>
    </form>
    <p class="auth-footer">
      Lembrou sua senha?
      <RouterLink :to="destino('login')" class="auth-link"
        >Voltar ao login</RouterLink
      >
    </p>
  </AuthPage>
</template>
