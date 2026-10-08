<template>
  <div class="profile-page">
    <header class="profile-page__header">
      <div>
        <h1>Meu perfil</h1>
        <p>Gerencie seus dados pessoais e as formas de acesso à sua conta.</p>
      </div>

      <div
        class="profile-page__status"
        :class="{ 'is-verified': auth.usuario?.email_verified }"
      >
        <BadgeCheck v-if="auth.usuario?.email_verified" :size="17" />
        <CircleAlert v-else :size="17" />
        <span>{{
          auth.usuario?.email_verified
            ? "Conta verificada"
            : "E-mail não verificado"
        }}</span>
      </div>
    </header>

    <div class="profile-page__layout">
      <main class="profile-page__main">
        <section class="profile-card" aria-labelledby="perfil-identidade">
          <div class="profile-card__head">
            <h2 id="perfil-identidade">Foto de perfil</h2>
          </div>

          <div class="profile-avatar-editor">
            <div class="profile-avatar-editor__preview">
              <img
                v-if="avatarExibido"
                :src="avatarExibido"
                :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
                @error="avatarRemotoComErro = true"
              />
              <span v-else>{{ iniciais }}</span>

              <button
                type="button"
                class="profile-avatar-editor__camera"
                aria-label="Escolher nova foto de perfil"
                title="Alterar foto"
                @click="abrirSeletorFoto"
              >
                <Camera :size="17" />
              </button>
            </div>

            <div class="profile-avatar-editor__content">
              <strong>{{ auth.usuario?.name || "Aluno" }}</strong>
              <span>{{ auth.usuario?.email || "E-mail não informado" }}</span>

              <div class="profile-avatar-editor__actions">
                <button
                  type="button"
                  class="profile-link-btn"
                  @click="abrirSeletorFoto"
                >
                  <Upload :size="15" />
                  {{ avatarExibido ? "Trocar foto" : "Adicionar foto" }}
                </button>

                <button
                  v-if="avatarExibido || auth.usuario?.avatar"
                  type="button"
                  class="profile-link-btn profile-link-btn--danger"
                  @click="marcarRemocaoAvatar"
                >
                  <Trash2 :size="15" />
                  Remover
                </button>
              </div>

              <p>JPG, PNG ou WebP, com até 3 MB.</p>
            </div>

            <input
              ref="avatarInput"
              class="profile-avatar-editor__input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="selecionarFoto"
            />
          </div>

          <p v-if="erros.avatar" class="profile-field-error" role="alert">
            {{ erros.avatar }}
          </p>
        </section>

        <section class="profile-card" aria-labelledby="perfil-dados">
          <div class="profile-card__head profile-card__head--form">
            <h2 id="perfil-dados">Dados pessoais</h2>

            <span v-if="temAlteracoes" class="profile-unsaved">
              <CircleDot :size="13" />
              Alterações não salvas
            </span>
          </div>

          <form class="profile-form" @submit.prevent="salvarPerfil">
            <div class="profile-form__field profile-form__field--wide">
              <label for="profile-name">Nome completo</label>
              <div
                class="profile-form__control"
                :class="{ 'has-error': erros.name }"
              >
                <UserRound :size="17" />
                <input
                  id="profile-name"
                  v-model="form.name"
                  type="text"
                  maxlength="255"
                  autocomplete="name"
                  placeholder="Seu nome completo"
                  @input="limparErro('name')"
                />
              </div>
              <p v-if="erros.name" class="profile-field-error" role="alert">
                {{ erros.name }}
              </p>
            </div>

            <div class="profile-form__field">
              <label for="profile-phone">Telefone</label>
              <div
                class="profile-form__control"
                :class="{ 'has-error': erros.phone }"
              >
                <Phone :size="17" />
                <input
                  id="profile-phone"
                  :value="form.phone"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  placeholder="(47) 99999-9999"
                  maxlength="15"
                  @input="atualizarTelefone"
                />
              </div>
              <p v-if="erros.phone" class="profile-field-error" role="alert">
                {{ erros.phone }}
              </p>
            </div>

            <div class="profile-form__field">
              <label for="profile-email">E-mail</label>
              <div
                class="profile-form__control profile-form__control--readonly"
              >
                <Mail :size="17" />
                <input
                  id="profile-email"
                  :value="auth.usuario?.email || ''"
                  type="email"
                  readonly
                />
                <Lock :size="14" class="profile-form__lock" />
              </div>
              <span class="profile-form__hint"
                >A alteração de e-mail exige nova verificação da conta.</span
              >
            </div>

            <div class="profile-form__actions">
              <button
                type="button"
                class="profile-btn profile-btn--secondary"
                :disabled="salvando || !temAlteracoes"
                @click="restaurarFormulario"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="profile-btn profile-btn--primary"
                :disabled="salvando || !temAlteracoes"
              >
                <LoaderCircle v-if="salvando" :size="17" class="profile-spin" />
                <Save v-else :size="17" />
                {{ salvando ? "Salvando..." : "Salvar alterações" }}
              </button>
            </div>
          </form>
        </section>
      </main>

      <aside class="profile-page__aside">
        <section class="profile-card" aria-labelledby="perfil-seguranca">
          <div class="profile-card__head profile-card__head--with-icon">
            <h2 id="perfil-seguranca">Segurança da conta</h2>
            <ShieldCheck :size="20" />
          </div>

          <div class="profile-security-list">
            <div class="profile-security-item">
              <span class="profile-security-item__icon"
                ><MailCheck :size="18"
              /></span>
              <div>
                <strong>E-mail</strong>
                <span>{{
                  auth.usuario?.email_verified
                    ? "Verificado"
                    : "Pendente de verificação"
                }}</span>
              </div>
              <span
                class="profile-security-item__state"
                :class="{ 'is-positive': auth.usuario?.email_verified }"
              >
                {{ auth.usuario?.email_verified ? "Ativo" : "Pendente" }}
              </span>
            </div>

            <div class="profile-security-item">
              <span class="profile-security-item__icon"
                ><Chrome :size="18"
              /></span>
              <div>
                <strong>Conta Google</strong>
                <span>{{
                  auth.usuario?.google_connected ? "Conectada" : "Não vinculada"
                }}</span>
              </div>
              <span
                class="profile-security-item__state"
                :class="{ 'is-positive': auth.usuario?.google_connected }"
              >
                {{ auth.usuario?.google_connected ? "Conectada" : "Opcional" }}
              </span>
            </div>

            <div class="profile-security-item">
              <span class="profile-security-item__icon"
                ><KeyRound :size="18"
              /></span>
              <div>
                <strong>Senha</strong>
                <span>{{
                  auth.usuario?.has_usable_password
                    ? "Senha configurada"
                    : "Somente provedor externo"
                }}</span>
              </div>
              <span
                class="profile-security-item__state"
                :class="{ 'is-positive': auth.usuario?.has_usable_password }"
              >
                {{
                  auth.usuario?.has_usable_password
                    ? "Configurada"
                    : "Não definida"
                }}
              </span>
            </div>
          </div>

          <div class="profile-security-note">
            <LockKeyhole :size="16" />
            <p>O e-mail não é alterado diretamente nesta tela por segurança.</p>
          </div>
        </section>

        <section class="profile-card" aria-labelledby="perfil-resumo">
          <div class="profile-card__head">
            <h2 id="perfil-resumo">Conta</h2>
          </div>

          <dl class="profile-summary-list">
            <div>
              <dt>Tipo de conta</dt>
              <dd>{{ auth.isAdmin ? "Administração" : "Aluno" }}</dd>
            </div>
            <div>
              <dt>Último acesso</dt>
              <dd>{{ ultimoAcesso }}</dd>
            </div>
            <div>
              <dt>Login disponível</dt>
              <dd>{{ metodosLogin }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>

    <Transition name="profile-toast">
      <div
        v-if="mensagem"
        class="profile-toast"
        :class="`profile-toast--${mensagem.tipo}`"
        role="status"
      >
        <CheckCircle2 v-if="mensagem.tipo === 'success'" :size="19" />
        <CircleAlert v-else :size="19" />
        <span>{{ mensagem.texto }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Chrome,
  CircleAlert,
  CircleDot,
  KeyRound,
  LoaderCircle,
  Lock,
  LockKeyhole,
  Mail,
  MailCheck,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-vue-next";

import { useAuthStore } from "@/stores/auth";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const auth = useAuthStore();
const avatarInput = ref(null);
const avatarFile = ref(null);
const avatarPreview = ref("");
const removerAvatar = ref(false);
const avatarRemotoComErro = ref(false);
const salvando = ref(false);
const mensagem = ref(null);
let toastTimer = null;

const form = reactive({
  name: "",
  phone: "",
});

const erros = reactive({
  name: "",
  phone: "",
  avatar: "",
});

const iniciais = computed(() => {
  const nome = form.name || auth.usuario?.name || "";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "A"
  );
});

const avatarExibido = computed(() => {
  if (avatarPreview.value) return avatarPreview.value;
  if (removerAvatar.value || avatarRemotoComErro.value) return "";
  return auth.usuario?.avatar || "";
});

const telefoneOriginal = computed(() =>
  formatarTelefone(auth.usuario?.phone || ""),
);

const temAlteracoes = computed(() => {
  const nomeMudou =
    form.name.trim() !== String(auth.usuario?.name || "").trim();
  const telefoneMudou = form.phone !== telefoneOriginal.value;

  return (
    nomeMudou ||
    telefoneMudou ||
    Boolean(avatarFile.value) ||
    removerAvatar.value
  );
});

const ultimoAcesso = computed(() => {
  const valor = auth.usuario?.last_login;
  if (!valor) return "Primeiro acesso";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Não disponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
});

const metodosLogin = computed(() => {
  const metodos = [];
  if (auth.usuario?.has_usable_password) metodos.push("E-mail e senha");
  if (auth.usuario?.google_connected) metodos.push("Google");
  return metodos.length ? metodos.join(" + ") : "Sessão autenticada";
});

watch(
  () => auth.usuario,
  () => {
    restaurarFormulario({ preservarMensagem: true });
    avatarRemotoComErro.value = false;
  },
  { immediate: true, deep: true },
);

function restaurarFormulario({ preservarMensagem = false } = {}) {
  form.name = String(auth.usuario?.name || "");
  form.phone = telefoneOriginal.value;

  avatarFile.value = null;
  removerAvatar.value = false;
  avatarRemotoComErro.value = false;
  limparPreview();
  limparErros();

  if (avatarInput.value) avatarInput.value.value = "";
  if (!preservarMensagem) mensagem.value = null;
}

function abrirSeletorFoto() {
  avatarInput.value?.click();
}

function selecionarFoto(event) {
  limparErro("avatar");

  const arquivo = event.target.files?.[0];
  if (!arquivo) return;

  if (!ALLOWED_AVATAR_TYPES.has(arquivo.type)) {
    erros.avatar = "Escolha uma imagem JPG, PNG ou WebP.";
    event.target.value = "";
    return;
  }

  if (arquivo.size > MAX_AVATAR_BYTES) {
    erros.avatar = "A foto de perfil deve ter no máximo 3 MB.";
    event.target.value = "";
    return;
  }

  limparPreview();
  avatarFile.value = arquivo;
  avatarPreview.value = URL.createObjectURL(arquivo);
  removerAvatar.value = false;
}

function marcarRemocaoAvatar() {
  avatarFile.value = null;
  removerAvatar.value = Boolean(auth.usuario?.avatar);
  avatarRemotoComErro.value = false;
  limparPreview();
  limparErro("avatar");

  if (avatarInput.value) avatarInput.value.value = "";
}

function atualizarTelefone(event) {
  form.phone = mascararTelefone(event.target.value);
  limparErro("phone");
}

function mascararTelefone(valor) {
  const digitos = String(valor || "")
    .replace(/\D/g, "")
    .replace(/^55(?=\d{10,11}$)/, "")
    .slice(0, 11);

  if (!digitos) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function formatarTelefone(valor) {
  return mascararTelefone(valor);
}

async function salvarPerfil() {
  limparErros();

  if (!form.name.trim()) {
    erros.name = "Informe seu nome completo.";
    return;
  }

  salvando.value = true;

  try {
    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("phone", form.phone.trim());

    if (avatarFile.value) {
      payload.append("avatar", avatarFile.value);
    } else if (removerAvatar.value) {
      payload.append("remove_avatar", "true");
    }

    const resultado = await auth.atualizarPerfil(payload);

    if (!resultado.ok) {
      Object.assign(erros, {
        name: resultado.campos?.name || "",
        phone: resultado.campos?.phone || "",
        avatar: resultado.campos?.avatar || "",
      });

      exibirMensagem(
        "error",
        resultado.erro || "Não foi possível salvar seu perfil.",
      );
      return;
    }

    avatarFile.value = null;
    removerAvatar.value = false;
    avatarRemotoComErro.value = false;
    limparPreview();
    form.name = String(auth.usuario?.name || "");
    form.phone = formatarTelefone(auth.usuario?.phone || "");

    if (avatarInput.value) avatarInput.value.value = "";

    exibirMensagem("success", "Perfil atualizado com sucesso.");
  } finally {
    salvando.value = false;
  }
}

function limparErro(campo) {
  erros[campo] = "";
}

function limparErros() {
  erros.name = "";
  erros.phone = "";
  erros.avatar = "";
}

function limparPreview() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value);
    avatarPreview.value = "";
  }
}

