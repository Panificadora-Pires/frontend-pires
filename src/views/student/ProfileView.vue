<template>
  <div class="profile-page">
    <header class="profile-page__header">
      <div>
        <span class="profile-page__eyebrow">Minha conta</span>
        <h1>Meu perfil</h1>
        <p>Atualize seus dados pessoais e personalize como você aparece na Pires.</p>
      </div>

      <div class="profile-page__status" :class="{ 'is-verified': auth.usuario?.email_verified }">
        <BadgeCheck v-if="auth.usuario?.email_verified" :size="18" />
        <CircleAlert v-else :size="18" />
        <span>{{ auth.usuario?.email_verified ? 'Conta verificada' : 'E-mail não verificado' }}</span>
      </div>
    </header>

    <div class="profile-page__grid">
      <section class="profile-card profile-card--identity" aria-labelledby="perfil-identidade">
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Foto e identidade</span>
            <h2 id="perfil-identidade">Como você aparece</h2>
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
            <strong>{{ auth.usuario?.name || 'Aluno' }}</strong>
            <span>{{ auth.usuario?.email || 'E-mail não informado' }}</span>

            <div class="profile-avatar-editor__actions">
              <button type="button" class="profile-link-btn" @click="abrirSeletorFoto">
                <Upload :size="16" />
                {{ avatarExibido ? 'Trocar foto' : 'Adicionar foto' }}
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

      <section class="profile-card profile-card--security" aria-labelledby="perfil-seguranca">
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Segurança</span>
            <h2 id="perfil-seguranca">Sua conta</h2>
          </div>
          <ShieldCheck :size="22" />
        </div>

        <div class="profile-security-list">
          <div class="profile-security-item">
            <span class="profile-security-item__icon"><MailCheck :size="19" /></span>
            <div>
              <strong>E-mail</strong>
              <span>{{ auth.usuario?.email_verified ? 'Verificado' : 'Pendente de verificação' }}</span>
            </div>
            <span class="profile-security-item__state" :class="{ 'is-positive': auth.usuario?.email_verified }">
              {{ auth.usuario?.email_verified ? 'Ativo' : 'Pendente' }}
            </span>
          </div>

          <div class="profile-security-item">
            <span class="profile-security-item__icon"><Chrome :size="19" /></span>
            <div>
              <strong>Conta Google</strong>
              <span>{{ auth.usuario?.google_connected ? 'Conectada ao login social' : 'Não vinculada' }}</span>
            </div>
            <span class="profile-security-item__state" :class="{ 'is-positive': auth.usuario?.google_connected }">
              {{ auth.usuario?.google_connected ? 'Conectada' : 'Opcional' }}
            </span>
          </div>

          <div class="profile-security-item">
            <span class="profile-security-item__icon"><KeyRound :size="19" /></span>
            <div>
              <strong>Senha</strong>
              <span>{{ auth.usuario?.has_usable_password ? 'Senha local configurada' : 'Acesso somente por provedor externo' }}</span>
            </div>
            <span class="profile-security-item__state" :class="{ 'is-positive': auth.usuario?.has_usable_password }">
              {{ auth.usuario?.has_usable_password ? 'Configurada' : 'Não definida' }}
            </span>
          </div>
        </div>

        <div class="profile-security-note">
          <LockKeyhole :size="18" />
          <p>
            Seu e-mail não pode ser alterado diretamente nesta tela. Assim, uma mudança de endereço nunca ignora a verificação da conta.
          </p>
        </div>
      </section>

      <section class="profile-card profile-card--form" aria-labelledby="perfil-dados">
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
            <div class="profile-form__control" :class="{ 'has-error': erros.name }">
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
            <p v-if="erros.name" class="profile-field-error" role="alert">{{ erros.name }}</p>
          </div>

          <div class="profile-form__field">
            <label for="profile-phone">Telefone</label>
            <div class="profile-form__control" :class="{ 'has-error': erros.phone }">
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
            <p v-if="erros.phone" class="profile-field-error" role="alert">{{ erros.phone }}</p>
          </div>

          <div class="profile-form__field">
            <label for="profile-email">E-mail</label>
            <div class="profile-form__control profile-form__control--readonly">
              <Mail :size="18" />
              <input id="profile-email" :value="auth.usuario?.email || ''" type="email" readonly />
              <Lock :size="15" class="profile-form__lock" />
            </div>
            <span class="profile-form__hint">O e-mail exige um fluxo próprio de verificação para ser alterado.</span>
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
              {{ salvando ? 'Salvando...' : 'Salvar alterações' }}
            </button>
          </div>
        </form>
      </section>

      <aside class="profile-card profile-card--summary" aria-labelledby="perfil-resumo">
        <div class="profile-card__head">
          <div>
            <span class="profile-card__kicker">Resumo</span>
            <h2 id="perfil-resumo">Informações da conta</h2>
          </div>
        </div>

        <dl class="profile-summary-list">
          <div>
            <dt>Tipo de conta</dt>
            <dd>{{ auth.isAdmin ? 'Administração' : 'Aluno' }}</dd>
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
            <strong>Perfil sincronizado</strong>
            <p>Depois de salvar, sua foto e seu nome são atualizados imediatamente em toda a interface.</p>
          </div>
        </div>
      </aside>
    </div>

    <Transition name="profile-toast">
      <div v-if="mensagem" class="profile-toast" :class="`profile-toast--${mensagem.tipo}`" role="status">
        <CheckCircle2 v-if="mensagem.tipo === 'success'" :size="19" />
        <CircleAlert v-else :size="19" />
        <span>{{ mensagem.texto }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
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
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'

const MAX_AVATAR_BYTES = 3 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const auth = useAuthStore()
const avatarInput = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const removerAvatar = ref(false)
const avatarRemotoComErro = ref(false)
const salvando = ref(false)
const mensagem = ref(null)
let toastTimer = null

const form = reactive({
  name: '',
  phone: '',
})

const erros = reactive({
  name: '',
  phone: '',
  avatar: '',
})

const iniciais = computed(() => {
  const nome = form.name || auth.usuario?.name || ''
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('') || 'A'
  )
})

