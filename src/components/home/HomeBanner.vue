<template>
  <section
    ref="raiz"
    class="home-banner"
    :class="{
      'is-pausado': abaEscondida,
      'is-estatico': movimentoReduzido,
      'tem-comercial': temComercial(slidesVisuais[atual]),
    }"
    aria-roledescription="carrossel"
    aria-label="Destaques da Pires"
  >
    <div class="home-banner__cena" aria-hidden="true">
      <svg
        class="home-banner__camada home-banner__camada--fundo"
        viewBox="0 0 1200 380"
        preserveAspectRatio="none"
      >
        <path
          d="M0 250 C160 200 330 235 520 205 C720 172 900 228 1200 190 L1200 380 L0 380 Z"
        />
      </svg>
      <svg
        class="home-banner__camada home-banner__camada--meio"
        viewBox="0 0 1200 380"
        preserveAspectRatio="none"
      >
        <path
          d="M0 300 C220 250 430 300 680 262 C880 232 1040 280 1200 255 L1200 380 L0 380 Z"
        />
        <g class="home-banner__farinha">
          <ellipse cx="180" cy="300" rx="6" ry="2.5" />
          <ellipse cx="420" cy="292" rx="5" ry="2" />
          <ellipse cx="760" cy="270" rx="6" ry="2.5" />
          <ellipse cx="980" cy="276" rx="5" ry="2" />
          <ellipse cx="1110" cy="268" rx="4" ry="2" />
        </g>
      </svg>
      <svg
        class="home-banner__camada home-banner__camada--frente"
        viewBox="0 0 1200 380"
        preserveAspectRatio="none"
      >
        <path
          d="M0 345 C260 318 520 350 800 326 C980 312 1100 334 1200 324 L1200 380 L0 380 Z"
        />
      </svg>
    </div>

    <div
      v-if="carregando"
      class="home-banner__skeleton"
      role="status"
      aria-label="Carregando destaques"
    >
      <span /><span /><span />
    </div>

    <template v-else>
      <article
        v-for="(slide, indice) in slidesVisuais"
        :key="slide.id"
        class="home-banner__slide"
        :class="{
          'is-ativo': indice === atual,
          'home-banner__slide--comercial': temComercial(slide),
        }"
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
            class="home-banner__botao pp-card-action"
            :disabled="adicionandoId === slide.acao.produto?.id"
            @click="adicionar(slide, $event)"
          >
            <CardActionContent>
              <ShoppingBag :size="17" aria-hidden="true" />
              {{ slide.acao.rotulo }}
            </CardActionContent>
          </button>
          <RouterLink
            v-else
            :to="{ name: slide.acao.rota }"
            class="home-banner__botao pp-card-action"
          >
            <CardActionContent>
              {{ slide.acao.rotulo }}
              <ArrowRight :size="17" aria-hidden="true" />
            </CardActionContent>
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
          <img
            v-if="slide.poster && !fotosComErro.has(slide.poster)"
            :src="slide.poster"
            :alt="slide.titulo.join(' ')"
            class="home-banner__poster"
            @error="registrarFotoComErro(slide.poster)"
          />
          <video
            v-if="
              slide.video && !movimentoReduzido && !videosComErro.has(slide.id)
            "
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
            v-else-if="
              (!slide.poster || fotosComErro.has(slide.poster)) &&
              slide.imagem &&
              !fotosComErro.has(slide.id)
            "
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
            <rect
              class="qr-celular"
              x="40"
              y="26"
              width="120"
              height="150"
              rx="20"
            />
            <rect
              class="qr-tela"
              x="52"
              y="44"
              width="96"
              height="104"
              rx="10"
            />
            <g class="qr-celular">
              <rect x="62" y="54" width="24" height="24" rx="3" />
              <rect x="114" y="54" width="24" height="24" rx="3" />
              <rect x="62" y="114" width="24" height="24" rx="3" />
              <rect x="96" y="96" width="10" height="10" />
              <rect x="114" y="114" width="10" height="10" />
              <rect x="128" y="126" width="10" height="10" />
              <rect x="96" y="124" width="10" height="10" />
              <rect x="96" y="60" width="8" height="18" />
            </g>
            <g class="qr-tela">
              <rect x="68" y="60" width="12" height="12" />
              <rect x="120" y="60" width="12" height="12" />
              <rect x="68" y="120" width="12" height="12" />
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { ArrowRight, ShoppingBag } from "lucide-vue-next";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const DURACAO_SLIDE_MS = 6000;
const ROLAGEM_PARALLAX_PX = 320;

const props = defineProps({
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
const slidesVisuais = computed(() =>
  props.slides.map((slide) => ({
    ...slide,
    video:
      telaMobile.value && slide.videoMobile ? slide.videoMobile : slide.video,
    poster:
      telaMobile.value && slide.posterMobile
        ? slide.posterMobile
        : slide.poster,
  })),
);
const fotosComErro = shallowRef(new Set());
let timer = null;
let consultaMovimento = null;
let quadroAgendado = false;

const videosComErro = shallowRef(new Set());
const videos = new Map();

function temComercial(slide) {
  if (!slide?.video) return false;
  return (
    (!movimentoReduzido.value && !videosComErro.value.has(slide.id)) ||
    (slide.poster && !fotosComErro.value.has(slide.poster))
  );
}

function registrarVideoComErro(id) {
  videosComErro.value = new Set(videosComErro.value).add(id);
  nextTick(agendar);
}

function registrarVideo(id, el) {
  if (el) videos.set(id, el);
  else videos.delete(id);
}

function sincronizarVideos() {
  props.slides.forEach((slide, indice) => {
    const video = videos.get(slide.id);
    if (!video) return;
    if (
      indice === atual.value &&
      !movimentoReduzido.value &&
      !abaEscondida.value
    ) {
      if (video.paused)
        video.play().catch((erro) => {
          if (erro.name !== "AbortError") registrarVideoComErro(slide.id);
        });
    } else {
      video.pause();
      if (indice !== atual.value && video.currentTime !== 0)
        video.currentTime = 0;
    }
  });
}

watch(
  [atual, movimentoReduzido, abaEscondida, telaMobile, () => props.slides],
  () => {
    nextTick(() => {
      sincronizarVideos();
      agendar();
    });
  },
  { flush: "post" },
);

function aoTerminarVideo(id) {
  if (props.slides[atual.value]?.id === id && !abaEscondida.value)
    irPara(atual.value + 1);
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
  if (movimentoReduzido.value || abaEscondida.value || props.slides.length < 2)
    return;
  const slide = props.slides[atual.value];
  if (slide?.video && !videosComErro.value.has(slide.id)) return;
  timer = window.setTimeout(
    () => irPara(atual.value + 1),
    slide?.duracao || DURACAO_SLIDE_MS,
  );
}

function adicionar(slide, event) {
  const produto = event.currentTarget
    .closest(".home-banner__slide")
    ?.querySelector(
      ".home-banner__video, .home-banner__foto, .home-banner__ilustracao",
    );
  registrarOrigemVoo(produto);
  emit("adicionar", slide.acao.produto);
}

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

watch(
  () => props.slides.map((slide) => slide.id).join(","),
  () => {
    atual.value = 0;
    agendar();
  },
);

onMounted(() => {
  consultaLayout.addEventListener("change", aoMudarLayout);
  consultaMovimento =
    window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
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

<style scoped src="./HomeBanner.css"></style>