function exibirMensagem(tipo, texto) {
  mensagem.value = { tipo, texto };
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    mensagem.value = null;
  }, 4200);
}

onBeforeUnmount(() => {
  limparPreview();
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
.profile-page {
  width: min(1120px, 100%);
  margin: 0 auto;
  color: var(--student-text, #28231f);
}

.profile-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-page__header h1 {
  margin: 0;
  color: #211d1a;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.profile-page__header p {
  margin: 6px 0 0;
  color: #756e67;
  font-size: 13px;
  line-height: 1.5;
}

.profile-page__status {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #dfd9d3;
  border-radius: 8px;
  background: #fff;
  color: #706961;
  font-size: 10.5px;
  font-weight: 700;
}

.profile-page__status.is-verified {
  border-color: #cbdccf;
  background: #f4f8f4;
  color: #4c6e52;
}

.profile-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(290px, 0.75fr);
  align-items: start;
  gap: 20px;
}

.profile-page__main,
.profile-page__aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-card {
  padding: 22px;
  border: 1px solid #dfdbd6;
  border-radius: 12px;
  background: #fff;
}

.profile-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.profile-card__head--with-icon > svg {
  color: #766e67;
}

.profile-card__head h2 {
  margin: 0;
  color: #29231f;
  font-size: 17px;
  line-height: 1.25;
}

.profile-avatar-editor {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-avatar-editor__preview {
  width: 78px;
  height: 78px;
  position: relative;
  flex: 0 0 78px;
  display: grid;
  place-items: center;
  overflow: visible;
  border: 1px solid #ded8d2;
  border-radius: 50%;
  background: #eee7dd;
  color: #7c561a;
  font-size: 22px;
  font-weight: 750;
}

.profile-avatar-editor__preview img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  object-fit: cover;
}

.profile-avatar-editor__camera {
  width: 30px;
  height: 30px;
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #2b1d15;
  color: #fff;
  cursor: pointer;
}

.profile-avatar-editor__content {
  min-width: 0;
  flex: 1;
}

.profile-avatar-editor__content > strong {
  display: block;
  color: #2b2521;
  font-size: 14px;
}

.profile-avatar-editor__content > span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #7b746e;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-avatar-editor__content > p {
  margin: 8px 0 0;
  color: #98918b;
  font-size: 10px;
}

.profile-avatar-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 11px;
}

