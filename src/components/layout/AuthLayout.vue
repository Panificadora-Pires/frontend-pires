<template>
  <div
    class="auth-layout"
    :class="[
      { 'auth-layout--wide': wide },
      `auth-layout--promo-${promoMode}`,
    ]"
  >
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
          <ArrowLeft :size="17" />
          <span>{{ backLabel }}</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'login' }"
          class="auth-layout__brand"
          aria-label="Pires Panificadora"
        >
          <img src="/logo.png" alt="Pires Panificadora" />
        </RouterLink>

        <div class="auth-layout__heading">
          <slot name="heading" />
        </div>

        <slot />
      </div>
    </section>

    <aside class="auth-layout__photo" aria-label="Destaques da Pires Panificadora">
      <div class="auth-layout__photo-overlay" aria-hidden="true" />
      <div class="auth-layout__photo-vignette" aria-hidden="true" />

      <div class="auth-layout__carousel">
        <Transition name="auth-card" mode="out-in">
          <article
            v-if="promoMode === 'login'"
            :key="`offer-${slideAtual.id}`"
            class="auth-layout__offer-card"
          >
            <div class="auth-layout__offer-copy">
              <span class="auth-layout__offer-tag"><Flame :size="14" aria-hidden="true" /> Promoção do dia</span>
              <strong>{{ slideAtual.title }}</strong>
              <p>{{ slideAtual.description }}</p>

              <div class="auth-layout__offer-price">
                <small>R$</small>
                <span>{{ slideAtual.price }}</span>
              </div>

              <span class="auth-layout__offer-action">
                Reservar agora
                <ChevronRight :size="18" />
              </span>
            </div>

            <div class="auth-layout__offer-visual" aria-hidden="true">
              <component :is="slideAtual.icon" :size="72" />
            </div>
          </article>

          <article
            v-else
            :key="`generic-${slideAtual.id}`"
            class="auth-layout__promo-card"
          >
            <div class="auth-layout__promo-icon">
              <component :is="slideAtual.icon" :size="27" />
            </div>
            <div>
              <strong>{{ slideAtual.title }}</strong>
              <p>{{ slideAtual.description }}</p>
            </div>
          </article>
        </Transition>

        <div class="auth-layout__dots" aria-label="Alternar destaque">
          <button
            v-for="(slide, index) in slidesAtivos"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Croissant,
  Flame,
  ShoppingBag,
  Wheat,
} from 'lucide-vue-next'

const props = defineProps({
  wide: { type: Boolean, default: false },
  backTo: { type: [String, Object], default: null },
  backLabel: { type: String, default: 'Voltar' },
  promoMode: {
    type: String,
    default: 'generic',
    validator: (value) => ['generic', 'login', 'register'].includes(value),
  },
})

const genericSlides = [
  {
    id: 1,
    icon: ShoppingBag,
    title: 'Reserve seu lanche antes do intervalo',
    description: 'Evite filas e garanta seus produtos favoritos.',
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
]

const loginSlides = [
  {
    id: 1,
    icon: ShoppingBag,
    title: 'Pastel + Coca-Cola',
    description: 'A combinação perfeita para seu intervalo!',
    price: '12,90',
  },
  {
    id: 2,
    icon: Croissant,
    title: 'Combo do intervalo',
    description: 'Reserve antes do sinal e evite filas na cantina.',
    price: '10,90',
  },
  {
    id: 3,
    icon: Coffee,
    title: 'Café + doce',
    description: 'Uma pausa rápida e gostosa para continuar o dia.',
    price: '8,50',
  },
]

const registerSlides = [
  {
    id: 1,
    icon: Croissant,
    title: 'Produtos fresquinhos todos os dias',
    description: 'Feitos com carinho para tornar seu intervalo ainda melhor.',
  },
  {
    id: 2,
    icon: ShoppingBag,
    title: 'Reserve antes do intervalo',
    description: 'Evite filas e garanta seus produtos favoritos.',
  },
  {
    id: 3,
    icon: Cookie,
    title: 'Promoções para alunos',
    description: 'Acompanhe as ofertas disponíveis direto pelo sistema.',
  },
]

const slidesAtivos = computed(() => {
  if (props.promoMode === 'login') return loginSlides
  if (props.promoMode === 'register') return registerSlides
  return genericSlides
})

const slideIndex = ref(0)
const slideAtual = computed(() => slidesAtivos.value[slideIndex.value] || slidesAtivos.value[0])
let intervalId = null

function iniciarCarousel() {
  window.clearInterval(intervalId)

  intervalId = window.setInterval(() => {
    slideIndex.value = (slideIndex.value + 1) % slidesAtivos.value.length
  }, 5000)
}

function selecionarSlide(index) {
  slideIndex.value = index
  iniciarCarousel()
}

watch(
  () => props.promoMode,
  () => {
    slideIndex.value = 0
    iniciarCarousel()
  },
)

onMounted(iniciarCarousel)
onBeforeUnmount(() => window.clearInterval(intervalId))
</script>

<style scoped>
.auth-layout {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(520px, 48%) 1fr;
  overflow: hidden;
  background: var(--pp-bg-dark);
}

.auth-layout--wide {
  grid-template-columns: minmax(640px, 55%) 1fr;
}

.auth-layout__panel {
  position: relative;
  min-width: 0;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
  padding: clamp(48px, 6.2vh, 66px) clamp(48px, 8.7vw, 134px) 54px;
  background:
    radial-gradient(circle at 77% 31%, rgba(224, 168, 62, 0.055), transparent 29%),
    linear-gradient(180deg, #1c0d04 0%, #2d1406 100%);
}

.auth-layout--wide .auth-layout__panel {
  justify-content: center;
  align-items: center;
  padding: clamp(28px, 4.2vh, 44px) clamp(52px, 6vw, 96px);
}

.auth-layout__watermark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: var(--pp-gold);
  opacity: 0.038;
}

.auth-layout__watermark > :first-child {
  position: absolute;
  left: -58px;
  bottom: 4%;
  transform: rotate(-15deg);
}

.auth-layout__watermark > :last-child {
  position: absolute;
  right: 1%;
  top: 12%;
  transform: rotate(24deg);
}

.auth-layout__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 468px;
}

