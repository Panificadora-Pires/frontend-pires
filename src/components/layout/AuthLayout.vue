<template>
  <div class="auth-layout" :class="{ 'auth-layout--wide': wide }">
    <section class="auth-layout__panel">
      <div class="auth-layout__watermark" aria-hidden="true">
        <Wheat :size="210" />
        <Croissant :size="170" />
      </div>

      <div class="auth-layout__content">
        <RouterLink
          v-if="backTo"
          :to="backTo"
          class="auth-layout__back"
          aria-label="Voltar"
        >
          <ArrowLeft :size="18" />
          <span>{{ backLabel }}</span>
        </RouterLink>

        <RouterLink :to="{ name: 'login' }" class="auth-layout__brand" aria-label="Pires Panificadora">
          <img src="/logo.png" alt="Pires Panificadora" />
        </RouterLink>

        <div class="auth-layout__heading">
          <slot name="heading" />
        </div>

        <slot />
      </div>
    </section>

    <aside class="auth-layout__photo" aria-hidden="true">
      <div class="auth-layout__photo-overlay" />
      <div class="auth-layout__photo-vignette" />

      <div class="auth-layout__carousel">
        <Transition name="auth-card" mode="out-in">
          <article :key="slideAtual.id" class="auth-layout__promo-card">
            <div class="auth-layout__promo-icon">
              <component :is="slideAtual.icon" :size="26" />
            </div>
            <div>
              <strong>{{ slideAtual.title }}</strong>
              <p>{{ slideAtual.description }}</p>
            </div>
          </article>
        </Transition>

        <div class="auth-layout__dots">
          <button
            v-for="(slide, index) in slides"
            :key="slide.id"
            type="button"
            :class="{ 'is-active': index === slideIndex }"
            :aria-label="`Mostrar destaque ${index + 1}`"
            @click="selecionarSlide(index)"
          />
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Coffee, Cookie, Croissant, ShoppingBag, Wheat } from 'lucide-vue-next'

defineProps({
  wide: { type: Boolean, default: false },
  backTo: { type: [String, Object], default: null },
  backLabel: { type: String, default: 'Voltar' },
})

const slides = [
  {
    id: 1,
    icon: ShoppingBag,
    title: 'Reserve seu lanche antes do intervalo',
    description: 'Evite filas e garanta seus produtos favoritos!',
  },
  {
    id: 2,
    icon: Croissant,
    title: 'Produtos fresquinhos todos os dias',
    description: 'Feitos com carinho para tornar seu intervalo ainda melhor.',
  },
  {
    id: 3,
    icon: Coffee,
    title: 'Praticidade para o seu dia',
    description: 'Faça seu pedido com antecedência e retire no balcão.',
  },
  {
    id: 4,
    icon: Cookie,
    title: 'Promoções especiais',
    description: 'Acompanhe as ofertas disponíveis pelo sistema.',
  },
]

const slideIndex = ref(0)
const slideAtual = computed(() => slides[slideIndex.value])
let intervalId = null

function iniciarCarousel() {
  window.clearInterval(intervalId)
  intervalId = window.setInterval(() => {
    slideIndex.value = (slideIndex.value + 1) % slides.length
  }, 5000)
}

function selecionarSlide(index) {
  slideIndex.value = index
  iniciarCarousel()
}

onMounted(iniciarCarousel)
onBeforeUnmount(() => window.clearInterval(intervalId))
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(460px, 1fr) minmax(480px, 1fr);
  background: var(--pp-bg-dark);
}

.auth-layout--wide {
  grid-template-columns: minmax(620px, 1.1fr) minmax(480px, 0.9fr);
}

.auth-layout__panel {
  position: relative;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 42px 54px;
  background:
    radial-gradient(circle at 76% 32%, rgba(224, 168, 62, 0.06), transparent 28%),
    linear-gradient(180deg, #211006 0%, #321707 100%);
}

.auth-layout__watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: var(--pp-gold);
  opacity: 0.045;
}

.auth-layout__watermark > :first-child {
  position: absolute;
  left: -54px;
  bottom: 7%;
  transform: rotate(-15deg);
}

.auth-layout__watermark > :last-child {
  position: absolute;
  right: 0;
  top: 11%;
  transform: rotate(25deg);
}

.auth-layout__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 430px;
}

.auth-layout--wide .auth-layout__content {
  max-width: 600px;
}

.auth-layout__back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 18px;
  color: var(--pp-cream-dim);
  font-size: 13px;
  transition: color 160ms ease;
}

