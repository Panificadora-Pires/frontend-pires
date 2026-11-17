<template>
  <motion.div
    class="profile-page"
    :initial="{ opacity: 1, y: reduzir ? 0 : 8 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: reduzir ? 0 : 0.2 }"
  >
    <header class="profile-page__header">
      <h1>
        Meu perfil
      </h1>
      <p>
        Seus dados, sua conta. Tudo em um só lugar.
      </p>
    </header>
    <div v-if="!auth.usuario" class="profile-load-state" :aria-busy="carregandoPerfil">
      <LoaderCircle v-if="carregandoPerfil" :size="28" class="profile-spin" aria-hidden="true" />
      <CircleAlert v-else :size="28" aria-hidden="true" />
      <h2>
        {{ carregandoPerfil ? 'Carregando seu perfil' : 'Não foi possível carregar seu perfil' }}
      </h2>
      <p role="status">
        {{ erroCarregamento || 'Aguarde enquanto buscamos seus dados.' }}
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
      <div class="profile-page__main">
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
              {{ auth.usuario.name || 'Nome não informado' }}
            </h2>
            <p class="profile-identity__email">
              {{ auth.usuario.email || 'E-mail não informado' }}
            </p>
            <p class="profile-identity__verification">
              <MailCheck :size="16" aria-hidden="true" />
              <span>
                E-mail: {{ estadoBooleano(auth.usuario.email_verified, 'Verificado', 'Não verificado') }}
              </span>
            </p>
            <div class="profile-avatar-actions">
              <button
                id="profile-avatar-trigger"
                type="button"
                class="profile-text-btn"
                :disabled="salvando"
                :aria-invalid="Boolean(erros.avatar)"
                :aria-describedby="erros.avatar ? 'profile-avatar-help profile-avatar-error' : 'profile-avatar-help'"
                @click="abrirSeletorFoto"
              >
                <Upload :size="17" aria-hidden="true" />
                {{ avatarExibido ? 'Trocar foto' : 'Adicionar foto' }}
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
            <p v-if="avatarPreview || removerAvatar" class="profile-avatar-pending" role="status">
              {{ removerAvatar ? 'Foto marcada para remoção. Salve para confirmar.' : 'Prévia da nova foto. Salve para confirmar.' }}
            </p>
            <p v-if="erros.avatar" id="profile-avatar-error" class="profile-field-error">
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
            <h2 id="perfil-dados">
              Dados pessoais
            </h2>
            <span v-if="temAlteracoes" class="profile-unsaved">
              <CircleDot :size="14" aria-hidden="true" />
              Alterações não salvas
            </span>
          </div>
          <p class="profile-section-intro">
            Mantenha seu nome e telefone atualizados.
          </p>
          <form class="profile-form" novalidate :aria-busy="salvando" @submit.prevent="salvarPerfil">
            <div class="profile-field profile-field--wide">
              <label for="profile-name">
                Nome completo
              </label>
              <input
                id="profile-name"
                v-model="form.name"
                type="text"
                maxlength="255"
                autocomplete="name"
                required
                :disabled="salvando"
                :aria-invalid="Boolean(erros.name)"
                :aria-describedby="erros.name ? 'profile-name-error' : undefined"
                @input="limparErro('name')"
              />
              <p v-if="erros.name" id="profile-name-error" class="profile-field-error">
                {{ erros.name }}
              </p>
            </div>
            <div class="profile-field profile-field--wide">
              <label for="profile-email">
                E-mail
              </label>
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
                Este é o e-mail de acesso à sua conta. Ele não pode ser alterado nesta tela.
              </p>
            </div>
            <div class="profile-field profile-field--phone">
              <label for="profile-phone">
                Telefone
              </label>
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
                :aria-describedby="erros.phone ? 'profile-phone-help profile-phone-error' : 'profile-phone-help'"
                @input="atualizarTelefone"
              />
              <p id="profile-phone-help" class="profile-hint">
                Informe o DDD e o número.
              </p>
              <p v-if="erros.phone" id="profile-phone-error" class="profile-field-error">
                {{ erros.phone }}
              </p>
            </div>
            <div class="profile-form__actions">
              <button
                type="submit"
                class="profile-btn profile-btn--primary"
                :disabled="salvando || !temAlteracoes"
              >
                <LoaderCircle v-if="salvando" :size="18" class="profile-spin" aria-hidden="true" />
                <Save v-else :size="18" aria-hidden="true" />
                {{ salvando ? 'Salvando...' : 'Salvar alterações' }}
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
            <div class="profile-feedback-region" aria-live="polite" aria-atomic="true">
              <motion.div
                v-if="mensagem"
                :key="mensagem.texto"
                class="profile-feedback"
                :class="`profile-feedback--${mensagem.tipo}`"
                :initial="{ opacity: reduzir ? 1 : 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: reduzir ? 0 : 0.18 }"
              >
                <CheckCircle2 v-if="mensagem.tipo === 'success'" :size="20" aria-hidden="true" />
                <CircleAlert v-else :size="20" aria-hidden="true" />
                <p>
                  {{ mensagem.texto }}
                </p>
              </motion.div>
            </div>
          </form>
        </section>
      </div>
      <aside class="profile-page__aside" aria-label="Informações da conta">
        <section class="profile-security" aria-labelledby="perfil-seguranca">
          <ShieldCheck :size="27" class="profile-security__icon" aria-hidden="true" />
          <h2 id="perfil-seguranca">
            Segurança da conta
          </h2>
          <dl class="profile-security-list">
            <div>
              <dt>
                <MailCheck :size="18" aria-hidden="true" />
                E-mail
              </dt>
              <dd :class="{ 'is-positive': auth.usuario.email_verified === true }">
                {{ estadoBooleano(auth.usuario.email_verified, 'Verificado', 'Não verificado') }}
              </dd>
            </div>
            <div>
              <dt>
                <Chrome :size="18" aria-hidden="true" />
                Conta Google
              </dt>
              <dd>
                {{ estadoBooleano(auth.usuario.google_connected, 'Conectada', 'Não vinculada') }}
              </dd>
            </div>
            <div>
              <dt>
                <KeyRound :size="18" aria-hidden="true" />
                Senha
              </dt>
              <dd>
                {{ estadoBooleano(auth.usuario.has_usable_password, 'Configurada', 'Não definida') }}
              </dd>
            </div>
          </dl>
          <p class="profile-hint">
            Estas informações mostram as formas de acesso já configuradas na sua conta.
          </p>
        </section>
        <section class="profile-account" aria-labelledby="perfil-resumo">
          <h2 id="perfil-resumo">
            Sua conta
          </h2>
          <dl class="profile-summary-list">
            <div>
              <dt>
                Tipo de conta
              </dt>
              <dd>
                {{ estadoBooleano(auth.usuario.is_staff, 'Administração', 'Aluno') }}
              </dd>
            </div>
            <div>
              <dt>
                Último acesso
              </dt>
              <dd>
                {{ ultimoAcesso }}
              </dd>
            </div>
            <div>
              <dt>
                Formas de acesso
              </dt>
              <dd>
                {{ metodosLogin }}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  </motion.div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { motion, useReducedMotion } from "motion-v";