.auth-layout--wide .auth-layout__content {
  max-width: 640px;
}

.auth-layout__back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 24px;
  color: var(--pp-cream-dim);
  font-size: 13px;
  transition: color 160ms ease;
}

.auth-layout__back:hover {
  color: var(--pp-gold);
}

.auth-layout--wide .auth-layout__back {
  display: none;
}

.auth-layout__brand {
  display: block;
  width: max-content;
  margin: 0 0 clamp(38px, 5vh, 58px);
}

.auth-layout__brand img {
  display: block;
  width: 214px;
  max-width: 100%;
  height: auto;
}

.auth-layout--wide .auth-layout__brand {
  margin-bottom: 34px;
}

.auth-layout--wide .auth-layout__brand img {
  width: 205px;
}

.auth-layout__heading :deep(h1) {
  margin: 0 0 18px;
  color: var(--pp-cream);
  font-family: var(--pp-font-display);
  font-size: clamp(38px, 3.05vw, 46px);
  font-weight: 700;
  line-height: 1.09;
  letter-spacing: -0.018em;
}

.auth-layout--wide .auth-layout__heading :deep(h1) {
  max-width: 500px;
  margin-bottom: 14px;
  font-size: clamp(34px, 2.45vw, 40px);
}

.auth-layout__heading :deep(h1 span) {
  color: #ffb52e;
}

.auth-layout__heading :deep(p) {
  max-width: 480px;
  margin: 0 0 30px;
  color: var(--pp-cream-dim);
  font-size: 15px;
  line-height: 1.55;
}

.auth-layout--wide .auth-layout__heading :deep(p) {
  margin-bottom: 26px;
  font-size: 14px;
}

.auth-layout__photo {
  position: relative;
  min-width: 0;
  min-height: 100dvh;
  overflow: hidden;
  background: url('/background-image.png') center / cover no-repeat;
}

.auth-layout__photo-overlay,
.auth-layout__photo-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-layout__photo-overlay {
  background: linear-gradient(90deg, rgba(45, 19, 5, 0.24), transparent 40%);
}

.auth-layout__photo-vignette {
  background:
    linear-gradient(180deg, rgba(17, 8, 3, 0.04) 0%, transparent 42%, rgba(17, 8, 3, 0.34) 100%),
    radial-gradient(circle at center, transparent 50%, rgba(22, 9, 3, 0.18) 100%);
}

.auth-layout__carousel {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: clamp(30px, 5.2vh, 54px);
  width: min(390px, calc(100% - 64px));
  transform: translateX(-50%);
}

.auth-layout--promo-login .auth-layout__carousel {
  width: min(630px, calc(100% - 72px));
}

.auth-layout__promo-card {
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 18px;
  min-height: 148px;
  padding: 24px;
  border: 1px solid rgba(224, 168, 62, 0.48);
  border-radius: 22px;
  background: rgba(45, 19, 6, 0.91);
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
  line-height: 1.2;
}

.auth-layout__promo-card p {
  margin: 0;
  color: var(--pp-cream-dim);
  font-size: 13px;
  line-height: 1.5;
}

.auth-layout__offer-card {
  min-height: 286px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  align-items: center;
  gap: 18px;
  padding: 26px 30px;
  border: 1px solid rgba(224, 168, 62, 0.42);
  border-radius: 26px;
  background: rgba(38, 16, 5, 0.92);
  box-shadow: 0 24px 56px rgba(8, 3, 1, 0.38);
  backdrop-filter: blur(14px);
  color: var(--pp-cream);
}

.auth-layout__offer-copy {
  min-width: 0;
}

.auth-layout__offer-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 15px;
  padding: 7px 12px;
  border-radius: 9px;
  background: rgba(224, 168, 62, 0.12);
  color: var(--pp-gold);
  font-size: 13px;
  font-weight: 600;
}

