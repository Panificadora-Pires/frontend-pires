<template>
  <section
    ref="raiz"
    class="home-banner"
    :class="{ 'is-pausado': pausado, 'is-estatico': movimentoReduzido }"
    aria-roledescription="carrossel"
    aria-label="Destaques da Pires"
    @mouseenter="pausar"
    @mouseleave="retomar"
    @focusin="pausar"
    @focusout="retomarSeFocoSaiu"
  >
    <!-- Cena em camadas: "morros de massa" que sobem em velocidades diferentes na rolagem. -->
    <div class="home-banner__cena" aria-hidden="true">
      <svg class="home-banner__camada home-banner__camada--fundo" viewBox="0 0 1200 380" preserveAspectRatio="none">
        <path d="M0 250 C160 200 330 235 520 205 C720 172 900 228 1200 190 L1200 380 L0 380 Z" />
      </svg>
      <svg class="home-banner__camada home-banner__camada--meio" viewBox="0 0 1200 380" preserveAspectRatio="none">
        <path d="M0 300 C220 250 430 300 680 262 C880 232 1040 280 1200 255 L1200 380 L0 380 Z" />
        <g class="home-banner__farinha">
          <ellipse cx="180" cy="300" rx="6" ry="2.5" /><ellipse cx="420" cy="292" rx="5" ry="2" />
          <ellipse cx="760" cy="270" rx="6" ry="2.5" /><ellipse cx="980" cy="276" rx="5" ry="2" />
          <ellipse cx="1110" cy="268" rx="4" ry="2" />
        </g>
      </svg>
      <svg class="home-banner__camada home-banner__camada--frente" viewBox="0 0 1200 380" preserveAspectRatio="none">
        <path d="M0 345 C260 318 520 350 800 326 C980 312 1100 334 1200 324 L1200 380 L0 380 Z" />
      </svg>
    </div>

    <div v-if="carregando" class="home-banner__skeleton" role="status" aria-label="Carregando destaques">
      <span /><span /><span />
    </div>

    <template v-else>
      <article
        v-for="(slide, indice) in slides"
        :key="slide.id"
        class="home-banner__slide"
        :class="{ 'is-ativo': indice === atual }"
        aria-roledescription="slide"
        :aria-label="`${indice + 1} de ${slides.length}`"
        :aria-hidden="indice !== atual"
        :inert="indice !== atual"
      >
        <div class="home-banner__texto">
          <span class="home-banner__etiqueta">{{ slide.etiqueta }}</span>
          <h2 class="home-banner__titulo">
            <span v-for="linha in slide.titulo" :key="linha">{{ linha }}</span>
            <em v-if="slide.destaque">{{ slide.destaque }}</em>
          </h2>
          <p>{{ slide.texto }}</p>
          <button
            v-if="slide.acao.tipo === 'adicionar'"
            type="button"
            class="home-banner__botao"
            :disabled="adicionandoId === slide.acao.produto?.id"
            @click="adicionar(slide, $event)"
          >
            <ShoppingBag :size="17" aria-hidden="true" />
            {{ slide.acao.rotulo }}
          </button>
          <RouterLink
            v-else
            :to="{ name: slide.acao.rota }"
            class="home-banner__botao"
          >
            {{ slide.acao.rotulo }}
            <ArrowRight :size="17" aria-hidden="true" />
          </RouterLink>
        </div>

        <div class="home-banner__arte">
          <span v-if="slide.nota" class="home-banner__nota">
            {{ slide.nota }}
            <svg viewBox="0 0 90 40" aria-hidden="true">
              <path d="M4 6 C30 6 50 14 74 32" />
              <path d="M64 32 L76 33 L72 21" />
            </svg>
          </span>
          <img
            v-if="slide.imagem && !fotosComErro.has(slide.id)"
            :src="slide.imagem"
            :alt="slide.titulo.join(' ')"
            class="home-banner__foto"
            @error="registrarFotoComErro(slide.id)"
          />
          <svg
            v-else-if="slide.ilustracao === 'qr'"
            class="home-banner__ilustracao"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <ellipse class="qr-sombra" cx="100" cy="184" rx="58" ry="8" />
            <rect class="qr-celular" x="40" y="26" width="120" height="150" rx="20" />
            <rect class="qr-tela" x="52" y="44" width="96" height="104" rx="10" />
            <g class="qr-celular">
              <rect x="62" y="54" width="24" height="24" rx="3" /><rect x="114" y="54" width="24" height="24" rx="3" />
              <rect x="62" y="114" width="24" height="24" rx="3" /><rect x="96" y="96" width="10" height="10" />
              <rect x="114" y="114" width="10" height="10" /><rect x="128" y="126" width="10" height="10" />
              <rect x="96" y="124" width="10" height="10" /><rect x="96" y="60" width="8" height="18" />
            </g>
            <g class="qr-tela">
              <rect x="68" y="60" width="12" height="12" /><rect x="120" y="60" width="12" height="12" /><rect x="68" y="120" width="12" height="12" />
            </g>
            <circle class="qr-botao" cx="100" cy="162" r="5" />
          </svg>
          <ProductIllustration
            v-else
            class="home-banner__ilustracao"
            :tipo="slide.ilustracao"
          />
        </div>
      </article>

      <div v-if="slides.length > 1" class="home-banner__controles">
        <button
          type="button"
          class="home-banner__seta"
          aria-label="Destaque anterior"
          @click="irPara(atual - 1)"
        >
          <ChevronLeft :size="18" aria-hidden="true" />
        </button>
        <div class="home-banner__indicadores">
          <button
            v-for="(slide, indice) in slides"
            :key="slide.id"
            type="button"
            class="home-banner__indicador"
            :class="{ 'is-ativo': indice === atual }"
            :style="{ '--duracao': `${DURACAO_SLIDE_MS}ms` }"
            :aria-label="`Ir para o destaque ${indice + 1}`"
            :aria-current="indice === atual ? 'true' : undefined"
            @click="irPara(indice)"
          />
        </div>
        <button
          type="button"
          class="home-banner__seta"
          aria-label="Próximo destaque"
          @click="irPara(atual + 1)"
        >
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </div>
    </template>

  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-vue-next";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

