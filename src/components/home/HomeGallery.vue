<script setup>
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import { ArrowLeft, ArrowRight, Camera } from "lucide-vue-next";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

const props = defineProps({
  // Apenas fotografias documentais autorizadas. Não usar artes do catálogo como registro da loja.
  fotos: { type: Array, default: () => [] },
});
const fotosVisiveis = computed(() => props.fotos.slice(0, 3));
const indice = shallowRef(0);
const fotoAtual = computed(() => fotosVisiveis.value[indice.value]);
const trilha = useTemplateRef("trilha");
const falhas = shallowRef([]);
const emPrevia = import.meta.env.DEV;
let frame = 0;

function selecionar(novoIndice) {
  indice.value = Math.max(0, Math.min(fotosVisiveis.value.length - 1, novoIndice));
  const alvo = trilha.value?.children[indice.value];
  if (alvo && trilha.value.clientWidth < trilha.value.scrollWidth) {
    trilha.value.scrollTo({ left: alvo.offsetLeft, behavior: movimentoReduzido() ? "instant" : "smooth" });
  }
}
function lerPosicao() {
  frame = 0;
  const lista = trilha.value;
  if (!lista || lista.scrollWidth <= lista.clientWidth) return;
  let proximo = 0;
  for (let i = 1; i < lista.children.length; i++) {
    if (Math.abs(lista.children[i].offsetLeft - lista.scrollLeft) < Math.abs(lista.children[proximo].offsetLeft - lista.scrollLeft)) proximo = i;
  }
  indice.value = proximo;
}
function aoRolar() { if (!frame) frame = requestAnimationFrame(lerPosicao); }
function falhou(id) { falhas.value = [...falhas.value, id]; }
function aoTeclar(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") selecionar(0);
  else if (event.key === "End") selecionar(fotosVisiveis.value.length - 1);
  else selecionar(indice.value + (event.key === "ArrowRight" ? 1 : -1));
}
watch(() => props.fotos, () => {
  indice.value = 0;
  falhas.value = [];
  trilha.value?.scrollTo({ left: 0, behavior: "instant" });
}, { flush: "post" });
watch(trilha, (elemento, anterior, onCleanup) => {
  if (!elemento) return;
  const observer = new ResizeObserver(() => selecionar(indice.value));
  observer.observe(elemento);
  onCleanup(() => observer.disconnect());
}, { flush: "post" });
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <section v-if="fotosVisiveis.length || emPrevia" class="home-gallery" aria-labelledby="titulo-balcao">
    <HomeSectionHeader title-id="titulo-balcao" title="Por trás do balcão" />
    <div v-if="!fotosVisiveis.length" class="home-gallery__empty">
      <Camera :size="32" aria-hidden="true" />
      <div>
        <p class="home-gallery__empty-title">Este espaço espera as fotos da Pires.</p>
        <p>Prévia para revisão: faltam fotos distintas e autorizadas da loja. Nenhuma imagem ilustrativa foi usada como registro do balcão.</p>
      </div>
    </div>
    <div v-else class="home-gallery__body" role="region" aria-roledescription="carrossel" aria-label="Fotos da Pires">
      <div ref="trilha" class="home-gallery__track" tabindex="0" aria-label="Fotos; use as setas para navegar"
        @scroll.passive="aoRolar" @keydown="aoTeclar">
        <figure v-for="(foto, i) in fotosVisiveis" :key="foto.id" class="home-gallery__photo" :class="{ 'is-active': i === indice }">
          <div v-if="falhas.includes(foto.id)" class="home-gallery__unavailable"><Camera :size="32" aria-hidden="true" />Foto indisponível</div>
          <img v-else :src="foto.src" :alt="foto.alt" :width="foto.width" :height="foto.height" loading="lazy" @error="falhou(foto.id)" />
          <figcaption>{{ foto.legenda }}</figcaption>
        </figure>
      </div>
      <div v-if="fotosVisiveis.length > 1" class="home-gallery__aside">
        <div class="home-gallery__thumbnails" aria-label="Escolha uma foto">
          <button v-for="(foto, i) in fotosVisiveis" :key="foto.id" type="button" class="home-gallery__thumbnail"
            :aria-label="`Ver foto ${i + 1}: ${foto.legenda}`" :aria-pressed="i === indice" @click="selecionar(i)">
            <img v-if="!falhas.includes(foto.id)" :src="foto.src" alt="" :width="foto.width" :height="foto.height" loading="lazy" />
            <Camera v-else :size="24" aria-hidden="true" />
            <span>{{ foto.legenda }}</span>
          </button>
        </div>
        <div class="home-gallery__controls">
          <button type="button" aria-label="Foto anterior" :disabled="indice === 0" @click="selecionar(indice - 1)"><ArrowLeft :size="20" aria-hidden="true" /></button>
          <p aria-live="polite" aria-atomic="true">{{ indice + 1 }} de {{ fotosVisiveis.length }}<span class="home-gallery__sr">: {{ fotoAtual?.legenda }}</span></p>
          <button type="button" aria-label="Próxima foto" :disabled="indice === fotosVisiveis.length - 1" @click="selecionar(indice + 1)"><ArrowRight :size="20" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-gallery { min-width: 0; }
