<script setup>
import { inject, reactive, ref, watch } from "vue";
import { Lock, Mail, Phone, User } from "lucide-vue-next";
import { useRouter } from "vue-router";
import AuthPage from "@/components/layout/AuthPage.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const { ocupado, erroAceite, executar, destino, focarErro, atualizarAceite } = inject("authExperience");
const form = reactive({ name: "", email: "", phone: "", password: "", passwordConfirm: "", acceptedTerms: false });
const erros = reactive({ name: "", email: "", phone: "", password: "", passwordConfirm: "", acceptedTerms: "" });
const erroGeral = ref("");
watch(() => form.acceptedTerms, atualizarAceite);
function validarNome() { erros.name = form.name.trim().length >= 2 ? "" : "Informe seu nome completo."; }
function validarEmail() { erros.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "" : "Informe um e-mail válido."; }
function validarTelefone() { erros.phone = [10, 11].includes(form.phone.replace(/\D/g, "").length) ? "" : "Informe um telefone válido com DDD."; }
function validarSenha() { erros.password = form.password.length >= 8 ? "" : "Use pelo menos 8 caracteres."; }
function validarConfirmacao() { erros.passwordConfirm = form.passwordConfirm && form.passwordConfirm === form.password ? "" : "As senhas não coincidem."; }
async function handleRegister() {
  if (ocupado.value) return;
  erroGeral.value = "";
  validarNome(); validarEmail(); validarTelefone(); validarSenha(); validarConfirmacao();
  erros.acceptedTerms = form.acceptedTerms ? "" : "Aceite os Termos de Uso e a Política de Privacidade para continuar.";
  if (Object.values(erros).some(Boolean)) { await focarErro(); return; }
  const resultado = await executar(() => auth.register({ name: form.name, email: form.email, phone: form.phone, password: form.password }));
  if (resultado.ignorado) return;
  if (!resultado.ok) {
    erroGeral.value = resultado.erro;
    for (const campo of Object.keys(erros)) { if (resultado.campos?.[campo]) erros[campo] = resultado.campos[campo]; }
    await focarErro(); return;
  }
  await router.push(destino("confirmar-email"));
}
function formatarTelefone(valor) {
  const digits = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
</script>

<template>
  <AuthPage>
    <template #heading><h1 tabindex="-1">Seu lugar<br />na Pires.</h1><p>Crie sua conta e deixe o lanche do intervalo encaminhado.</p></template>
    <div v-if="erroGeral" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ erroGeral }}</div>
    <form class="auth-form auth-form--register" novalidate :aria-busy="ocupado" @submit.prevent="handleRegister">
      <fieldset class="auth-fields" :disabled="ocupado">
        <div class="auth-form__grid">
          <BaseInput v-model="form.name" label="Nome completo" placeholder="Como você se chama?" :icon="User" :error="erros.name" autocomplete="name" name="name" required @blur="validarNome" />
          <BaseInput v-model="form.email" label="E-mail" type="email" placeholder="voce@exemplo.com" :icon="Mail" :error="erros.email" autocomplete="email" inputmode="email" name="email" required @blur="validarEmail" />
          <BaseInput :model-value="form.phone" label="Telefone" type="tel" placeholder="(47) 99999-9999" :icon="Phone" :error="erros.phone" autocomplete="tel" inputmode="tel" maxlength="15" name="phone" required @update:model-value="form.phone = formatarTelefone($event)" @blur="validarTelefone" />
          <BaseInput v-model="form.password" label="Senha" type="password" placeholder="Pelo menos 8 caracteres" :icon="Lock" :error="erros.password" autocomplete="new-password" name="password" aria-describedby="register-password-help" required @blur="validarSenha" />
          <div class="auth-form__full"><BaseInput v-model="form.passwordConfirm" label="Confirmar senha" type="password" placeholder="Repita sua senha" :icon="Lock" :error="erros.passwordConfirm" autocomplete="new-password" name="password-confirm" required @blur="validarConfirmacao" /></div>
        </div>
        <p id="register-password-help" class="auth-small">Use pelo menos 8 caracteres. Evite senhas comuns, apenas números ou semelhantes aos seus dados pessoais.</p>
        <label class="auth-checkbox"><input v-model="form.acceptedTerms" type="checkbox" name="accepted-terms" :aria-invalid="Boolean(erros.acceptedTerms || erroAceite)" :aria-describedby="erros.acceptedTerms || erroAceite ? 'terms-error' : undefined" /><span>Li e aceito os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</span></label>
        <p v-if="erros.acceptedTerms || erroAceite" id="terms-error" class="auth-inline-error" role="alert">{{ erros.acceptedTerms || 'Aceite os Termos de Uso e a Política de Privacidade para continuar com o Google.' }}</p>
        <BaseButton type="submit" block :loading="ocupado" loading-text="Criando conta...">Criar conta</BaseButton>
      </fieldset>
    </form>
  </AuthPage>
</template>