.auth-layout__offer-copy > strong {
  display: block;
  margin-bottom: 8px;
  font-family: var(--pp-font-display);
  font-size: 25px;
  line-height: 1.15;
}

.auth-layout__offer-copy > p {
  max-width: 300px;
  margin: 0 0 10px;
  color: var(--pp-cream-dim);
  font-size: 14px;
  line-height: 1.45;
}

.auth-layout__offer-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 13px;
  color: var(--pp-gold);
}

.auth-layout__offer-price small {
  color: var(--pp-cream);
  font-size: 14px;
}

.auth-layout__offer-price span {
  font-family: var(--pp-font-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
}

.auth-layout__offer-action {
  width: min(260px, 100%);
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 8px;
  background: var(--pp-gradient-gold);
  color: var(--pp-bg-dark);
  font-size: 15px;
  font-weight: 700;
}

.auth-layout__offer-visual {
  width: 180px;
  height: 180px;
  display: grid;
  place-items: center;
  justify-self: end;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(224, 168, 62, 0.22), rgba(224, 168, 62, 0.04) 64%, transparent 65%);
  color: var(--pp-gold);
}

.auth-layout__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 15px;
}

.auth-layout__dots button {
  width: 22px;
  height: 5px;
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

@media (max-width: 1180px) {
  .auth-layout {
    grid-template-columns: minmax(470px, 49%) 1fr;
  }

  .auth-layout--wide {
    grid-template-columns: minmax(590px, 56%) 1fr;
  }

  .auth-layout__panel {
    padding-inline: 64px;
  }

  .auth-layout--wide .auth-layout__panel {
    padding: 30px 54px;
  }

  .auth-layout__offer-card {
    grid-template-columns: 1fr 140px;
  }

  .auth-layout__offer-visual {
    width: 135px;
    height: 135px;
  }
}

@media (max-height: 860px) and (min-width: 821px) {
  .auth-layout__panel {
    padding-top: 34px;
    padding-bottom: 30px;
  }

  .auth-layout--wide .auth-layout__panel {
    align-items: center;
    padding-top: 24px;
    padding-bottom: 24px;
  }

  .auth-layout__brand {
    margin-bottom: 28px;
  }

  .auth-layout__brand img {
    width: 184px;
  }

  .auth-layout--wide .auth-layout__brand {
    margin-bottom: 20px;
  }

  .auth-layout--wide .auth-layout__brand img {
    width: 170px;
  }

  .auth-layout__heading :deep(h1) {
    margin-bottom: 11px;
    font-size: 39px;
  }

  .auth-layout--wide .auth-layout__heading :deep(h1) {
    margin-bottom: 8px;
    font-size: 34px;
  }

  .auth-layout__heading :deep(p) {
    margin-bottom: 20px;
    font-size: 13px;
  }

  .auth-layout__carousel {
    bottom: 20px;
  }

  .auth-layout__promo-card {
    min-height: 120px;
    padding: 18px 20px;
  }

  .auth-layout__offer-card {
    min-height: 220px;
    padding: 20px 24px;
  }

  .auth-layout__offer-price span {
    font-size: 34px;
  }
}

@media (max-width: 820px) {
  .auth-layout,
  .auth-layout--wide {
    display: block;
    overflow: visible;
  }

  .auth-layout__panel,
  .auth-layout--wide .auth-layout__panel {
    min-height: 100dvh;
    align-items: flex-start;
    padding: 24px 24px 40px;
    overflow-y: auto;
  }

  .auth-layout__content,
  .auth-layout--wide .auth-layout__content {
    max-width: 520px;
    margin: 0 auto;
  }

  .auth-layout--wide .auth-layout__back {
    display: inline-flex;
    margin-bottom: 24px;
  }

  .auth-layout__brand,
  .auth-layout--wide .auth-layout__brand {
    width: 100%;
    margin: 8px auto 34px;
    text-align: center;
  }

  .auth-layout__brand img,
  .auth-layout--wide .auth-layout__brand img {
    width: 170px;
    margin: 0 auto;
  }

  .auth-layout__photo {
    display: none;
  }

  .auth-layout__heading :deep(h1),
  .auth-layout--wide .auth-layout__heading :deep(h1) {
    max-width: none;
    font-size: 31px;
  }

  .auth-layout__heading :deep(p),
  .auth-layout--wide .auth-layout__heading :deep(p) {
    max-width: 420px;
    margin-bottom: 26px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .auth-layout__panel,
  .auth-layout--wide .auth-layout__panel {
    padding: 20px 20px 34px;
  }

  .auth-layout--wide .auth-layout__back {
    margin-bottom: 16px;
  }

  .auth-layout__brand,
  .auth-layout--wide .auth-layout__brand {
    margin-bottom: 28px;
  }

  .auth-layout__brand img,
  .auth-layout--wide .auth-layout__brand img {
    width: 150px;
  }

  .auth-layout__heading :deep(h1),
  .auth-layout--wide .auth-layout__heading :deep(h1) {
    font-size: 28px;
  }
}
</style>
