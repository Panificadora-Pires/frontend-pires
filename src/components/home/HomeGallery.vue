<script setup>
import {
  computed,
  onBeforeUnmount,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { ArrowLeft, ArrowRight, Camera } from "lucide-vue-next";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

const props = defineProps({
  fotos: { type: Array, default: () => [] },
});
const fotosVisiveis = computed(() => props.fotos.slice(0, 3));
const indice = shallowRef(0);
const fotoAtual = computed(() => fotosVisiveis.value[indice.value]);
const trilha = useTemplateRef("trilha");
const falhas = shallowRef([]);
const emPrevia = import.meta.env.DEV;
let frame = 0;
let destino = null;

function selecionar(novoIndice, imediato = false) {
  indice.value = Math.max(
    0,
    Math.min(fotosVisiveis.value.length - 1, novoIndice),
  );
  const alvo = trilha.value?.children[indice.value];
  if (alvo && trilha.value.clientWidth < trilha.value.scrollWidth) {
    destino = indice.value;
    trilha.value.scrollTo({
      left: alvo.offsetLeft,
      behavior: imediato || movimentoReduzido() ? "instant" : "smooth",
    });
  } else {
    destino = null;
  }
}
function lerPosicao() {
  frame = 0;
  const lista = trilha.value;
  if (!lista || lista.scrollWidth <= lista.clientWidth) return;
  if (destino !== null) {
    if (Math.abs(lista.children[destino].offsetLeft - lista.scrollLeft) > 1)
      return;
    destino = null;
  }
  let proximo = 0;
  for (let i = 1; i < lista.children.length; i++) {
    if (
      Math.abs(lista.children[i].offsetLeft - lista.scrollLeft) <
      Math.abs(lista.children[proximo].offsetLeft - lista.scrollLeft)
    )
      proximo = i;
  }
  indice.value = proximo;
}
function aoRolar() {
  if (!frame) frame = requestAnimationFrame(lerPosicao);
}
function liberarDestino() {
  destino = null;
}
function aoTerminarRolagem() {
  liberarDestino();
  lerPosicao();
}
function falhou(id) {
  falhas.value = [...falhas.value, id];
}
function aoTeclar(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") selecionar(0);
  else if (event.key === "End") selecionar(fotosVisiveis.value.length - 1);
  else selecionar(indice.value + (event.key === "ArrowRight" ? 1 : -1));
}
watch(
  () => props.fotos,
  () => {
    destino = null;
    indice.value = 0;
    falhas.value = [];
    trilha.value?.scrollTo({ left: 0, behavior: "instant" });
  },
  { flush: "post" },
);
watch(
  trilha,
  (elemento, anterior, onCleanup) => {
    if (!elemento) return;
    const observer = new ResizeObserver(() => selecionar(indice.value, true));
    observer.observe(elemento);
    onCleanup(() => observer.disconnect());
  },
  { flush: "post" },
);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <section
    v-if="fotosVisiveis.length || emPrevia"
    class="home-gallery"
    aria-labelledby="titulo-balcao"
  >
    <HomeSectionHeader title-id="titulo-balcao" title="Por trás do balcão" />
    <div v-if="!fotosVisiveis.length" class="home-gallery__empty">
      <Camera :size="32" aria-hidden="true" />
      <div>
        <p class="home-gallery__empty-title">
          As imagens do balcão ainda não estão disponíveis.
        </p>
        <p>
          Prévia para revisão: nenhuma imagem foi selecionada para a galeria.
        </p>
      </div>
    </div>
    <div
      v-else
      class="home-gallery__body"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Imagens ilustrativas do balcão"
    >
      <div
        ref="trilha"
        class="home-gallery__track"
        tabindex="0"
        aria-label="Imagens; use as setas, Home ou End para navegar"
        @scroll.passive="aoRolar"
        @scrollend="aoTerminarRolagem"
        @pointerdown="liberarDestino"
        @wheel.passive="liberarDestino"
        @keydown="aoTeclar"
      >
        <figure
          v-for="(foto, i) in fotosVisiveis"
          :key="foto.id"
          class="home-gallery__photo"
          :class="{ 'is-active': i === indice }"
        >
          <div
            v-if="falhas.includes(foto.id)"
            class="home-gallery__unavailable"
          >
            <Camera :size="32" aria-hidden="true" />Foto indisponível
          </div>
          <img
            v-else
            :src="foto.src"
            :alt="foto.alt"
            :width="foto.width"
            :height="foto.height"
            loading="lazy"
            @error="falhou(foto.id)"
          />
          <figcaption>{{ foto.legenda }}</figcaption>
        </figure>
      </div>
      <div v-if="fotosVisiveis.length > 1" class="home-gallery__aside">
        <div class="home-gallery__thumbnails" aria-label="Escolha uma foto">
          <button
            v-for="(foto, i) in fotosVisiveis"
            :key="foto.id"
            type="button"
            class="home-gallery__thumbnail"
            :aria-label="`Ver foto ${i + 1}: ${foto.legenda}`"
            :aria-pressed="i === indice"
            @click="selecionar(i)"
          >
            <img
              v-if="!falhas.includes(foto.id)"
              :src="foto.src"
              alt=""
              :width="foto.width"
              :height="foto.height"
              loading="lazy"
            />
            <Camera v-else :size="24" aria-hidden="true" />
            <span>{{ foto.legenda }}</span>
          </button>
        </div>
        <div class="home-gallery__controls">
          <button
            type="button"
            aria-label="Foto anterior"
            :disabled="indice === 0"
            @click="selecionar(indice - 1)"
          >
            <ArrowLeft :size="20" aria-hidden="true" />
          </button>
          <p aria-live="polite" aria-atomic="true">
            {{ indice + 1 }} de {{ fotosVisiveis.length
            }}<span class="home-gallery__sr">: {{ fotoAtual?.legenda }}</span>
          </p>
          <button
            type="button"
            aria-label="Próxima foto"
            :disabled="indice === fotosVisiveis.length - 1"
            @click="selecionar(indice + 1)"
          >
            <ArrowRight :size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
    <p v-if="fotosVisiveis.length" class="home-gallery__credit">
      Fotos meramente ilustrativas
    </p>
  </section>
</template>

<style scoped src="./HomeGallery.css"></style>
