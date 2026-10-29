<template>
  <section
    ref="raiz"
    class="home-banner"
    :class="{ 'is-pausado': abaEscondida, 'is-estatico': movimentoReduzido, 'tem-comercial': temComercial(slidesVisuais[atual]) }"
    aria-roledescription="carrossel"
    aria-label="Destaques da Pires"
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
        v-for="(slide, indice) in slidesVisuais"
        :key="slide.id"
        class="home-banner__slide"
        :class="{ 'is-ativo': indice === atual, 'home-banner__slide--comercial': temComercial(slide) }"
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
          <span v-if="slide.nota && !slide.video" class="home-banner__nota">
            {{ slide.nota }}
            <svg viewBox="0 0 90 40" aria-hidden="true">
              <path d="M4 6 C30 6 50 14 74 32" />
              <path d="M64 32 L76 33 L72 21" />
            </svg>
          </span>
          <!-- Comercial com cenário: cores originais e poster independente do vídeo. -->
          <img
            v-if="slide.poster && !fotosComErro.has(slide.poster)"
            :src="slide.poster"
            :alt="slide.titulo.join(' ')"
            class="home-banner__poster"
            @error="registrarFotoComErro(slide.poster)"
          />
          <video
            v-if="slide.video && !movimentoReduzido && !videosComErro.has(slide.id)"
            :ref="(el) => registrarVideo(slide.id, el)"
            class="home-banner__video"
            :src="slide.video"
            :poster="slide.poster"
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
            @error="registrarVideoComErro(slide.id)"
            @ended="aoTerminarVideo(slide.id)"
            @canplay="sincronizarVideos"
          />
          <img
            v-else-if="(!slide.poster || fotosComErro.has(slide.poster)) && slide.imagem && !fotosComErro.has(slide.id)"
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
            v-else-if="!slide.poster || fotosComErro.has(slide.poster)"
            class="home-banner__ilustracao"
            :tipo="slide.ilustracao"
          />
        </div>
      </article>

      <div v-if="slides.length > 1" class="home-banner__controles">
        <div class="home-banner__indicadores">
          <button
            v-for="(slide, indice) in slides"
            :key="slide.id"
            type="button"
            class="home-banner__indicador"
            :class="{ 'is-ativo': indice === atual }"
            :style="{ '--duracao': `${slide.duracao || DURACAO_SLIDE_MS}ms` }"
            :aria-label="`Ir para o destaque ${indice + 1}`"
            :aria-current="indice === atual ? 'true' : undefined"
            @click="irPara(indice)"
          />
        </div>
      </div>
    </template>

  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { ArrowRight, ShoppingBag } from "lucide-vue-next";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

// Tempo de cada destaque e trecho de rolagem em que a cena termina de "subir".
const DURACAO_SLIDE_MS = 6000;
const ROLAGEM_PARALLAX_PX = 320;

const props = defineProps({
  // { id, etiqueta, titulo: string[], destaque, texto, nota?, ilustracao, imagem?,
  //   video?, poster?, videoMobile?, posterMobile?, duracao?,
  //   acao: { tipo: 'adicionar' | 'rota', rotulo, produto?, rota? } }
  slides: { type: Array, default: () => [] },
  carregando: { type: Boolean, default: false },
  adicionandoId: { type: [Number, String], default: null },
});

const emit = defineEmits(["adicionar"]);

const raiz = useTemplateRef("raiz");
const atual = shallowRef(0);
const movimentoReduzido = shallowRef(false);
const abaEscondida = shallowRef(document.hidden);
const consultaLayout = window.matchMedia("(max-width: 760px)");
const telaMobile = shallowRef(consultaLayout.matches);
const slidesVisuais = computed(() => props.slides.map((slide) => ({
  ...slide,
  video: telaMobile.value && slide.videoMobile ? slide.videoMobile : slide.video,
  poster: telaMobile.value && slide.posterMobile ? slide.posterMobile : slide.poster,
})));
// Foto que não carregou (ex.: 404 no Cloudinary) volta para a ilustração.
const fotosComErro = shallowRef(new Set());
let timer = null;
let consultaMovimento = null;
let quadroAgendado = false;

// Falha ou bloqueio de reprodução mantém o poster; depois, foto/ilustração.
const videosComErro = shallowRef(new Set());
const videos = new Map();

function temComercial(slide) {
  if (!slide?.video) return false;
  return (!movimentoReduzido.value && !videosComErro.value.has(slide.id)) ||
    (slide.poster && !fotosComErro.value.has(slide.poster));
}

function registrarVideoComErro(id) {
  videosComErro.value = new Set(videosComErro.value).add(id);
  nextTick(agendar);
}

function registrarVideo(id, el) {
  if (el) videos.set(id, el);
  else videos.delete(id);
}

// Só o destaque ativo toca. Movimento reduzido renderiza apenas o poster.
function sincronizarVideos() {
  props.slides.forEach((slide, indice) => {
    const video = videos.get(slide.id);
    if (!video) return;
    if (indice === atual.value && !movimentoReduzido.value && !abaEscondida.value) {
      if (video.paused) video.play().catch((erro) => {
        if (erro.name !== "AbortError") registrarVideoComErro(slide.id);
      });
    } else {
      video.pause();
      if (indice !== atual.value && video.currentTime !== 0) video.currentTime = 0;
    }
  });
}