import {
  CheckCircle2,
  Chrome,
  CircleAlert,
  CircleDot,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { getSessionVersion } from "@/services/api";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const auth = useAuthStore();
const reduzir = useReducedMotion();
const avatarInput = ref(null);
const avatarFile = ref(null);
const avatarPreview = ref("");
const removerAvatar = ref(false);
const avatarRemotoComErro = ref(false);
const salvando = ref(false);
const carregandoPerfil = ref(!auth.usuario);
const erroCarregamento = ref("");
const mensagem = ref(null);
const confirmado = ref(null);
const form = reactive({ name: "", phone: "" });
const erros = reactive({ name: "", phone: "", avatar: "" });
let ativo = true;
let versaoFormulario = getSessionVersion();
let operacao = 0;
let buscaPendente = false;

const iniciais = computed(() =>
  String(auth.usuario?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0]?.toUpperCase())
    .join(""),
);
const avatarExibido = computed(() => {
  if (avatarRemotoComErro.value) return "";
  if (avatarPreview.value) return avatarPreview.value;
  return removerAvatar.value ? "" : auth.usuario?.avatar || "";
});
const temAlteracoes = computed(() => Boolean(confirmado.value) && (
  form.name.trim() !== String(confirmado.value.name || "").trim() ||
  form.phone !== mascararTelefone(confirmado.value.phone) ||
  Boolean(avatarFile.value) ||
  removerAvatar.value
));
const ultimoAcesso = computed(() => {
  const valor = auth.usuario?.last_login;
  if (!valor) return "Não disponível";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Não disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
});
const metodosLogin = computed(() => {
  const metodos = [];
  if (auth.usuario?.has_usable_password === true) metodos.push("E-mail e senha");
  if (auth.usuario?.google_connected === true) metodos.push("Google");
  return metodos.join(" + ") || "Não disponível";
});

