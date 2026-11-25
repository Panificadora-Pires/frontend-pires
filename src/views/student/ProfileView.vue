<template>
  <div class="profile-page">
    <header class="profile-page__header">
      <h1>Meu perfil</h1>
      <p>Seus dados, sua conta. Tudo em um só lugar.</p>
    </header>
    <div
      v-if="!auth.usuario"
      class="profile-load-state"
      :aria-busy="carregandoPerfil"
    >
      <LoaderCircle
        v-if="carregandoPerfil"
        :size="28"
        class="profile-spin"
        aria-hidden="true"
      />
      <CircleAlert v-else :size="28" aria-hidden="true" />
      <h2>
        {{
          carregandoPerfil
            ? "Carregando seu perfil"
            : "Não foi possível carregar seu perfil"
        }}
      </h2>
      <p role="status">
        {{ erroCarregamento || "Aguarde enquanto buscamos seus dados." }}
      </p>
      <button
        v-if="!carregandoPerfil"
        type="button"
        class="profile-btn profile-btn--primary"
        @click="carregarPerfil"
      >
        Tentar novamente
      </button>
    </div>
    <div v-else class="profile-page__layout">
      <motion.div
        class="profile-page__main"
        :initial="{ opacity: reduzir ? 1 : 0.85, y: reduzir ? 0 : 6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: reduzir ? 0 : 0.2 }"
      >
        <section class="profile-identity" aria-labelledby="perfil-identidade">
          <div
            class="profile-avatar profile-avatar-editor__preview"
            :class="{ 'is-preview': avatarPreview }"
          >
            <img
              v-if="avatarExibido"
              :key="avatarExibido"
              :src="avatarExibido"
              referrerpolicy="no-referrer"
              :alt="`Foto de ${auth.usuario.name || 'perfil'}`"
              @error="avatarRemotoComErro = true"
            />
            <span v-else-if="iniciais" aria-hidden="true">
              {{ iniciais }}
            </span>
            <UserRound v-else :size="40" aria-hidden="true" />
          </div>
          <div class="profile-identity__content">
            <h2 id="perfil-identidade">
              {{ auth.usuario.name || "Nome não informado" }}
            </h2>
            <p class="profile-identity__email">
              {{ auth.usuario.email || "E-mail não informado" }}
            </p>
            <p class="profile-identity__verification">
              <MailCheck :size="16" aria-hidden="true" />
              <span>
                E-mail:
                {{
                  estadoBooleano(
                    auth.usuario.email_verified,
                    "Verificado",
                    "Não verificado",
                  )
                }}
              </span>
            </p>
            <div class="profile-avatar-actions">
              <button
                id="profile-avatar-trigger"
                type="button"
                class="profile-text-btn profile-text-btn--upload"
                :disabled="salvando"
                :aria-invalid="Boolean(erros.avatar)"
                :aria-describedby="
                  erros.avatar
                    ? 'profile-avatar-help profile-avatar-error'
                    : 'profile-avatar-help'
                "
                @click="abrirSeletorFoto"
              >
                <Upload :size="17" aria-hidden="true" />
                {{ avatarExibido ? "Trocar foto" : "Adicionar foto" }}
              </button>
              <button
                v-if="avatarExibido || (!removerAvatar && auth.usuario.avatar)"
                type="button"
                class="profile-text-btn"
                :disabled="salvando"
                @click="marcarRemocaoAvatar"
              >
                <Trash2 :size="17" aria-hidden="true" />
                Remover foto
              </button>
            </div>
            <p id="profile-avatar-help" class="profile-hint">
              JPG, PNG ou WebP, com até 3 MB.
            </p>
            <p
              v-if="avatarPreview || removerAvatar"
              class="profile-avatar-pending"
              role="status"
            >
              {{
                removerAvatar
                  ? "Foto marcada para remoção. Salve para confirmar."
                  : "Prévia da nova foto. Salve para confirmar."
              }}
            </p>
            <p
              v-if="erros.avatar"
              id="profile-avatar-error"
              class="profile-field-error"
            >
              {{ erros.avatar }}
            </p>
          </div>
          <input
            id="profile-avatar-input"
            ref="avatarInput"
            class="profile-file-input"
            type="file"
            tabindex="-1"
            aria-label="Escolher foto de perfil"
            accept="image/jpeg,image/png,image/webp"
            :disabled="salvando"
            @change="selecionarFoto"
          />
        </section>
        <section class="profile-details" aria-labelledby="perfil-dados">
          <div class="profile-section-heading">
            <h2 id="perfil-dados">Dados pessoais</h2>
            <span v-if="temAlteracoes" class="profile-unsaved">
              <CircleDot :size="14" aria-hidden="true" />
              Alterações não salvas
            </span>
          </div>
          <p class="profile-section-intro">
            Mantenha seu nome e telefone atualizados.
          </p>
          <form
            class="profile-form"
            novalidate
            :aria-busy="salvando"
            @submit.prevent="salvarPerfil"
          >
            <div class="profile-field">
              <label for="profile-name"> Nome completo </label>
              <input
                id="profile-name"
                v-model="form.name"
                type="text"
                maxlength="255"
                autocomplete="name"
                required
                :disabled="salvando"
                :aria-invalid="Boolean(erros.name)"
                :aria-describedby="
                  erros.name ? 'profile-name-error' : undefined
                "
                @input="limparErro('name')"
              />
              <p
                v-if="erros.name"
                id="profile-name-error"
                class="profile-field-error"
              >
                {{ erros.name }}
              </p>
            </div>
            <div class="profile-field">
              <label for="profile-phone"> Telefone </label>
              <input
                id="profile-phone"
                :value="form.phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                placeholder="(47) 99999-9999"
                maxlength="15"
                :disabled="salvando"
                :aria-invalid="Boolean(erros.phone)"
                :aria-describedby="
                  erros.phone
                    ? 'profile-phone-help profile-phone-error'
                    : 'profile-phone-help'
                "
                @input="atualizarTelefone"
              />
              <p id="profile-phone-help" class="profile-hint">
                Informe o DDD e o número.
              </p>
              <p
                v-if="erros.phone"
                id="profile-phone-error"
                class="profile-field-error"
              >
                {{ erros.phone }}
              </p>
            </div>
            <div class="profile-field profile-field--wide">
              <label for="profile-email"> E-mail </label>
              <div class="profile-readonly">
                <input
                  id="profile-email"
                  :value="auth.usuario.email || ''"
                  type="email"
                  readonly
                  aria-describedby="profile-email-help"
                />
                <LockKeyhole :size="17" aria-hidden="true" />
              </div>
              <p id="profile-email-help" class="profile-hint">
                Este é o e-mail de acesso à sua conta. Ele não pode ser alterado
                nesta tela.
              </p>
            </div>
            <div class="profile-form__actions">
              <button
                type="submit"
                class="profile-btn profile-btn--primary"
                :disabled="salvando || !temAlteracoes"
              >
                <LoaderCircle
                  v-if="salvando"
                  :size="18"
                  class="profile-spin"
                  aria-hidden="true"
                />
                <Save v-else :size="18" aria-hidden="true" />
                {{ salvando ? "Salvando..." : "Salvar alterações" }}
              </button>
              <button
                type="button"
                class="profile-btn profile-btn--secondary"
                :disabled="salvando || !temAlteracoes"
                @click="restaurarFormulario"
              >
                Cancelar
              </button>
            </div>
            <div
              class="profile-feedback-region"
              aria-live="polite"
              aria-atomic="true"
            >
              <motion.div
                v-if="mensagem"
                :key="mensagem.texto"
                class="profile-feedback"
                :class="`profile-feedback--${mensagem.tipo}`"
                :initial="{ opacity: reduzir ? 1 : 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: reduzir ? 0 : 0.18 }"
              >
                <CheckCircle2
                  v-if="mensagem.tipo === 'success'"
                  :size="20"
                  aria-hidden="true"
                />
                <CircleAlert v-else :size="20" aria-hidden="true" />
                <p>
                  {{ mensagem.texto }}
                </p>
              </motion.div>
            </div>
          </form>
        </section>
      </motion.div>
      <motion.aside
        class="profile-page__aside"
        aria-label="Informações da conta"
        :initial="{ opacity: reduzir ? 1 : 0.85, y: reduzir ? 0 : 6 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: reduzir ? 0 : 0.2 }"
      >
        <ProfileAccountInfo
          :usuario="auth.usuario"
          :ultimo-acesso="ultimoAcesso"
          :metodos-login="metodosLogin"
        />
      </motion.aside>
    </div>
  </div>
</template>

<script setup>
import { motion, useReducedMotion } from "motion-v";
import {
  CheckCircle2,
  CircleAlert,
  CircleDot,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  Save,
  Trash2,
  Upload,
  UserRound,
} from "lucide-vue-next";
import ProfileAccountInfo from "@/components/profile/ProfileAccountInfo.vue";
import { usePerfil } from "@/composables/usePerfil";

const reduzir = useReducedMotion();
const {
  auth,
  avatarInput,
  avatarFile,
  avatarPreview,
  removerAvatar,
  avatarRemotoComErro,
  salvando,
  carregandoPerfil,
  erroCarregamento,
  mensagem,
  form,
  erros,
  iniciais,
  avatarExibido,
  temAlteracoes,
  ultimoAcesso,
  metodosLogin,
  estadoBooleano,
  restaurarFormulario,
  abrirSeletorFoto,
  selecionarFoto,
  marcarRemocaoAvatar,
  atualizarTelefone,
  salvarPerfil,
  carregarPerfil,
  limparErro,
} = usePerfil();
</script>

<style scoped src="./ProfileView.css"></style>