// Tempo de cada destaque e trecho de rolagem em que a cena termina de "subir".
const DURACAO_SLIDE_MS = 6000;
const ROLAGEM_PARALLAX_PX = 320;

const props = defineProps({
  // { id, etiqueta, titulo: string[], destaque, texto, nota?, ilustracao, imagem?,
  //   acao: { tipo: 'adicionar' | 'rota', rotulo, produto?, rota? } }
  slides: { type: Array, default: () => [] },
  carregando: { type: Boolean, default: false },
  adicionandoId: { type: [Number, String], default: null },
});

const emit = defineEmits(["adicionar"]);

const raiz = useTemplateRef("raiz");
const atual = shallowRef(0);
const pausado = shallowRef(false);
const movimentoReduzido = shallowRef(false);
// Foto que não carregou (ex.: 404 no Cloudinary) volta para a ilustração.
const fotosComErro = shallowRef(new Set());
let timer = null;
let consultaMovimento = null;
let quadroAgendado = false;

function registrarFotoComErro(id) {
  fotosComErro.value = new Set(fotosComErro.value).add(id);
}

function irPara(indice) {
  const total = props.slides.length;
  if (!total) return;
  atual.value = (indice + total) % total;
  agendar();
}

function agendar() {
  window.clearTimeout(timer);
  if (pausado.value || movimentoReduzido.value || props.slides.length < 2) return;
  timer = window.setTimeout(() => irPara(atual.value + 1), DURACAO_SLIDE_MS);
}

function pausar() {
  pausado.value = true;
  window.clearTimeout(timer);
}

function retomar() {
  pausado.value = false;
  agendar();
}

function retomarSeFocoSaiu(event) {
  if (!raiz.value?.contains(event.relatedTarget)) retomar();
}

function adicionar(slide, event) {
  const produto = event.currentTarget
    .closest(".home-banner__slide")
    ?.querySelector(".home-banner__foto, .home-banner__ilustracao");
  registrarOrigemVoo(produto);
  emit("adicionar", slide.acao.produto);
}