.home-gallery__empty { display: flex; align-items: center; gap: var(--pp-space-4); min-height: 200px; padding: var(--pp-space-5); border: 1px dashed var(--pp-creme-borda); color: var(--pp-texto-2); background: var(--pp-creme-2); }
.home-gallery__empty > svg { flex: none; }
.home-gallery__empty p { max-width: 65ch; margin: var(--pp-space-1) 0 0; font-size: 14px; line-height: 1.6; }
.home-gallery__empty .home-gallery__empty-title { margin: 0; font-weight: 600; color: var(--pp-marrom); font-size: 17px; }
.home-gallery__body { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: var(--pp-space-5); }
.home-gallery__track { position: relative; min-width: 0; }
.home-gallery__photo { display: none; margin: 0; padding: var(--pp-space-2); background: var(--pp-surface-card); }
.home-gallery__photo.is-active { display: block; }
.home-gallery__photo > img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; }
.home-gallery__photo figcaption { padding: var(--pp-space-3) var(--pp-space-1) var(--pp-space-1); color: var(--pp-marrom); font-family: var(--pp-font-nota); font-size: 26px; line-height: 1.2; overflow-wrap: anywhere; }
.home-gallery__unavailable { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--pp-space-2); aspect-ratio: 4 / 3; background: var(--pp-creme-2); color: var(--pp-texto-2); }
.home-gallery__aside { display: flex; flex-direction: column; justify-content: space-between; gap: var(--pp-space-4); min-width: 0; }
.home-gallery__thumbnails { display: grid; gap: var(--pp-space-2); }
.home-gallery__thumbnail { display: flex; align-items: center; gap: var(--pp-space-3); min-height: 72px; width: 100%; padding: var(--pp-space-1); border: 1px solid transparent; background: transparent; color: var(--pp-texto-2); text-align: left; font: 500 14px/1.5 var(--pp-font-body); cursor: pointer; }
.home-gallery__thumbnail[aria-pressed="true"] { color: var(--pp-marrom); border-color: var(--pp-dourado-escuro); background: var(--pp-creme-2); }
.home-gallery__thumbnail img { width: 80px; height: 64px; object-fit: cover; }
.home-gallery__thumbnail span { overflow-wrap: anywhere; }
.home-gallery__controls { display: flex; align-items: center; justify-content: space-between; gap: var(--pp-space-3); }
.home-gallery__controls button { display: grid; place-items: center; width: 48px; height: 48px; padding: 0; border: 1px solid var(--pp-creme-borda); border-radius: 50%; background: transparent; color: var(--pp-marrom); cursor: pointer; }
.home-gallery__controls button:disabled { opacity: .4; cursor: default; }
.home-gallery__controls p { color: var(--pp-texto-2); font-size: 14px; }
.home-gallery__track:focus-visible,
.home-gallery button:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
.home-gallery__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 760px) {
  .home-gallery__empty { align-items: flex-start; flex-direction: column; min-height: 220px; padding: var(--pp-space-4); gap: var(--pp-space-3); }
  .home-gallery__body { grid-template-columns: minmax(0, 1fr); gap: var(--pp-space-3); }
  .home-gallery__track { display: flex; gap: var(--pp-space-3); overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: var(--pp-dourado-escuro) var(--pp-creme-2); }
  .home-gallery__photo { display: block; flex: 0 0 100%; min-width: 0; scroll-snap-align: start; }
  .home-gallery__photo figcaption { font-size: 21px; }
  .home-gallery__thumbnails { display: none; }
}
</style>