// Confirmações acompanham o servidor; refresh da mesma conta não é edição do rascunho.
watch(
  () => auth.usuario,
  (usuario) => {
    const novaSessao = versaoFormulario !== getSessionVersion() ||
      confirmado.value?.id !== usuario?.id;
    const preservarRascunho = !novaSessao && temAlteracoes.value;
    const avatarAnterior = confirmado.value?.avatar;
    confirmado.value = usuario ? { ...usuario } : null;
    if (novaSessao) {
      versaoFormulario = getSessionVersion();
      operacao++;
      salvando.value = false;
      erroCarregamento.value = "";
    }
    if (!preservarRascunho) restaurarFormulario();
    if (avatarAnterior !== usuario?.avatar) avatarRemotoComErro.value = false;
  },
  { immediate: true, deep: true, flush: "sync" },
);

function estadoBooleano(valor, sim, nao) {
  return valor === true ? sim : valor === false ? nao : "Não disponível";
}

function contextoAtual(contexto) {
  return ativo &&
    contexto.versao === getSessionVersion() &&
    contexto.id === auth.usuario?.id &&
    contexto.operacao === operacao;
}

function restaurarFormulario() {
  if (salvando.value) return;
  form.name = String(confirmado.value?.name || "");
  form.phone = mascararTelefone(confirmado.value?.phone);
  avatarFile.value = null;
  removerAvatar.value = false;
  avatarRemotoComErro.value = false;
  limparPreview();
  limparErros();
  mensagem.value = null;
  if (avatarInput.value) avatarInput.value.value = "";
}
function abrirSeletorFoto() {
  if (!salvando.value) avatarInput.value?.click();
}

function selecionarFoto(event) {
  if (salvando.value) return;
  limparErro("avatar");
  const arquivo = event.target.files?.[0];
  if (!arquivo) return;
  if (!ALLOWED_AVATAR_TYPES.has(arquivo.type) || arquivo.size > MAX_AVATAR_BYTES) {
    erros.avatar = !ALLOWED_AVATAR_TYPES.has(arquivo.type)
      ? "Escolha uma imagem JPG, PNG ou WebP."
      : "A foto de perfil deve ter no máximo 3 MB.";
    event.target.value = "";
    focarPrimeiroErro();
    return;
  }
  limparPreview();
  avatarFile.value = arquivo;
  avatarPreview.value = URL.createObjectURL(arquivo);
  removerAvatar.value = false;
  avatarRemotoComErro.value = false;
}

function marcarRemocaoAvatar() {
  if (salvando.value) return;
  avatarFile.value = null;
  removerAvatar.value = Boolean(confirmado.value?.avatar);
  avatarRemotoComErro.value = false;
  limparPreview();
  limparErro("avatar");
  if (avatarInput.value) avatarInput.value.value = "";
  document.getElementById("profile-avatar-trigger")?.focus();
}

