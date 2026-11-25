<script setup>
import { Chrome, KeyRound, MailCheck, ShieldCheck, UserRound } from "lucide-vue-next";

import { estadoBooleano } from "@/composables/usePerfil";

defineProps({
  usuario: { type: Object, required: true },
  ultimoAcesso: { type: String, required: true },
  metodosLogin: { type: String, required: true },
});
</script>

<template>
  <section class="profile-security" aria-labelledby="perfil-seguranca">
    <div class="profile-aside-heading">
      <ShieldCheck :size="20" aria-hidden="true" />
      <h2 id="perfil-seguranca">Segurança da conta</h2>
    </div>
    <dl class="profile-security-list">
      <div>
        <dt>
          <MailCheck :size="18" aria-hidden="true" />
          E-mail
        </dt>
        <dd :class="{ 'is-positive': usuario.email_verified === true }">
          {{
            estadoBooleano(usuario.email_verified, "Verificado", "Não verificado")
          }}
        </dd>
      </div>
      <div>
        <dt>
          <Chrome :size="18" aria-hidden="true" />
          Conta Google
        </dt>
        <dd>
          {{
            estadoBooleano(usuario.google_connected, "Conectada", "Não vinculada")
          }}
        </dd>
      </div>
      <div>
        <dt>
          <KeyRound :size="18" aria-hidden="true" />
          Senha
        </dt>
        <dd>
          {{
            estadoBooleano(
              usuario.has_usable_password,
              "Configurada",
              "Não definida",
            )
          }}
        </dd>
      </div>
    </dl>
  </section>
  <section class="profile-account" aria-labelledby="perfil-resumo">
    <div class="profile-aside-heading">
      <UserRound :size="20" aria-hidden="true" />
      <h2 id="perfil-resumo">Sua conta</h2>
    </div>
    <dl class="profile-summary-list">
      <div>
        <dt>Tipo de conta</dt>
        <dd>
          {{ estadoBooleano(usuario.is_staff, "Administração", "Aluno") }}
        </dd>
      </div>
      <div>
        <dt>Último acesso</dt>
        <dd>
          {{ ultimoAcesso }}
        </dd>
      </div>
      <div>
        <dt>Formas de acesso</dt>
        <dd>
          {{ metodosLogin }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped src="./ProfileAccountInfo.css"></style>
