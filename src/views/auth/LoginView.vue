<template>
  <div class="login">
    <!-- ===== Painel do formulário (50%) ===== -->
    <section class="login__panel">
      
      <!-- Watermark sutil no fundo -->
      <div class="login__watermark" aria-hidden="true">
        <Croissant :size="400" />
      </div>

      <div class="login__content">
        
        <!-- Logo Real -->
        <div class="login__brand">
          <img 
            src="/logo.png" 
            alt="Logo Pires Panificadora" 
            class="login__logo" 
          />
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

          <div class="login__forgot-wrapper">
            <RouterLink to="/cadastro" class="login__forgot">Esqueceu sua senha?</RouterLink>
          </div>

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

        <BaseButton 
          variant="ghost" 
          block 
          :icon="UserPlus" 
          @click="router.push('/cadastro')"
        >
          Criar nova conta
        </BaseButton>

        <div class="login__secure">
          <ShieldCheck :size="14" /> Acesso seguro e protegido
        </div>
      </div>
    </section>

    <!-- ===== Painel da foto (50%) ===== -->
    <aside class="login__photo" aria-hidden="true">
      <div class="login__photo-overlay"></div>
      <div class="login__photo-vignette"></div>
      
      <!-- Carrossel de Promoções -->
      <div class="login__carousel">
        <transition name="fade-slide" mode="out-in">
          <div class="login__promo" :key="currentSlide.id">
            <div class="login__promo-icon">
              <component :is="currentSlide.icon" :size="24" />
            </div>
            <div class="login__promo-text">
              <strong>{{ currentSlide.title }}</strong>
              <p>{{ currentSlide.desc }}</p>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- Indicadores do Carrossel -->
      <div class="login__dots">
        <span 
          v-for="(slide, index) in slides" 
          :key="slide.id" 
          :class="{ 'is-active': currentSlideIndex === index }"
          @click="goToSlide(index)"
        ></span>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, ShieldCheck, Croissant, Coffee, Cookie, LogIn, UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
const erros = reactive({ email: '', senha: '' })

// --- Lógica do Carrossel ---
const slides = ref([
  { id: 1, icon: Croissant, title: 'Reserve seu lanche antes do intervalo', desc: 'Evite filas e garanta seus produtos favoritos.' },
  { id: 2, icon: Coffee, title: 'Café fresquinho todos os dias', desc: 'Aqueça seu dia com o melhor café da escola.' },
  { id: 3, icon: Cookie, title: 'Promoções exclusivas para alunos', desc: 'Peça pelo app e ganhe descontos especiais.' }
])

const currentSlideIndex = ref(0)
const currentSlide = computed(() => slides.value[currentSlideIndex.value])

let carouselInterval = null

const startCarousel = () => {
  carouselInterval = setInterval(() => {
    currentSlideIndex.value = (currentSlideIndex.value + 1) % slides.value.length
  }, 4000) // Troca a cada 4 segundos
}

const goToSlide = (index) => {
  currentSlideIndex.value = index
  // Reinicia o timer ao clicar manualmente
  clearInterval(carouselInterval)
  startCarousel()
}

onMounted(() => {
  startCarousel()
})

onUnmounted(() => {
  clearInterval(carouselInterval)
})

// --- Lógica de Autenticação ---
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
  /* AJUSTE 1: Metade exata da tela para cada painel (50/50) */
  grid-template-columns: 1fr 1fr; 
}

/* ===== painel do formulário ===== */
.login__panel {
  background: var(--pp-gradient-left);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pp-space-6) var(--pp-space-5);
  position: relative;
  overflow: hidden;
}

.login__watermark {
  position: absolute;
  bottom: -10%;
  right: -5%;
  color: var(--pp-cream);
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
  transform: rotate(-15deg);
}

.login__content {
  width: 100%;
  max-width: 420px; /* Ligeiramente reduzido para caber confortável nos 50% */
  position: relative;
  z-index: 1;
}

.login__brand {
  margin-bottom: var(--pp-space-5); 
}

.login__logo {
  width: 180px; 
  height: auto;
  object-fit: contain;
  transition: transform 250ms ease;
}

.login__logo:hover {
  transform: scale(1.02);
}

.login__title {
  font-family: var(--pp-font-body);
  font-size: 48px;
  font-weight: 700;
  color: var(--pp-cream);
  line-height: 1.2;
  margin: 0 0 var(--pp-space-3);
}

.login__title-gold {
  color: var(--pp-gold);
}

.login__subtitle {
  color: var(--pp-cream-dim);
  font-size: 16px;
  line-height: 1.5;
  margin: 0 0 var(--pp-space-5);
}

.login__form {
  margin-bottom: 0;
}

.login__forgot-wrapper {
  text-align: right;
  margin-top: 6px; 
  margin-bottom: var(--pp-space-4);
}

.login__forgot {
  font-size: 13px;
  color: var(--pp-gold);
  transition: all 250ms ease;
}

.login__forgot:hover {
  color: var(--pp-cream);
  text-decoration: underline;
}

.login__divider {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--pp-cream-faint);
  font-size: 13px;
  margin: var(--pp-space-4) 0;
  opacity: 0.6;
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
  margin-top: var(--pp-space-4);
  opacity: 0.5;
}

/* ===== painel da foto ===== */
.login__photo {
  position: relative;
  background: url('/background-image.png') center/cover no-repeat;
  background-color: var(--pp-bg-dark-soft);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.login__photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.1); 
  mix-blend-mode: multiply;
  filter: contrast(1.1) saturate(1.1);
}

.login__photo-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
}

/* ===== Carrossel e Card ===== */
.login__carousel {
  position: relative;
  z-index: 2;
  padding: 0 var(--pp-space-5);
  margin-bottom: var(--pp-space-4);
}

.login__promo {
  background: rgba(36, 21, 9, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 168, 62, 0.25);
  border-radius: var(--pp-radius-card);
  padding: var(--pp-space-4);
  display: flex;
  gap: var(--pp-space-3);
  align-items: center;
  box-shadow: var(--pp-shadow-elevation);
  cursor: pointer;
}

.login__promo:hover {
  border-color: var(--pp-gold);
}

.login__promo-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--pp-gold-soft);
  color: var(--pp-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login__promo-text strong {
  display: block;
  color: var(--pp-cream);
  font-family: var(--pp-font-body);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.login__promo-text p {
  color: var(--pp-cream-dim);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

/* Indicadores do Carrossel (Bolinhas) */
.login__dots {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center; /* Centralizado como no modelo */
  gap: 8px;
  padding-bottom: var(--pp-space-5);
}

.login__dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(243, 233, 216, 0.3);
  transition: all 300ms ease;
  cursor: pointer;
}

.login__dots span.is-active {
  background: var(--pp-gold);
  width: 24px;
  border-radius: 4px;
}

/* Transição do Carrossel */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ===== RESPONSIVIDADE ===== */
@media (max-width: 1200px) {
  .login__title { font-size: 42px; }
}

@media (max-width: 1024px) {
  .login__title { font-size: 36px; }
}

@media (max-width: 768px) {
  .login {
    grid-template-columns: 1fr;
  }
  .login__photo {
    display: none;
  }
  .login__panel {
    padding: var(--pp-space-5) var(--pp-space-3);
  }
  .login__title { font-size: 32px; }
  .login__logo { width: 140px; }
}
</style>