watch([atual, movimentoReduzido, abaEscondida, telaMobile, () => props.slides], () => {
  nextTick(() => { sincronizarVideos(); agendar(); });
}, { flush: "post" });

function aoTerminarVideo(id) {
  if (props.slides[atual.value]?.id === id && !abaEscondida.value) irPara(atual.value + 1);
}

function aoMudarVisibilidade() {
  abaEscondida.value = document.hidden;
}

function aoMudarLayout() {
  telaMobile.value = consultaLayout.matches;
}

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
  if (movimentoReduzido.value || abaEscondida.value || props.slides.length < 2) return;
  const slide = props.slides[atual.value];
  // O comercial toca até o fim; sair do slide reinicia a mídia para a próxima visita.
  if (slide?.video && !videosComErro.value.has(slide.id)) return;
  timer = window.setTimeout(() => irPara(atual.value + 1), slide?.duracao || DURACAO_SLIDE_MS);
}

function adicionar(slide, event) {
  const produto = event.currentTarget
    .closest(".home-banner__slide")
    ?.querySelector(".home-banner__video, .home-banner__foto, .home-banner__ilustracao");
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
  consultaLayout.addEventListener("change", aoMudarLayout);
  consultaMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  consultaMovimento?.addEventListener?.("change", aoMudarMovimento);
  movimentoReduzido.value = Boolean(consultaMovimento?.matches);
  window.addEventListener("scroll", aoRolar, { passive: true });
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
  atualizarCena();
  agendar();
  nextTick(sincronizarVideos);
});

onBeforeUnmount(() => {
  consultaLayout.removeEventListener("change", aoMudarLayout);
  window.clearTimeout(timer);
  window.removeEventListener("scroll", aoRolar);
  document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  videos.forEach((video) => video.pause());
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
.home-banner__video {
  width: 360px;
  height: 360px;
  object-fit: contain;
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity 0.6s var(--pp-ease),
    transform 0.7s var(--pp-ease);
}
.is-ativo .home-banner__video {
  opacity: 1;
  transform: none;
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
.home-banner button:focus-visible,
.home-banner a:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 3px;
}
.home-banner.tem-comercial {
  height: 460px;
}
.home-banner__slide--comercial {
  grid-template-columns: 1fr;
  background: var(--pp-creme-2);
}
.home-banner__slide--comercial .home-banner__texto {
  position: relative;
  z-index: 2;
  max-width: 40%;
}
.home-banner__slide--comercial .home-banner__etiqueta,
.home-banner__slide--comercial .home-banner__titulo,
.home-banner__slide--comercial .home-banner__texto p {
  color: var(--pp-creme);
}
.home-banner__slide--comercial .home-banner__titulo em {
  color: var(--pp-gold);
}
.home-banner__slide--comercial .home-banner__botao {
  background: var(--pp-gold);
  color: var(--pp-marrom);
}
.tem-comercial button:focus-visible {
  outline-color: var(--pp-creme);
}
.home-banner__slide--comercial .home-banner__arte {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: none;
}
.home-banner__poster,
.home-banner__slide--comercial .home-banner__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right center;
  transform: none;
}
.home-banner__slide--comercial .home-banner__video {
  z-index: 1;
}
.home-banner__indicadores {
  display: flex;
  gap: 0;
}
.home-banner__indicador {
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
/* Área de toque maior que a barrinha visível. */
.home-banner__indicador::before {
  content: "";
  position: absolute;
  inset: 19px 8px;
  border-radius: 6px;
  background: var(--pp-creme-borda);
}
.home-banner__indicador.is-ativo::after {
  content: "";
  position: absolute;
  inset: 19px 8px;
  border-radius: 6px;
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
  /* Celular: mídia acima e chamadas na mesma posição em todos os slides. */
  .home-banner {
    --altura-midia: max(260px, calc((100vw - 26px) * 7 / 9));
    height: calc(var(--altura-midia) + 320px);
    border-radius: 22px;
  }
  .home-banner__slide {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: var(--altura-midia) 20px 64px;
  }
  .home-banner__texto {
    width: 100%;
    flex: none;
  }
  .home-banner__titulo {
    margin: 8px 0 10px;
    font-size: clamp(30px, 8.5vw, 36px);
  }
  .home-banner__texto p {
    max-width: 100%;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .home-banner__arte {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
    height: var(--altura-midia);
    transform: none;
  }
  .home-banner__video,
  .home-banner__ilustracao,
  .home-banner__foto {
    width: 210px;
    height: 210px;
  }
  .home-banner__nota {
    display: none;
  }
  .home-banner__controles {
    left: 20px;
    right: auto;
    bottom: 8px;
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
  .home-banner.tem-comercial {
    height: calc(var(--altura-midia) + 320px);
  }
  .home-banner__slide--comercial {
    padding: var(--altura-midia) 20px 64px;
  }
  .home-banner__slide--comercial .home-banner__arte {
    height: 100%;
    overflow: hidden;
  }
  .home-banner__slide--comercial .home-banner__texto {
    width: 100%;
    max-width: 100%;
    flex: none;
  }
  .home-banner__slide--comercial .home-banner__texto p {
    max-width: 100%;
  }
  .home-banner__slide--comercial .home-banner__video,
  .home-banner__slide--comercial .home-banner__poster {
    object-position: center top;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-banner *,
  .home-banner *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