const avatarExibido = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  if (removerAvatar.value || avatarRemotoComErro.value) return ''
  return auth.usuario?.avatar || ''
})

const telefoneOriginal = computed(() => formatarTelefone(auth.usuario?.phone || ''))

const temAlteracoes = computed(() => {
  const nomeMudou = form.name.trim() !== String(auth.usuario?.name || '').trim()
  const telefoneMudou = form.phone !== telefoneOriginal.value

  return nomeMudou || telefoneMudou || Boolean(avatarFile.value) || removerAvatar.value
})

const ultimoAcesso = computed(() => {
  const valor = auth.usuario?.last_login
  if (!valor) return 'Primeiro acesso'

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return 'Não disponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
})

const metodosLogin = computed(() => {
  const metodos = []
  if (auth.usuario?.has_usable_password) metodos.push('E-mail e senha')
  if (auth.usuario?.google_connected) metodos.push('Google')
  return metodos.length ? metodos.join(' + ') : 'Sessão autenticada'
})

watch(
  () => auth.usuario,
  () => {
    restaurarFormulario({ preservarMensagem: true })
    avatarRemotoComErro.value = false
  },
  { immediate: true, deep: true },
)

function restaurarFormulario({ preservarMensagem = false } = {}) {
  form.name = String(auth.usuario?.name || '')
  form.phone = telefoneOriginal.value

  avatarFile.value = null
  removerAvatar.value = false
  avatarRemotoComErro.value = false
  limparPreview()
  limparErros()

  if (avatarInput.value) avatarInput.value.value = ''
  if (!preservarMensagem) mensagem.value = null
}

function abrirSeletorFoto() {
  avatarInput.value?.click()
}

