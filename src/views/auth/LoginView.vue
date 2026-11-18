<script setup>
import { computed, inject, reactive, ref } from "vue";
import { Lock, Mail } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import AuthPage from "@/components/layout/AuthPage.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";
import { safeAuthRedirect } from "@/utils/auth-navigation";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { ocupado, executar, destino, focarErro } = inject("authExperience");
const form = reactive({ email: "", password: "" });
const erros = reactive({ email: "", password: "" });
const erroGeral = ref("");
const mensagemStatus = computed(() => {
  if (route.query.ativada === "1") return "E-mail confirmado. Agora você já pode entrar.";
  if (route.query.senhaRedefinida === "1") return "Senha redefinida. Entre com sua nova senha.";
  if (route.query.motivo === "sessao-expirada") return "Sua sessão expirou. Entre novamente para continuar.";
  if (route.query.motivo === "sessao-alterada") return "A sessão foi alterada em outra aba. Entre novamente para continuar.";
  return "";
});
const mostrarLinkConfirmacao = computed(() => /confirm|ativ|verific/i.test(erroGeral.value));
function validarEmail() { erros.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "" : "Informe um e-mail válido."; }
function validarSenha() { erros.password = form.password ? "" : "Informe sua senha."; }
async function handleSubmit() {
  if (ocupado.value) return;
  erroGeral.value = "";
  validarEmail(); validarSenha();
  if (erros.email || erros.password) { await focarErro(); return; }
  const resultado = await executar(() => auth.login(form.email, form.password));
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    Object.assign(erros, resultado.campos);
    await focarErro(); return;
  }
  await router.replace(safeAuthRedirect(route.query.redirect) || { name: auth.isAdmin ? "admin-dashboard" : "home" });
}
</script>

<template>
  <AuthPage>
    <template #heading>
      <span class="auth-note">Seu próximo intervalo começa aqui.</span>
      <h1 tabindex="-1">Bom te ver<br />por aqui.</h1>
      <p>Entre na sua conta para escolher seu lanche e retirar no balcão.</p>
    </template>
    <div v-if="mensagemStatus" class="auth-alert auth-alert--success" role="status">{{ mensagemStatus }}</div>
    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ erroGeral }}</div>
    <form class="auth-form auth-form--login" novalidate :aria-busy="ocupado" @submit.prevent="handleSubmit">
      <fieldset class="auth-fields" :disabled="ocupado">
        <BaseInput v-model="form.email" label="E-mail" type="email" placeholder="voce@exemplo.com" :icon="Mail" :error="erros.email" autocomplete="email" inputmode="email" name="email" required @blur="validarEmail" />
        <BaseInput v-model="form.password" label="Senha" type="password" placeholder="Sua senha" :icon="Lock" :error="erros.password" autocomplete="current-password" name="password" required @blur="validarSenha" />
        <div class="auth-login-help"><RouterLink :to="destino('recuperar-senha')" class="auth-link">Esqueceu sua senha?</RouterLink></div>
        <RouterLink v-if="mostrarLinkConfirmacao" :to="destino('confirmar-email')" class="auth-link auth-small">Conta ainda não confirmada? Confirmar e-mail</RouterLink>
        <BaseButton type="submit" block :loading="ocupado" loading-text="Entrando...">Entrar</BaseButton>
      </fieldset>
    </form>
  </AuthPage>
</template>
