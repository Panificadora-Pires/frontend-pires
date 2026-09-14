<template>
  <div class="profile-page">
    <header class="profile-page__header">
      <div>
        <span class="profile-page__eyebrow">Minha conta</span>
        <h1>Meu perfil</h1>
        <p>Atualize seus dados pessoais e as configurações da sua conta.</p>
      </div>

      <div
        class="profile-page__status"
        :class="{ 'is-verified': auth.usuario?.email_verified }"
      >
        <BadgeCheck v-if="auth.usuario?.email_verified" :size="18" />
        <CircleAlert v-else :size="18" />
        <span>{{
          auth.usuario?.email_verified
            ? "Conta verificada"
            : "E-mail não verificado"
        }}</span>
      </div>
    </header>

    <div class="profile-page__grid">
      <section
        class="profile-card profile-card--identity"
        aria-labelledby="perfil-identidade"
      >
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Foto e identidade</span>
            <h2 id="perfil-identidade">Foto de perfil</h2>
          </div>
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
              <Camera :size="18" />
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
                <Upload :size="16" />
                {{ avatarExibido ? "Trocar foto" : "Adicionar foto" }}
              </button>

              <button
                v-if="avatarExibido || auth.usuario?.avatar"
                type="button"
                class="profile-link-btn profile-link-btn--danger"
                @click="marcarRemocaoAvatar"
              >
                <Trash2 :size="16" />
                Remover
              </button>
            </div>

            <p>JPG, PNG ou WebP. Tamanho máximo de 3 MB.</p>
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

      <section
        class="profile-card profile-card--security"
        aria-labelledby="perfil-seguranca"
      >
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Segurança</span>
            <h2 id="perfil-seguranca">Segurança da conta</h2>
          </div>
          <ShieldCheck :size="22" />
        </div>

        <div class="profile-security-list">
          <div class="profile-security-item">
            <span class="profile-security-item__icon"
              ><MailCheck :size="19"
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
              ><Chrome :size="19"
            /></span>
            <div>
              <strong>Conta Google</strong>
              <span>{{
                auth.usuario?.google_connected
                  ? "Conectada ao login social"
                  : "Não vinculada"
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
              ><KeyRound :size="19"
            /></span>
            <div>
              <strong>Senha</strong>
              <span>{{
                auth.usuario?.has_usable_password
                  ? "Senha local configurada"
                  : "Acesso somente por provedor externo"
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
          <LockKeyhole :size="18" />
          <p>
            Seu e-mail não pode ser alterado diretamente nesta tela. Assim, uma
            mudança de endereço nunca ignora a verificação da conta.
          </p>
        </div>
      </section>

      <section
        class="profile-card profile-card--form"
        aria-labelledby="perfil-dados"
      >
        <div class="profile-card__head profile-card__head--form">
          <div>
            <span class="profile-card__kicker">Informações pessoais</span>
            <h2 id="perfil-dados">Seus dados</h2>
          </div>

          <span v-if="temAlteracoes" class="profile-unsaved">
            <CircleDot :size="14" />
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
              <UserRound :size="18" />
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
              <Phone :size="18" />
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
            <div class="profile-form__control profile-form__control--readonly">
              <Mail :size="18" />
              <input
                id="profile-email"
                :value="auth.usuario?.email || ''"
                type="email"
                readonly
              />
              <Lock :size="15" class="profile-form__lock" />
            </div>
            <span class="profile-form__hint"
              >O e-mail exige um fluxo próprio de verificação para ser
              alterado.</span
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
              <LoaderCircle v-if="salvando" :size="18" class="profile-spin" />
              <Save v-else :size="18" />
              {{ salvando ? "Salvando..." : "Salvar alterações" }}
            </button>
          </div>
        </form>
      </section>

      <aside
        class="profile-card profile-card--summary"
        aria-labelledby="perfil-resumo"
      >
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Resumo</span>
            <h2 id="perfil-resumo">Informações da conta</h2>
          </div>
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

        <div class="profile-summary-callout">
          <Sparkles :size="20" />
          <div>
            <strong>Atualização do perfil</strong>
            <p>As alterações salvas serão usadas em toda a sua conta.</p>
          </div>
        </div>
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
  Sparkles,
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
  width: min(100%, 1080px);
  margin: 0 auto;
  color: var(--student-text);
}
.profile-page__eyebrow,
.profile-card__kicker {
  display: none;
}
.profile-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}
.profile-page__header h1 {
  margin: 0;
  font-size: 30px;
}
.profile-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.profile-page__status {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid #ead7b0;
  border-radius: 7px;
  background: #fff7e8;
  color: #835f20;
  font-size: 9px;
  font-weight: 700;
}
.profile-page__status.is-verified {
  border-color: #cadcc1;
  background: #edf5e9;
  color: #547341;
}
.profile-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(270px, 0.8fr);
  gap: 14px;
}
.profile-card {
  padding: 18px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.profile-card--identity,
.profile-card--form {
  grid-column: 1;
}
.profile-card--security,
.profile-card--summary {
  grid-column: 2;
}
.profile-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}
.profile-card__head h2 {
  margin: 0;
  font-size: 16px;
}
.profile-avatar-editor {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.profile-avatar-editor__preview {
  position: relative;
  width: 82px;
  height: 82px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  background: #e9e1d7;
  color: #6d4d1f;
  font-size: 20px;
  font-weight: 700;
}
.profile-avatar-editor__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-avatar-editor__camera {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #2a211b;
  color: #fff;
}
.profile-avatar-editor__content > strong {
  display: block;
  font-size: 13px;
}
.profile-avatar-editor__content > span {
  display: block;
  margin-top: 3px;
  color: var(--student-muted);
  font-size: 10px;
}
.profile-avatar-editor__content > p {
  margin: 8px 0 0;
  color: var(--student-muted);
  font-size: 8px;
}
.profile-avatar-editor__actions {
  display: flex;
  gap: 8px;
  margin-top: 9px;
}
.profile-avatar-editor__input {
  display: none;
}
.profile-link-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #76501a;
  font-size: 9px;
  font-weight: 700;
}
.profile-link-btn--danger {
  color: #9a4945;
}
.profile-security-list {
  display: grid;
}
.profile-security-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid var(--student-border);
}
.profile-security-item:last-child {
  border-bottom: 0;
}
.profile-security-item__icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f2eee8;
  color: #72582f;
}
.profile-security-item strong {
  display: block;
  font-size: 10px;
}
.profile-security-item div > span {
  display: block;
  margin-top: 2px;
  color: var(--student-muted);
  font-size: 8px;
  line-height: 1.3;
}
.profile-security-item__state {
  padding: 3px 5px;
  border-radius: 4px;
  background: #f2f0ed;
  color: #716960;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}
.profile-security-item__state.is-positive {
  background: #edf5e9;
  color: #547341;
}
.profile-security-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 12px;
  padding: 9px;
  border-radius: 7px;
  background: #f7f4f0;
  color: #6d645c;
}
.profile-security-note p {
  margin: 0;
  font-size: 8px;
  line-height: 1.5;
}
.profile-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}
.profile-form__field--wide {
  grid-column: 1/-1;
}
.profile-form__field label {
  display: block;
  margin-bottom: 5px;
  color: #59524b;
  font-size: 9px;
  font-weight: 700;
}
.profile-form__control {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--student-border);
  border-radius: 7px;
  background: #fff;
  color: #918880;
}
.profile-form__control:focus-within {
  border-color: #c9a466;
  box-shadow: 0 0 0 3px rgba(184, 121, 31, 0.07);
}
.profile-form__control.has-error {
  border-color: #d58b87;
}
.profile-form__control--readonly {
  background: #f7f5f2;
}
.profile-form__control input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--student-text);
  font-size: 10px;
}
.profile-form__control input[readonly] {
  color: #7d756e;
}
.profile-form__hint {
  display: block;
  margin-top: 4px;
  color: var(--student-muted);
  font-size: 8px;
}
.profile-field-error {
  margin: 4px 0 0;
  color: var(--student-danger);
  font-size: 8px;
}
.profile-form__actions {
  grid-column: 1/-1;
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding-top: 4px;
}
.profile-btn {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 700;
}
.profile-btn:disabled {
  opacity: 0.45;
}
.profile-btn--secondary {
  border: 1px solid var(--student-border-strong);
  background: #fff;
  color: var(--student-text);
}
.profile-btn--primary {
  border: 0;
  background: #2a211b;
  color: #fff;
}
.profile-unsaved {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8a5d1d;
  font-size: 8px;
}
.profile-summary-list {
  margin: 0;
}
.profile-summary-list > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--student-border);
}
.profile-summary-list > div:first-child {
  border-top: 0;
}
.profile-summary-list dt {
  color: var(--student-muted);
  font-size: 8px;
}
.profile-summary-list dd {
  margin: 0;
  text-align: right;
  font-size: 9px;
  font-weight: 650;
}
.profile-summary-callout {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 12px;
  padding: 9px;
  border-radius: 7px;
  background: #f7f4f0;
}
.profile-summary-callout > svg {
  display: none;
}
.profile-summary-callout strong {
  font-size: 9px;
}
.profile-summary-callout p {
  margin: 3px 0 0;
  color: var(--student-muted);
  font-size: 8px;
  line-height: 1.45;
}
.profile-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 13px;
  border: 1px solid #cadbcd;
  border-radius: 8px;
  background: #f4faf5;
  color: #33583a;
  font-size: 10px;
  font-weight: 600;
}
.profile-toast--error {
  border-color: #ebcfcc;
  background: #fff0ef;
  color: #984843;
}
.profile-spin {
  animation: profile-spin 0.7s linear infinite;
}
@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 900px) {
  .profile-page__grid {
    grid-template-columns: 1fr;
  }
  .profile-card--identity,
  .profile-card--form,
  .profile-card--security,
  .profile-card--summary {
    grid-column: 1;
  }
}
@media (max-width: 650px) {
  .profile-page__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .profile-page__header h1 {
    font-size: 25px;
  }
  .profile-page__status {
    width: 100%;
    justify-content: center;
  }
  .profile-avatar-editor {
    grid-template-columns: 68px minmax(0, 1fr);
  }
  .profile-avatar-editor__preview {
    width: 68px;
    height: 68px;
  }
  .profile-form {
    grid-template-columns: 1fr;
  }
  .profile-form__field,
  .profile-form__field--wide {
    grid-column: 1;
  }
  .profile-form__actions {
    width: 100%;
  }
  .profile-btn {
    flex: 1;
  }
  .profile-toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
  }
}
</style>