function atualizarTelefone(event) {
  if (salvando.value) return;
  form.phone = mascararTelefone(event.target.value);
  event.target.value = form.phone;
  limparErro("phone");
}

function mascararTelefone(valor) {
  const digitos = String(valor || "")
    .replace(/\D/g, "")
    .replace(/^55(?=\d{10,11}$)/, "")
    .slice(0, 11);
  if (!digitos) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  const corte = digitos.length <= 10 ? 6 : 7;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, corte)}-${digitos.slice(corte)}`;
}

async function salvarPerfil() {
  if (salvando.value || !auth.usuario || !temAlteracoes.value) return;
  limparErros();
  mensagem.value = null;
  if (!form.name.trim()) {
    erros.name = "Informe seu nome completo.";
    await focarPrimeiroErro();
    return;
  }
  const contexto = {
    versao: getSessionVersion(),
    id: auth.usuario.id,
    operacao: ++operacao,
  };
  salvando.value = true;
  try {
    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("phone", form.phone.trim());
    if (avatarFile.value) payload.append("avatar", avatarFile.value);
    else if (removerAvatar.value) payload.append("remove_avatar", "true");
    const resultado = await auth.atualizarPerfil(payload);
    if (!contextoAtual(contexto) || resultado?.ignorado) return;
    if (!resultado?.ok) {
      Object.assign(erros, {
        name: resultado?.campos?.name || "",
        phone: resultado?.campos?.phone || "",
        avatar: resultado?.campos?.avatar || "",
      });
      mensagem.value = {
        tipo: "error",
        texto: resultado?.erro || "Não foi possível salvar seu perfil. Tente novamente.",
      };
      salvando.value = false;
      await focarPrimeiroErro(contexto);
      return;
    }
    confirmado.value = { ...auth.usuario };
    salvando.value = false;
    restaurarFormulario();
    mensagem.value = { tipo: "success", texto: "Perfil atualizado com sucesso." };
  } catch {
    if (contextoAtual(contexto)) {
      mensagem.value = {
        tipo: "error",
        texto: "Não foi possível salvar seu perfil. Verifique sua conexão e tente novamente.",
      };
    }
  } finally {
    if (contextoAtual(contexto)) salvando.value = false;
  }
}

async function focarPrimeiroErro(contexto) {
  await nextTick();
  if (!ativo || (contexto && !contextoAtual(contexto))) return;
  const campo = ["name", "phone", "avatar"].find(chave => erros[chave]);
  if (campo) {
    document.getElementById(
      campo === "avatar" ? "profile-avatar-trigger" : `profile-${campo}`,
    )?.focus();
  }
}

async function carregarPerfil() {
  if (buscaPendente || !ativo) return;
  const versao = getSessionVersion();
  buscaPendente = true;
  carregandoPerfil.value = true;
  erroCarregamento.value = "";
  try {
    const usuario = await auth.buscarUsuarioLogado();
    if (ativo && versao === getSessionVersion() && !usuario && !auth.usuario) {
      erroCarregamento.value = "Seus dados não estão disponíveis. Tente novamente.";
    }
  } catch {
    if (ativo && versao === getSessionVersion()) {
      erroCarregamento.value = "Verifique sua conexão e tente novamente.";
    }
  } finally {
    buscaPendente = false;
    if (ativo && versao === getSessionVersion()) carregandoPerfil.value = false;
  }
}

function limparErro(campo) {
  erros[campo] = "";
  mensagem.value = null;
}

function limparErros() {
  Object.assign(erros, { name: "", phone: "", avatar: "" });
}

function limparPreview() {
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value);
  avatarPreview.value = "";
}

onMounted(() => {
  if (!auth.usuario) return carregarPerfil();
});

onBeforeUnmount(() => {
  ativo = false;
  operacao++;
  limparPreview();
});
</script>

<style scoped>
.profile-page {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 12px 0 72px;
  color: var(--pp-marrom);
}

.profile-page :is(button, input) {
  scroll-margin-block: calc(var(--pp-space-6) * 2 + var(--pp-space-4));
}

.profile-page :is(button, input):focus-visible {
  outline: 3px solid var(--pp-dourado-profundo);
  outline-offset: 4px;
}

.profile-page ::selection {
  background: var(--pp-creme-borda);
  color: var(--pp-marrom);
}

.profile-page__header {
  margin-bottom: 48px;
}

.profile-page__header h1 {
  margin: 0;
  font-family: var(--pp-font-titulo);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -.025em;
}

.profile-page__header p {
  margin: 14px 0 0;
  color: var(--pp-texto-2);
  font-size: 16px;
  line-height: 1.6;
}

.profile-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 48px;
}

.profile-page__main, .profile-page__aside, .profile-identity__content {
  min-width: 0;
}

.profile-identity {
  position: relative;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 0 0 36px;
  border-bottom: 1px solid var(--pp-creme-borda);
}

.profile-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 128px;
  width: 128px;
  height: 128px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--pp-creme-2);
  color: var(--pp-marrom-2);
  font-size: 40px;
  font-weight: 600;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar.is-preview img {
  animation: profile-preview 180ms ease-out;
}

.profile-identity h2 {
  margin: 0;
  font-size: clamp(24px, 2.4vw, 32px);
  font-weight: 600;
  letter-spacing: -.025em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.profile-identity__email {
  margin: 8px 0 6px;
  color: var(--pp-texto-2);
  font-size: 15px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.profile-identity__verification {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 8px;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.5;
}

.profile-identity__verification svg {
  flex-shrink: 0;
}

.profile-avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0 20px;
}

.profile-text-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--pp-dourado-profundo);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.profile-text-btn:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.profile-file-input {
  display: none;
}

.profile-hint {
  margin: 0;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.6;
}

.profile-avatar-pending {
  margin: 6px 0 0;
  color: var(--pp-dourado-profundo);
  font-size: 14px;
  line-height: 1.5;
}

.profile-details {
  padding-top: 32px;
}

.profile-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-details h2, .profile-page__aside h2, .profile-load-state h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -.02em;
}

.profile-section-intro {
  margin: 8px 0 28px;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.6;
}

.profile-unsaved {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--pp-dourado-profundo);
  font-size: 13px;
  line-height: 1.5;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.profile-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.profile-field--wide {
  grid-column: 1 / -1;
}

.profile-field--phone {
  grid-column: 1 / -1;
  max-width: 320px;
}

.profile-field label {
  font-size: 14px;
  font-weight: 600;
}

.profile-field input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 50px;
  padding: 12px 15px;
  border: 1px solid var(--pp-texto-3);
  border-radius: var(--pp-radius-sm);
  background: var(--pp-creme);
  color: var(--pp-marrom);
  font: 400 16px/1.5 var(--pp-font-body);
  caret-color: var(--pp-dourado-profundo);
}

.profile-field input::placeholder {
  color: var(--pp-texto-3);
  opacity: 1;
}

.profile-field input[aria-invalid="true"] {
  border-color: var(--pp-marrom-2);
  border-width: 2px;
}

.profile-readonly {
  position: relative;
}

.profile-readonly input {
  padding-right: 44px;
  background: var(--pp-creme-2);
  color: var(--pp-texto-2);
}

.profile-readonly > svg {
  position: absolute;
  right: 15px;
  top: 16px;
  color: var(--pp-texto-2);
  pointer-events: none;
}

.profile-field-error {
  margin: 0;
  color: var(--pp-marrom-2);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.profile-form__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.profile-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 13px 22px;
  border: 1px solid transparent;
  border-radius: var(--pp-radius-sm);
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  cursor: pointer;
}

.profile-btn--primary {
  background: var(--pp-marrom);
  color: var(--pp-creme);
}

.profile-btn--primary:hover:not(:disabled) {
  background: var(--pp-marrom-2);
}

.profile-btn--secondary {
  border-color: var(--pp-creme-borda);
  background: transparent;
  color: var(--pp-marrom);
}

.profile-btn--secondary:hover:not(:disabled) {
  background: var(--pp-creme-2);
}

.profile-page button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.profile-field input:disabled {
  opacity: .7;
  cursor: wait;
}

.profile-feedback-region {
  grid-column: 1 / -1;
  min-height: 28px;
}

.profile-feedback {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--pp-marrom-2);
}

.profile-feedback > svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.profile-feedback p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.profile-feedback--success {
  color: var(--pp-verde);
}

.profile-page__aside {
  padding-top: 4px;
}

.profile-security {
  padding: 26px 24px;
  border-radius: 14px;
  background: var(--pp-creme-2);
}

.profile-security__icon {
  margin-bottom: 14px;
  color: var(--pp-dourado-profundo);
}

.profile-security-list {
  display: grid;
  gap: 22px;
  margin: 26px 0;
}

.profile-security-list dt {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
}

.profile-security-list dt svg {
  color: var(--pp-texto-2);
  flex-shrink: 0;
}

.profile-security-list dd {
  margin: 6px 0 0 28px;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.profile-security-list dd.is-positive {
  color: var(--pp-marrom-2);
}

.profile-account {
  margin-top: 30px;
  padding: 0 0 0 24px;
}

.profile-summary-list {
  margin: 20px 0 0;
}

.profile-summary-list > div {
  padding: 15px 0;
  border-bottom: 1px solid var(--pp-creme-borda);
}

.profile-summary-list dt {
  color: var(--pp-texto-2);
  font-size: 13px;
  line-height: 1.5;
}

.profile-summary-list dd {
  margin: 5px 0 0;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.profile-load-state {
  max-width: 600px;
  padding: 40px 0;
}

.profile-load-state > svg {
  margin-bottom: 18px;
  color: var(--pp-dourado-profundo);
}

.profile-load-state p {
  margin: 12px 0 24px;
  color: var(--pp-texto-2);
  line-height: 1.6;
}

.profile-spin {
  animation: profile-spin 900ms linear infinite;
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes profile-preview {
  from {
    opacity: .5;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1000px) {
  .profile-page__layout {
    gap: 32px;
    grid-template-columns: minmax(0, 1fr) 280px;
  }
  .profile-identity {
    align-items: flex-start;
    gap: 20px;
  }
  .profile-avatar {
    flex-basis: 104px;
    width: 104px;
    height: 104px;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding-top: 8px;
    padding-bottom: 96px;
  }
  .profile-page__header {
    margin-bottom: 32px;
  }
  .profile-page__header h1 {
    font-size: 40px;
  }
  .profile-page__header p {
    font-size: 15px;
    max-width: 32ch;
  }
  .profile-page__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }
  .profile-identity {
    align-items: center;
  }
  .profile-avatar {
    flex-basis: 96px;
    width: 96px;
    height: 96px;
    font-size: 32px;
  }
  .profile-identity h2 {
    font-size: 24px;
  }
  .profile-identity__email {
    font-size: 14px;
  }
  .profile-details {
    padding-top: 28px;
  }
  .profile-page__aside {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 28px;
  }
  .profile-account {
    margin-top: 0;
    padding: 20px 0 0;
  }
}

@media (max-width: 480px) {
  .profile-identity {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding-bottom: 28px;
  }
  .profile-avatar {
    flex-basis: 96px;
  }
  .profile-identity__content {
    width: 100%;
  }
  .profile-form {
    grid-template-columns: minmax(0, 1fr);
  }
  .profile-field--phone {
    max-width: none;
  }
  .profile-form__actions {
    flex-direction: column;
    align-items: stretch;
  }
  .profile-form__actions .profile-btn {
    width: 100%;
  }
  .profile-page__aside {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .profile-security {
    padding: 24px;
  }
  .profile-account {
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-spin, .profile-avatar.is-preview img {
    animation: none;
  }
}
</style>