// Parallax: 0 no topo da página, 1 depois de ROLAGEM_PARALLAX_PX de rolagem.
function atualizarCena() {
  quadroAgendado = false;
  const progresso = movimentoReduzido.value
    ? 1
    : Math.min(1, Math.max(0, window.scrollY / ROLAGEM_PARALLAX_PX));
  raiz.value?.style.setProperty("--p", progresso.toFixed(3));
}

function aoRolar() {
  if (quadroAgendado) return;
  quadroAgendado = true;
  window.requestAnimationFrame(atualizarCena);
}

function aoMudarMovimento() {
  movimentoReduzido.value = Boolean(consultaMovimento?.matches);
  atualizarCena();
  agendar();
}

// Lista nova (promoções ou destaques carregados): volta ao primeiro slide.
watch(
  () => props.slides.map((slide) => slide.id).join(","),
  () => {
    atual.value = 0;
    agendar();
  },
);

onMounted(() => {
  consultaMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  consultaMovimento?.addEventListener?.("change", aoMudarMovimento);
  movimentoReduzido.value = Boolean(consultaMovimento?.matches);
  window.addEventListener("scroll", aoRolar, { passive: true });
  atualizarCena();
  agendar();
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.removeEventListener("scroll", aoRolar);
  consultaMovimento?.removeEventListener?.("change", aoMudarMovimento);
});
</script>