function selecionarFoto(event) {
  limparErro('avatar')

  const arquivo = event.target.files?.[0]
  if (!arquivo) return

  if (!ALLOWED_AVATAR_TYPES.has(arquivo.type)) {
    erros.avatar = 'Escolha uma imagem JPG, PNG ou WebP.'
    event.target.value = ''
    return
  }

  if (arquivo.size > MAX_AVATAR_BYTES) {
    erros.avatar = 'A foto de perfil deve ter no máximo 3 MB.'
    event.target.value = ''
    return
  }

  limparPreview()
  avatarFile.value = arquivo
  avatarPreview.value = URL.createObjectURL(arquivo)
  removerAvatar.value = false
}

function marcarRemocaoAvatar() {
  avatarFile.value = null
  removerAvatar.value = Boolean(auth.usuario?.avatar)
  avatarRemotoComErro.value = false
  limparPreview()
  limparErro('avatar')

  if (avatarInput.value) avatarInput.value.value = ''
}

function atualizarTelefone(event) {
  form.phone = mascararTelefone(event.target.value)
  limparErro('phone')
}

function mascararTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)

  if (!digitos) return ''
  if (digitos.length <= 2) return `(${digitos}`
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

function formatarTelefone(valor) {
  return mascararTelefone(valor)
}

async function salvarPerfil() {
  limparErros()

  if (!form.name.trim()) {
    erros.name = 'Informe seu nome completo.'
    return
  }

  salvando.value = true

  try {
    const payload = new FormData()
    payload.append('name', form.name.trim())
    payload.append('phone', form.phone.trim())

    if (avatarFile.value) {
      payload.append('avatar', avatarFile.value)
    } else if (removerAvatar.value) {
      payload.append('remove_avatar', 'true')
    }

    const resultado = await auth.atualizarPerfil(payload)

    if (!resultado.ok) {
      Object.assign(erros, {
        name: resultado.campos?.name || '',
        phone: resultado.campos?.phone || '',
        avatar: resultado.campos?.avatar || '',
      })

      exibirMensagem('error', resultado.erro || 'Não foi possível salvar seu perfil.')
      return
    }

    avatarFile.value = null
    removerAvatar.value = false
    avatarRemotoComErro.value = false
    limparPreview()
    form.name = String(auth.usuario?.name || '')
    form.phone = formatarTelefone(auth.usuario?.phone || '')

    if (avatarInput.value) avatarInput.value.value = ''

    exibirMensagem('success', 'Perfil atualizado com sucesso.')
  } finally {
    salvando.value = false
  }
}

function limparErro(campo) {
  erros[campo] = ''
}

function limparErros() {
  erros.name = ''
  erros.phone = ''
  erros.avatar = ''
}

function limparPreview() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
  }
}

function exibirMensagem(tipo, texto) {
  mensagem.value = { tipo, texto }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    mensagem.value = null
  }, 4200)
}

onBeforeUnmount(() => {
  limparPreview()
  window.clearTimeout(toastTimer)
})
</script>

<style scoped>
.profile-page {
  width: min(1180px, 100%);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.profile-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-page__eyebrow,
.profile-card__kicker {
  display: block;
  margin-bottom: 5px;
  color: #b77a13;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-page__header h1 {
  margin: 0;
  color: #241b16;
  font-size: clamp(27px, 2.3vw, 36px);
  line-height: 1.08;
}

.profile-page__header p {
  max-width: 590px;
  margin: 8px 0 0;
  color: var(--pp-text-dark-soft);
  font-size: 14px;
  line-height: 1.55;
}

.profile-page__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid rgba(201, 112, 73, 0.18);
  border-radius: 999px;
  background: #fff8f3;
  color: #a95538;
  font-size: 12px;
  font-weight: 700;
}

.profile-page__status.is-verified {
  border-color: rgba(79, 143, 97, 0.18);
  background: #f1f8f2;
  color: #377449;
}

.profile-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(310px, 0.8fr);
  gap: 18px;
}

.profile-card {
  min-width: 0;
  border: 1px solid rgba(36, 17, 8, 0.08);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(53, 35, 23, 0.045);
}

.profile-card--identity,
.profile-card--security,
.profile-card--form,
.profile-card--summary {
  padding: 22px;
}

.profile-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.profile-card__head > svg {
  color: #c98a22;
}