.profile-avatar-editor__input {
  display: none;
}

.profile-link-btn {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid #dcd7d1;
  border-radius: 8px;
  background: #fff;
  color: #5d5650;
  font: inherit;
  font-size: 10.5px;
  font-weight: 650;
  cursor: pointer;
}

.profile-link-btn--danger {
  color: #a54b43;
}

.profile-unsaved {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #8a641f;
  font-size: 10px;
  font-weight: 650;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-form__field {
  min-width: 0;
}

.profile-form__field--wide {
  grid-column: 1 / -1;
}

.profile-form__field label {
  display: block;
  margin-bottom: 7px;
  color: #4b443e;
  font-size: 11px;
  font-weight: 650;
}

.profile-form__control {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #dcd7d1;
  border-radius: 8px;
  background: #fff;
  color: #8e8780;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.profile-form__control:focus-within {
  border-color: #aa7a35;
  box-shadow: 0 0 0 3px rgba(167, 107, 23, 0.08);
}

.profile-form__control.has-error {
  border-color: #c86459;
  box-shadow: 0 0 0 3px rgba(200, 100, 89, 0.08);
}

.profile-form__control--readonly {
  background: #f6f4f1;
}

.profile-form__control input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #312b27;
  font: inherit;
  font-size: 12px;
}