.auth-layout__back:hover {
  color: var(--pp-gold);
}

.auth-layout__brand {
  display: inline-block;
  margin-bottom: 30px;
}

.auth-layout__brand img {
  display: block;
  width: 190px;
  max-width: 100%;
  height: auto;
}

.auth-layout__heading :deep(h1) {
  margin: 0 0 10px;
  color: var(--pp-cream);
  font-family: var(--pp-font-display);
  font-size: clamp(31px, 3.1vw, 46px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.auth-layout--wide .auth-layout__heading :deep(h1) {
  font-size: clamp(30px, 2.7vw, 42px);
}

.auth-layout__heading :deep(h1 span) {
  color: #ffb52e;
}

.auth-layout__heading :deep(p) {
  margin: 0 0 26px;
  color: var(--pp-cream-dim);
  font-size: 14px;
  line-height: 1.55;
}

.auth-layout__photo {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: url('/background-image.png') center / cover no-repeat;
}

.auth-layout__photo-overlay,
.auth-layout__photo-vignette {
  position: absolute;
  inset: 0;
}

.auth-layout__photo-overlay {
  background: linear-gradient(90deg, rgba(45, 19, 5, 0.32), transparent 38%);
}

.auth-layout__photo-vignette {
  background:
    linear-gradient(180deg, rgba(17, 8, 3, 0.08) 0%, transparent 42%, rgba(17, 8, 3, 0.4) 100%),
    radial-gradient(circle at center, transparent 48%, rgba(22, 9, 3, 0.22) 100%);
}

.auth-layout__carousel {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 58px;
  width: min(390px, calc(100% - 64px));
  transform: translateX(-50%);
}

.auth-layout__promo-card {
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 18px;
  min-height: 150px;
  padding: 24px;
  border: 1px solid rgba(224, 168, 62, 0.55);
  border-radius: 22px;
  background: rgba(45, 19, 6, 0.9);
  box-shadow: 0 18px 48px rgba(12, 5, 1, 0.34);
  backdrop-filter: blur(12px);
  color: var(--pp-cream);
}

.auth-layout__promo-icon {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border: 1px solid var(--pp-gold);
  border-radius: 50%;
  color: var(--pp-gold);
}

.auth-layout__promo-card strong {
  display: block;
  margin-bottom: 9px;
  font-family: var(--pp-font-display);
  font-size: 20px;
  line-height: 1.22;
}

.auth-layout__promo-card p {
  margin: 0;
  color: var(--pp-cream-dim);
  font-size: 13px;
  line-height: 1.5;
}

.auth-layout__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.auth-layout__dots button {
  width: 19px;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: 99px;
  background: rgba(243, 233, 216, 0.34);
  cursor: pointer;
  transition: width 180ms ease, background 180ms ease;
}

.auth-layout__dots button.is-active {
  width: 28px;
  background: var(--pp-gold);
}

.auth-card-enter-active,
.auth-card-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.auth-card-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.auth-card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1080px) {
  .auth-layout,
  .auth-layout--wide {
    grid-template-columns: minmax(420px, 0.95fr) minmax(420px, 1.05fr);
  }

  .auth-layout__panel {
    padding-inline: 36px;
  }
}

@media (max-width: 820px) {
  .auth-layout,
  .auth-layout--wide {
    display: block;
  }

  .auth-layout__panel {
    min-height: 100vh;
    align-items: flex-start;
    padding: 34px 28px 48px;
    overflow-y: auto;
  }

  .auth-layout__content,
  .auth-layout--wide .auth-layout__content {
    max-width: 520px;
    margin: 0 auto;
  }

  .auth-layout__brand {
    display: block;
    margin: 18px auto 34px;
    text-align: center;
  }

  .auth-layout__brand img {
    width: 160px;
    margin: 0 auto;
  }

  .auth-layout__photo {
    display: none;
  }

  .auth-layout__heading :deep(h1),
  .auth-layout--wide .auth-layout__heading :deep(h1) {
    font-size: 31px;
  }
}

@media (max-width: 480px) {
  .auth-layout__panel {
    padding: 24px 20px 36px;
  }

  .auth-layout__brand {
    margin-bottom: 28px;
  }

  .auth-layout__brand img {
    width: 145px;
  }

  .auth-layout__heading :deep(h1),
  .auth-layout--wide .auth-layout__heading :deep(h1) {
    font-size: 28px;
  }
}
</style>