.profile-card__head h2 {
  margin: 0;
  color: #271e18;
  font-size: 18px;
  line-height: 1.2;
}

.profile-card--identity {
  background:
    radial-gradient(circle at 100% 0, rgba(224, 168, 62, 0.1), transparent 35%),
    #fff;
}

.profile-avatar-editor {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-avatar-editor__preview {
  position: relative;
  width: 108px;
  height: 108px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 4px solid #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #f4e4c5, #f9f1e4);
  color: #a56a0b;
  box-shadow: 0 0 0 1px rgba(224, 168, 62, 0.2), 0 12px 25px rgba(67, 40, 17, 0.1);
  font-size: 28px;
  font-weight: 800;
  overflow: visible;
}

.profile-avatar-editor__preview img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  object-fit: cover;
}

.profile-avatar-editor__camera {
  position: absolute;
  right: -4px;
  bottom: 3px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #dda034;
  color: #28170c;
  cursor: pointer;
  box-shadow: 0 5px 13px rgba(70, 40, 16, 0.22);
}

.profile-avatar-editor__content {
  min-width: 0;
}

.profile-avatar-editor__content > strong {
  display: block;
  overflow: hidden;
  color: #281f19;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-avatar-editor__content > span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #81776f;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-avatar-editor__content > p {
  margin: 9px 0 0;
  color: #a09a94;
  font-size: 11px;
}

.profile-avatar-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}

.profile-avatar-editor__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.profile-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid rgba(224, 168, 62, 0.26);
  border-radius: 9px;
  background: #fff9ef;
  color: #8f5b08;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.profile-link-btn--danger {
  border-color: rgba(197, 76, 62, 0.16);
  background: #fff8f7;
  color: #b84e40;
}

.profile-security-list {
  display: grid;
  gap: 7px;
}

.profile-security-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 9px 10px;
  border-radius: 12px;
  background: #faf8f5;
}

.profile-security-item__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f0e4d3;
  color: #9c680f;
}

.profile-security-item strong,
.profile-security-item span {
  display: block;
}

.profile-security-item strong {
  color: #332821;
  font-size: 12.5px;
}

.profile-security-item div > span {
  margin-top: 2px;
  color: #91877f;
  font-size: 10.5px;
  line-height: 1.35;
}

.profile-security-item__state {
  padding: 5px 8px;
  border-radius: 999px;
  background: #eee9e4;
  color: #786f68;
  font-size: 9px;
  font-weight: 800;
}

.profile-security-item__state.is-positive {
  background: #e8f4eb;
  color: #387149;
}

.profile-security-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 11px 12px;
  border: 1px solid rgba(224, 168, 62, 0.13);
  border-radius: 11px;
  background: #fffaf2;
  color: #8a6a3c;
}

.profile-security-note svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.profile-security-note p {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.5;
}

.profile-card--form {
  grid-column: 1;
}

.profile-card--summary {
  grid-column: 2;
}

.profile-card__head--form {
  align-items: center;
}

.profile-unsaved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #aa6e0c;
  font-size: 10.5px;
  font-weight: 700;
}

.profile-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px;
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
  color: #443831;
  font-size: 11.5px;
  font-weight: 700;
}

.profile-form__control {
  min-height: 47px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border: 1px solid #ded8d2;
  border-radius: 10px;
  background: #fff;
  color: #9c9188;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.profile-form__control:focus-within {
  border-color: #d39a36;
  box-shadow: 0 0 0 3px rgba(224, 168, 62, 0.12);
}

.profile-form__control.has-error {
  border-color: #d36a5f;
  box-shadow: 0 0 0 3px rgba(211, 106, 95, 0.09);
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
  color: #332921;
  font: inherit;
  font-size: 12.5px;
}

.profile-form__control input[readonly] {
  color: #827a73;
  cursor: default;
}

.profile-form__lock {
  flex: 0 0 auto;
  color: #aaa19a;
}

.profile-form__hint {
  display: block;
  margin: 6px 2px 0;
  color: #a09a94;
  font-size: 10px;
  line-height: 1.4;
}