.profile-form__control input[readonly] {
  color: #7e7771;
}

.profile-form__lock {
  flex: 0 0 auto;
  color: #aaa39d;
}

.profile-form__hint {
  display: block;
  margin: 6px 2px 0;
  color: #98918b;
  font-size: 9.5px;
  line-height: 1.45;
}

.profile-field-error {
  margin: 6px 2px 0;
  color: #b34e45;
  font-size: 10px;
  font-weight: 600;
}

.profile-form__actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}

.profile-btn {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.profile-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.profile-btn--secondary {
  border: 1px solid #dcd7d1;
  background: #fff;
  color: #5e5751;
}

.profile-btn--primary {
  border: 1px solid #2b1d15;
  background: #2b1d15;
  color: #fff;
}

.profile-btn--primary:hover:not(:disabled) {
  background: #1f1510;
}

.profile-security-list {
  border-top: 1px solid #eeeae6;
}

.profile-security-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid #eeeae6;
}

.profile-security-item__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #f3f0ec;
  color: #7e6a4d;
}

.profile-security-item strong,
.profile-security-item div > span {
  display: block;
}

.profile-security-item strong {
  color: #332d28;
  font-size: 11.5px;
}

.profile-security-item div > span {
  margin-top: 2px;
  color: #8c857f;
  font-size: 9.5px;
}

