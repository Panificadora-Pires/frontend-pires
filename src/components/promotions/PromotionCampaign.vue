<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { Heart, LoaderCircle, Pause, Play, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";
import { validadeDaOferta } from "@/utils/promocoes";
import posterCoxinha from "@/assets/images/home/coxinha-promocao-poster.webp";

// ID confirmado no catálogo; o nome de outro produto nunca habilita este clipe.
const MIDIAS_POR_PRODUTO = {
  1: { poster: posterCoxinha, video: new URL("../../assets/videos/coxinha-promocao-escura.mp4", import.meta.url).href },
};
const props = defineProps({
  item: { type: Object, required: true },
  featured: { type: Boolean, default: false },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});
const emit = defineEmits(["open", "favorite", "add"]);
const superficie = useTemplateRef("superficie"), video = useTemplateRef("video");
const midia = computed(() => props.featured ? MIDIAS_POR_PRODUTO[Number(props.item.produto.id)] : null);
const moeda = valor => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const emVista = ref(false), elegivel = ref(false), solicitado = ref(false), pronto = ref(false), falhou = ref(false), pausado = ref(false);
const janelaVisivel = ref(!document.hidden);
let observer, desktop, reduce;
const carregarVideo = computed(() => Boolean(midia.value && elegivel.value && solicitado.value && !falhou.value));
function atualizarElegibilidade() {
  elegivel.value = desktop.matches && !reduce.matches && !navigator.connection?.saveData;
  if (elegivel.value && emVista.value) solicitado.value = true;
}
function visibilidade() { janelaVisivel.value = !document.hidden; }
watch([video, emVista, elegivel, pausado, janelaVisivel], () => {
  const elemento = video.value;
  if (!elemento) return;
  elemento.muted = true;
  if (emVista.value && elegivel.value && !pausado.value && janelaVisivel.value) elemento.play().catch(() => { pausado.value = true; });
  else elemento.pause();
}, { flush: "post" });
onMounted(() => {
  if (!midia.value) return;
  desktop = matchMedia("(min-width: 768px)"); reduce = matchMedia("(prefers-reduced-motion: reduce)");
  desktop.addEventListener("change", atualizarElegibilidade); reduce.addEventListener("change", atualizarElegibilidade);
  document.addEventListener("visibilitychange", visibilidade);
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(([entrada]) => {
      emVista.value = entrada.isIntersecting;
      atualizarElegibilidade();
    }, { threshold: 0.1 });
    observer.observe(superficie.value);
  }
  atualizarElegibilidade();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  desktop?.removeEventListener("change", atualizarElegibilidade); reduce?.removeEventListener("change", atualizarElegibilidade);
  document.removeEventListener("visibilitychange", visibilidade);
  video.value?.pause();
});
function adicionar() { registrarOrigemVoo(superficie.value); emit("add", props.item.produto); }
</script>

<template>
  <article class="promotion-campaign" :class="{ 'promotion-campaign--featured': featured }" :data-product-id="item.produto.id">
    <div ref="superficie" class="promotion-campaign__media">
      <template v-if="midia">
        <img :src="midia.poster" :alt="item.produto.nome" width="600" height="720" :loading="featured ? 'eager' : 'lazy'" />
        <video v-if="carregarVideo" ref="video" class="promotion-campaign__video" :class="{ 'is-ready': pronto }"
          :src="midia.video" :poster="midia.poster" muted playsinline loop preload="none"
          aria-hidden="true" @loadeddata="pronto = true" @error="falhou = true" />
        <button v-if="carregarVideo && pronto" type="button" class="promotion-campaign__play"
          :aria-label="pausado ? 'Reproduzir vídeo do produto' : 'Pausar vídeo do produto'" :aria-pressed="pausado"
          @click="pausado = !pausado">
          <Play v-if="pausado" :size="18" aria-hidden="true" /><Pause v-else :size="18" aria-hidden="true" />
        </button>
      </template>
      <ProductImage v-else :produto="item.produto" :loading="featured ? 'eager' : 'lazy'" />
    </div>
    <div class="promotion-campaign__copy">
      <component :is="featured ? 'h2' : 'h3'">{{ item.produto.nome }}</component>
      <p class="promotion-campaign__price"><s>{{ moeda(item.produto.preco) }}</s><strong>{{ moeda(item.produto.preco_atual) }}</strong></p>
      <p class="promotion-campaign__saving">{{ item.desconto }}% de desconto</p>
      <p class="promotion-campaign__validity">Válida até <time :datetime="item.promocao.data_fim">{{ validadeDaOferta(item.promocao.data_fim) }}</time></p>
      <div class="promotion-campaign__actions">
        <button type="button" class="promotion-campaign__add pp-card-action" data-card-action-radius
          :aria-label="`Adicionar ${item.produto.nome} ao carrinho`" :disabled="adicionando" @click="adicionar">
          <CardActionContent><LoaderCircle v-if="adicionando" class="promotion-campaign__spinner" :size="18" aria-hidden="true" /><Plus v-else :size="18" aria-hidden="true" />{{ adicionando ? 'Adicionando…' : 'Adicionar ao carrinho' }}</CardActionContent>
        </button>
        <button type="button" class="promotion-campaign__favorite" :disabled="favoritando" :aria-pressed="favorito"
          :aria-label="favorito ? `Remover ${item.produto.nome} dos favoritos` : `Favoritar ${item.produto.nome}`" @click="emit('favorite', item.produto)">
          <LoaderCircle v-if="favoritando" class="promotion-campaign__spinner" :size="20" aria-hidden="true" /><Heart v-else :size="20" :fill="favorito ? 'currentColor' : 'none'" aria-hidden="true" />
        </button>
      </div>
      <button type="button" class="promotion-campaign__details" :aria-label="`Ver detalhes de ${item.produto.nome}`" @click="emit('open', item.produto)">Ver detalhes</button>
    </div>
  </article>