.profile-field-error {
  margin: 6px 2px 0;
  color: #c55449;
  font-size: 10.5px;
  font-weight: 600;
}

.profile-form__actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 4px;
}

.profile-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 10px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.profile-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.profile-btn--secondary {
  border: 1px solid #dfd9d3;
  background: #fff;
  color: #625750;
}

.profile-btn--primary {
  border: 1px solid #dda034;
  background: linear-gradient(115deg, #e2a334, #efb544);
  color: #2c190b;
  box-shadow: 0 7px 17px rgba(224, 168, 62, 0.16);
}

.profile-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.profile-summary-list {
  margin: 0;
}

.profile-summary-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid #eee9e5;
}

.profile-summary-list > div:first-child {
  padding-top: 0;
}

.profile-summary-list dt {
  color: #8d837b;
  font-size: 11px;
}

.profile-summary-list dd {
  margin: 0;
  color: #332821;
  font-size: 11px;
  font-weight: 750;
  text-align: right;
}

.profile-summary-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 13px;
  border-radius: 12px;
  background: linear-gradient(135deg, #302015, #3c2516);
  color: #f3e9d8;
}

.profile-summary-callout > svg {
  flex: 0 0 auto;
  color: #e6a83a;
}

.profile-summary-callout strong {
  font-size: 11.5px;
}

.profile-summary-callout p {
  margin: 4px 0 0;
  color: #bda992;
  font-size: 10px;
  line-height: 1.45;
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
  border: 1px solid rgba(53, 103, 67, 0.18);
  border-radius: 12px;
  background: #eff8f1;
  color: #326642;
  box-shadow: 0 13px 30px rgba(42, 31, 23, 0.15);
  font-size: 11.5px;
  font-weight: 700;
}

.profile-toast--error {
  border-color: rgba(184, 78, 64, 0.18);
  background: #fff4f2;
  color: #a94e43;
}

.profile-spin {
  animation: profile-spin 700ms linear infinite;
}

.profile-toast-enter-active,
.profile-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.profile-toast-enter-from,
.profile-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes profile-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .profile-page__grid {
    grid-template-columns: 1fr;
  }

  .profile-card--form,
  .profile-card--summary {
    grid-column: auto;
  }

  .profile-card--security {
    order: 3;
  }

  .profile-card--summary {
    order: 4;
  }
}

@media (max-width: 640px) {
  .profile-page {
    padding-bottom: 8px;
  }

  .profile-page__header {
    display: block;
    margin-bottom: 18px;
  }

  .profile-page__header h1 {
    font-size: 26px;
  }

  .profile-page__header p {
    margin-top: 6px;
    font-size: 12px;
  }

  .profile-page__status {
    margin-top: 12px;
    min-height: 34px;
    font-size: 10.5px;
  }

  .profile-page__grid {
    gap: 12px;
  }

  .profile-card--identity,
  .profile-card--security,
  .profile-card--form,
  .profile-card--summary {
    padding: 17px;
    border-radius: 15px;
  }

  .profile-avatar-editor {
    flex-direction: column;
    text-align: center;
  }

  .profile-avatar-editor__preview {
    width: 102px;
    height: 102px;
  }

  .profile-avatar-editor__actions {
    justify-content: center;
  }

  .profile-avatar-editor__content > p {
    max-width: 260px;
  }

  .profile-security-item {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .profile-security-item__state {
    grid-column: 2;
    justify-self: start;
  }

  .profile-form {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .profile-form__field--wide,
  .profile-form__actions {
    grid-column: auto;
  }

  .profile-card__head--form {
    display: block;
  }

  .profile-unsaved {
    margin-top: 7px;
  }

  .profile-form__actions {
    display: grid;
    grid-template-columns: 1fr 1.35fr;
  }

  .profile-btn {
    padding: 0 10px;
  }

  .profile-toast {
    right: 16px;
    bottom: 78px;
  }
}

@media (max-width: 380px) {
  .profile-form__actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-spin {
    animation: none;
  }
}
</style>