.profile-security-item__state {
  color: #7d756e;
  font-size: 8.5px;
  font-weight: 750;
  text-transform: uppercase;
}

.profile-security-item__state.is-positive {
  color: #52705a;
}

.profile-security-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 15px;
  padding: 11px 12px;
  border-radius: 8px;
  background: #f6f4f1;
  color: #837b75;
}

.profile-security-note svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.profile-security-note p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.45;
}

.profile-summary-list {
  margin: 0;
}

.profile-summary-list > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid #eeeae6;
}

.profile-summary-list > div:first-child {
  padding-top: 0;
}

.profile-summary-list > div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.profile-summary-list dt {
  color: #817a74;
  font-size: 10px;
}

.profile-summary-list dd {
  margin: 0;
  color: #332d28;
  font-size: 10px;
  font-weight: 700;
  text-align: right;
}

.profile-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 80;
  max-width: min(380px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border: 1px solid #c9ddcd;
  border-radius: 9px;
  background: #f2f8f3;
  color: #3f6748;
  box-shadow: 0 10px 24px rgba(42, 31, 23, 0.12);
  font-size: 11px;
  font-weight: 650;
}

.profile-toast--error {
  border-color: #ead0cc;
  background: #fff5f3;
  color: #a34d44;
}

.profile-spin {
  animation: profile-spin 700ms linear infinite;
}

.profile-toast-enter-active,
.profile-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.profile-toast-enter-from,
.profile-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .profile-page__layout {
    grid-template-columns: 1fr;
  }

  .profile-page__aside {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .profile-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .profile-page__header h1 {
    font-size: 25px;
  }

  .profile-card {
    padding: 18px;
    border-radius: 10px;
  }

  .profile-page__aside {
    display: flex;
  }

  .profile-avatar-editor {
    align-items: flex-start;
  }

  .profile-form {
    grid-template-columns: 1fr;
  }

  .profile-form__field--wide,
  .profile-form__actions {
    grid-column: auto;
  }

  .profile-form__actions {
    flex-direction: column-reverse;
  }

  .profile-btn {
    width: 100%;
  }

  .profile-security-item {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .profile-security-item__state {
    grid-column: 2;
    justify-self: start;
  }

  .profile-toast {
    left: 16px;
    right: 16px;
    bottom: 80px;
    justify-content: center;
  }
}

@media (max-width: 420px) {
  .profile-avatar-editor {
    flex-direction: column;
  }

  .profile-avatar-editor__content {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-spin {
    animation: none;
  }

  .profile-toast-enter-active,
  .profile-toast-leave-active {
    transition: none;
  }
}
</style>