<style scoped>
.home-banner {
  --p: 0;
  position: relative;
  height: 380px;
  overflow: hidden;
  border-radius: 28px;
  background: var(--pp-creme-2);
  isolation: isolate;
}
.home-banner__cena {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.home-banner__camada {
  position: absolute;
  left: -2%;
  bottom: 0;
  width: 104%;
  height: 100%;
  will-change: transform;
}
.home-banner__camada--fundo {
  fill: var(--pp-massa-1);
  transform: translateY(calc((1 - var(--p)) * 70px));
}
.home-banner__camada--meio {
  fill: var(--pp-massa-2);
  transform: translateY(calc((1 - var(--p)) * 120px));
}
.home-banner__camada--frente {
  fill: var(--pp-massa-3);
  transform: translateY(calc((1 - var(--p)) * 170px));
}
.home-banner__farinha {
  fill: var(--pp-creme);
  opacity: 0.8;
}
.home-banner__slide {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  align-items: center;
  padding: 0 56px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s var(--pp-ease);
}
.home-banner__slide.is-ativo {
  opacity: 1;
  pointer-events: auto;
}
.home-banner__texto > * {
  opacity: 0;
  transform: translateY(14px);
  transition:
    opacity 0.5s var(--pp-ease),
    transform 0.5s var(--pp-ease);
}
.is-ativo .home-banner__texto > * {
  opacity: 1;
  transform: none;
}
.is-ativo .home-banner__texto > :nth-child(2) {
  transition-delay: 0.08s;
}
.is-ativo .home-banner__texto > :nth-child(3) {
  transition-delay: 0.16s;
}
.is-ativo .home-banner__texto > :nth-child(4) {
  transition-delay: 0.24s;
}
.home-banner__etiqueta {
  display: block;
  color: var(--pp-dourado-escuro);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.home-banner__titulo {
  display: flex;
  flex-direction: column;
  margin: 10px 0 12px;
  color: var(--pp-marrom);
  font-family: var(--pp-font-titulo);
  font-size: clamp(40px, 4.6vw, 62px);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}
.home-banner__titulo em {
  color: var(--pp-dourado-escuro);
  font-style: normal;
}
.home-banner__texto p {
  max-width: 400px;
  margin: 0 0 20px;
  color: var(--pp-texto-2);
  font-size: 15px;
  line-height: 1.5;
}
.home-banner__botao {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 22px;
  border: 0;
  border-radius: var(--pp-radius-full);
  background: var(--pp-marrom);
  color: var(--pp-creme);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s var(--pp-ease),
    box-shadow 0.18s var(--pp-ease);
}
.home-banner__botao:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(42, 22, 11, 0.18);
}
.home-banner__botao:active {
  transform: scale(0.98);
}
.home-banner__botao:disabled {
  opacity: 0.6;
  cursor: wait;
}
.home-banner__arte {
  position: relative;
  height: 300px;
  display: grid;
  place-items: center;
  transform: translateY(calc((1 - var(--p)) * 60px)) scale(calc(0.94 + var(--p) * 0.06));
}
.home-banner__ilustracao,
.home-banner__foto {
  width: 290px;
  height: 290px;
  opacity: 0;
  transform: translateX(40px) rotate(8deg) scale(0.92);
  transition:
    opacity 0.6s var(--pp-ease),
    transform 0.7s var(--pp-ease);
}
.home-banner__foto {
  border-radius: 50%;
  object-fit: cover;
}
.is-ativo .home-banner__ilustracao,
.is-ativo .home-banner__foto {
  opacity: 1;
  transform: none;
}
.home-banner__nota {
  position: absolute;
  left: 0;
  top: 18px;
  z-index: 1;
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-nota);
  font-size: 27px;
  font-weight: 700;
  transform: rotate(-7deg);
  opacity: 0;
  transition: opacity 0.5s 0.45s;
}
.is-ativo .home-banner__nota {
  opacity: 1;
}
.home-banner__nota svg {
  display: block;
  width: 90px;
  height: 40px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
}
.qr-sombra {
  fill: var(--ilu-sombra);
}
.qr-celular {
  fill: var(--pp-marrom);
}
.qr-tela {
  fill: var(--pp-creme);
}
.qr-botao {
  fill: var(--pp-gold);
}
.home-banner__controles {
  position: absolute;
  right: 24px;
  bottom: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
}
.home-banner__seta {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 50%;
  background: var(--pp-creme);
  color: var(--pp-marrom);
  cursor: pointer;
}
.home-banner__indicadores {
  display: flex;
  gap: 6px;
}
.home-banner__indicador {
  position: relative;
  width: 28px;
  height: 6px;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: var(--pp-creme-borda);
  cursor: pointer;
}
/* Área de toque maior que a barrinha visível. */
.home-banner__indicador::before {
  content: "";
  position: absolute;
  inset: -12px -2px;
}
.home-banner__indicador.is-ativo::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--pp-dourado-escuro);
  transform-origin: left;
  animation: home-banner-progresso var(--duracao) linear forwards;
}
.is-pausado .home-banner__indicador.is-ativo::after {
  animation-play-state: paused;
}
.is-estatico .home-banner__indicador.is-ativo::after {
  animation: none;
}
@keyframes home-banner-progresso {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
.home-banner__skeleton {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  padding: 70px 56px;
}
.home-banner__skeleton span {
  height: 22px;
  border-radius: 8px;
  background: var(--pp-creme-3);
  animation: home-banner-pulso 1.2s ease-in-out infinite;
}
.home-banner__skeleton span:nth-child(1) {
  width: 46%;
  height: 54px;
}
.home-banner__skeleton span:nth-child(2) {
  width: 34%;
}
.home-banner__skeleton span:nth-child(3) {
  width: 160px;
  height: 46px;
  border-radius: var(--pp-radius-full);
}
@keyframes home-banner-pulso {
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 760px) {
  /* Celular: altura média; a ilustração fica no canto e os produtos aparecem logo abaixo. */
  .home-banner {
    height: 400px;
    border-radius: 22px;
  }
  .home-banner__slide {
    grid-template-columns: 1fr;
    align-items: start;
    padding: 26px 20px 0;
  }
  .home-banner__titulo {
    margin: 8px 0 10px;
    font-size: 36px;
  }
  .home-banner__texto p {
    max-width: 62%;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .home-banner__arte {
    position: absolute;
    right: 8px;
    bottom: 46px;
    width: 150px;
    height: 150px;
  }
  .home-banner__ilustracao,
  .home-banner__foto {
    width: 140px;
    height: 140px;
  }
  .home-banner__nota {
    display: none;
  }
  .home-banner__controles {
    left: 20px;
    right: auto;
    bottom: 16px;
  }
  .home-banner__seta {
    width: 34px;
    height: 34px;
  }
  .home-banner__skeleton {
    padding: 40px 22px;
  }
  .home-banner__skeleton span:nth-child(1) {
    width: 80%;
  }
  .home-banner__skeleton span:nth-child(2) {
    width: 60%;
  }
}
</style>
