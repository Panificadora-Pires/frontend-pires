<template>
  <div class="login">
    <!-- ===== Painel do formulário ===== -->
    <section class="login__panel">
      <div class="login__content">
        <div class="login__brand">
          <Coffee :size="26" class="login__brand-icon" />
          <div class="login__brand-text">
            <strong>Pires</strong>
            <span>Panificadora</span>
          </div>
        </div>

        <h1 class="login__title">
          Bem-vindo à <span class="login__title-gold">Pires Panificadora</span>
        </h1>
        <p class="login__subtitle">
          Faça login para acessar o sistema de pedidos da nossa cantina.
        </p>

        <form class="login__form" @submit.prevent="handleSubmit" novalidate>
          <BaseInput
            v-model="email"
            label="E-mail"
            type="email"
            placeholder="Digite seu e-mail"
            :icon="Mail"
            :error="erros.email"
            autocomplete="email"
            @blur="validarEmail"
          />
          <BaseInput
            v-model="senha"
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            :icon="Lock"
            :error="erros.senha"
            autocomplete="current-password"
            @blur="validarSenha"
          />

          <RouterLink to="/cadastro" class="login__forgot">Esqueceu sua senha?</RouterLink>

          <BaseButton
            type="submit"
            block
            :icon="LogIn"
            :loading="auth.carregando"
            loading-text="Entrando..."
          >
            Entrar
          </BaseButton>
        </form>

        <div class="login__divider"><span>ou</span></div>

        <BaseButton variant="ghost" block :icon="UserPlus" @click="router.push('/cadastro')">
          Criar nova conta
        </BaseButton>

        <p class="login__secure"><ShieldCheck :size="14" /> Acesso seguro e protegido</p>

        <!-- promo secundário, só aparece no mobile (no desktop a foto já cumpre esse papel) -->
        <div class="login__promo login__promo--mobile">
          <div>
            <strong>Produtos fresquinhos todos os dias!</strong>
            <p>Qualidade e sabor que você já conhece e confia.</p>
          </div>
          <div class="login__dots">
            <span /><span class="is-active" /><span />
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Painel da foto (some no mobile) ===== -->
    <aside class="login__photo" aria-hidden="true">
      <div class="login__promo login__promo--desktop">
        <div class="login__promo-icon"><Croissant :size="20" /></div>
        <div>
          <strong>Reserve seu lanche antes do intervalo</strong>
          <p>Evite filas e garanta seus produtos favoritos.</p>
        </div>
      </div>
      <div class="login__dots login__dots--desktop">
        <span class="is-active" /><span />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Coffee, Mail, Lock, LogIn, UserPlus, ShieldCheck, Croissant } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
const erros = reactive({ email: '', senha: '' })

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validarEmail() {
  if (!email.value) {
    erros.email = 'Informe seu e-mail.'
  } else if (!REGEX_EMAIL.test(email.value)) {
    erros.email = 'E-mail inválido. Verifique e tente novamente.'
  } else {
    erros.email = ''
  }
}

function validarSenha() {
  erros.senha = senha.value ? '' : 'Informe sua senha.'
}

async function handleSubmit() {
  validarEmail()
  validarSenha()
  if (erros.email || erros.senha) return

  const sucesso = await auth.login(email.value, senha.value)
  if (sucesso) {
    router.push(auth.isAdmin ? '/admin' : '/')
  } else {
    erros.senha = auth.erro
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 480px) 1fr;
}

/* ===== painel do formulário ===== */
.login__panel {
  background: var(--pp-bg-dark);
  display: flex;
  align-items: center;
  padding: var(--pp-space-6) var(--pp-space-6);
  position: relative;
  overflow-y: auto;
}

.login__content {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.login__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--pp-space-6);
}

.login__brand-icon {
  color: var(--pp-gold);
}

.login__brand-text strong {
  font-family: var(--pp-font-display);
  font-size: 22px;
  color: var(--pp-cream);
  font-weight: 600;
  margin-right: 6px;
}

.login__brand-text span {
  font-family: var(--pp-font-display);
  font-size: 13px;
  color: var(--pp-cream-dim);
  letter-spacing: 0.04em;
}

.login__title {
  font-family: var(--pp-font-display);
  font-size: 26px;
  font-weight: 600;
  color: var(--pp-cream);
  line-height: 1.25;
  margin: 0 0 10px;
}

.login__title-gold {
  color: var(--pp-gold);
}

.login__subtitle {
  color: var(--pp-cream-dim);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 var(--pp-space-6);
}

.login__form {
  margin-bottom: 4px;
}

.login__forgot {
  display: block;
  text-align: right;
  font-size: 12.5px;
  color: var(--pp-gold);
  text-decoration: none;
  margin: -6px 0 var(--pp-space-5);
}

.login__forgot:hover {
  text-decoration: underline;
}

.login__divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--pp-cream-faint);
  font-size: 12px;
  margin: var(--pp-space-5) 0;
}

.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--pp-border-soft);
}

.login__secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--pp-cream-faint);
  font-size: 12px;
  margin: var(--pp-space-5) 0 0;
}

/* ===== painel da foto ===== */
.login__photo {
  position: relative;
  background: url('/src/assets/background-image.png') center/cover no-repeat;
  display: flex;
  align-items: flex-end;
  padding: var(--pp-space-6);
}

.login__photo::before {
  content: '';
  position: absolute;
  inset: 0;
}

/* promo card compartilhado (desktop overlay / mobile inline) */
.login__promo {
  position: relative;
  background: rgba(36, 21, 9, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid var(--pp-border);
  border-radius: var(--pp-radius-md);
  padding: var(--pp-space-4);
  display: flex;
  gap: var(--pp-space-3);
  align-items: flex-start;
}

.login__promo strong {
  display: block;
  color: var(--pp-cream);
  font-size: 14px;
  margin-bottom: 4px;
}

.login__promo p {
  color: var(--pp-cream-dim);
  font-size: 12.5px;
  margin: 0;
  line-height: 1.4;
}

.login__promo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--pp-gold-soft);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login__promo--desktop {
  width: 100%;
  max-width: 320px;
}

.login__promo--mobile {
  display: none;
  margin-top: var(--pp-space-6);
  background: linear-gradient(135deg, #4a2f16, #2c1a0c);
}

.login__dots {
  display: flex;
  gap: 5px;
  margin-top: var(--pp-space-3);
}

.login__dots--desktop {
  position: absolute;
  bottom: var(--pp-space-4);
  left: var(--pp-space-6);
}

.login__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pp-border-soft);
}

.login__dots span.is-active {
  background: var(--pp-gold);
  width: 16px;
  border-radius: 3px;
}

/* ===== responsivo ===== */
@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login__photo {
    display: none;
  }

  .login__panel {
    padding: var(--pp-space-6) var(--pp-space-5);
  }

  .login__promo--mobile {
    display: flex;
  }
}
</style>