</template>

<style scoped>
.promotion-campaign { min-width: 0; color: var(--pp-marrom); }
.promotion-campaign__media { position: relative; overflow: hidden; aspect-ratio: 1.2; background: var(--pp-creme-2); }
.promotion-campaign__media > img, .promotion-campaign__video { display: block; width: 100%; height: 100%; object-fit: contain; }
.promotion-campaign__media :deep(.catalog-product-image) { width: 100%; height: 100%; aspect-ratio: auto; }
.promotion-campaign__media :deep(img) { transition: transform 400ms var(--pp-ease); }
.promotion-campaign__video { position: absolute; inset: 0; opacity: 0; transition: opacity 250ms var(--pp-ease); }
.promotion-campaign__video.is-ready { opacity: 1; }
.promotion-campaign__play { position: absolute; bottom: 12px; left: 12px; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--pp-creme-borda); border-radius: 50%; background: var(--pp-marrom); color: var(--pp-creme); }
.promotion-campaign__copy { min-width: 0; padding-block: 20px; border-bottom: 1px solid var(--pp-creme-borda); }
.promotion-campaign h2, .promotion-campaign h3 { margin: 0; color: inherit; overflow-wrap: anywhere; }
.promotion-campaign h3 { font: 600 24px/1.2 var(--pp-font-body); }
.promotion-campaign__price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 16px; margin: 20px 0 4px; }
.promotion-campaign__price s { color: var(--pp-texto-2); font-size: 16px; }
.promotion-campaign__price strong { font: 400 36px/1.1 var(--pp-font-titulo); }
.promotion-campaign__saving { margin: 8px 0; color: var(--pp-dourado-profundo); font-weight: 600; font-size: 15px; }
.promotion-campaign__validity { margin: 0 0 20px; color: var(--pp-texto-2); font-size: 13px; line-height: 1.5; }
.promotion-campaign__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.promotion-campaign button { cursor: pointer; scroll-margin-top: calc(var(--pp-altura-topo) + 16px); scroll-margin-bottom: 180px; }
.promotion-campaign__add { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 12px 18px; border: 1px solid var(--pp-marrom); border-radius: var(--pp-radius-full); background: var(--pp-marrom); color: var(--pp-creme); font: 600 14px/1.5 var(--pp-font-body); }
.promotion-campaign__favorite { display: grid; place-items: center; width: 48px; height: 48px; padding: 0; border: 1px solid var(--pp-creme-borda); border-radius: 50%; background: transparent; color: inherit; }
.promotion-campaign__favorite[aria-pressed="true"] { color: var(--pp-dourado-profundo); }
.promotion-campaign__details { min-height: 44px; margin-top: 8px; padding: 0; border: 0; background: transparent; color: inherit; text-decoration: underline; text-underline-offset: 5px; font: 500 14px/1.5 var(--pp-font-body); }
.promotion-campaign button:disabled { opacity: .6; cursor: wait; }
.promotion-campaign button:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
.promotion-campaign--featured { display: grid; grid-template-columns: 1.1fr 1fr; background: var(--pp-promotion-stage); color: var(--pp-creme); }
.promotion-campaign--featured .promotion-campaign__media { height: auto; min-height: 450px; aspect-ratio: auto; background: var(--pp-promotion-stage); }
.promotion-campaign--featured .promotion-campaign__media > img,
.promotion-campaign--featured .promotion-campaign__media :deep(.catalog-product-image) { position: absolute; inset: 0; }
.promotion-campaign--featured .promotion-campaign__copy { align-self: center; padding: clamp(24px, 4vw, 56px); border: 0; }
.promotion-campaign--featured h2 { font: 400 clamp(34px, 4.5vw, 60px)/1.1 var(--pp-font-titulo); }
.promotion-campaign--featured .promotion-campaign__price strong { font-size: clamp(36px, 4.5vw, 56px); }
.promotion-campaign--featured .promotion-campaign__price s, .promotion-campaign--featured .promotion-campaign__validity { color: var(--pp-creme-3); }
.promotion-campaign--featured .promotion-campaign__saving, .promotion-campaign--featured .promotion-campaign__favorite[aria-pressed="true"] { color: var(--pp-gold); }
.promotion-campaign--featured .promotion-campaign__add { background: var(--pp-creme); border-color: var(--pp-creme); color: var(--pp-marrom); }
.promotion-campaign--featured button:focus-visible { outline-color: var(--pp-gold); }
.promotion-campaign__spinner { animation: promotion-spin 700ms linear infinite; }
@keyframes promotion-spin { to { transform: rotate(360deg); } }
@media (hover: hover) { .promotion-campaign:not(.promotion-campaign--featured) .promotion-campaign__media:hover :deep(img) { transform: scale(1.025); } }
@media (max-width: 767px) {
  .promotion-campaign--featured { display: block; }
  .promotion-campaign--featured .promotion-campaign__media { height: auto; min-height: 0; aspect-ratio: 1.25; }
  .promotion-campaign--featured .promotion-campaign__copy { padding: 24px 20px; }
  .promotion-campaign__actions { padding-right: 60px; }
  .promotion-campaign__add { max-width: 100%; font-size: 13px; padding-inline: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .promotion-campaign__video, .promotion-campaign__media :deep(img) { transition: none; transform: none !important; }
  .promotion-campaign__spinner { animation: none; }
}
</style>
