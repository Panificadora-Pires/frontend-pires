<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { Heart, LoaderCircle, Pause, Play, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";
import { validadeDaOferta } from "@/utils/promocoes";
import posterCoxinha from "@/assets/images/home/coxinha-promocao-poster.webp";

const MIDIAS_POR_PRODUTO = {
  1: {
    poster: posterCoxinha,
    video: new URL(
      "../../assets/videos/coxinha-promocao-escura.mp4",
      import.meta.url,
    ).href,
  },
};
const props = defineProps({
  item: { type: Object, required: true },
  featured: { type: Boolean, default: false },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});
const emit = defineEmits(["open", "favorite", "add"]);
const superficie = useTemplateRef("superficie"),
  video = useTemplateRef("video");
const midia = computed(() =>
  props.featured ? MIDIAS_POR_PRODUTO[Number(props.item.produto.id)] : null,
);
const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const emVista = ref(false),
  elegivel = ref(false),
  solicitado = ref(false),
  pronto = ref(false),
  falhou = ref(false),
  pausado = ref(false);
const janelaVisivel = ref(!document.hidden);
let observer, desktop, reduce;
const carregarVideo = computed(() =>
  Boolean(midia.value && elegivel.value && solicitado.value && !falhou.value),
);
function atualizarElegibilidade() {
  elegivel.value =
    desktop.matches && !reduce.matches && !navigator.connection?.saveData;
  if (elegivel.value && emVista.value) solicitado.value = true;
}
function visibilidade() {
  janelaVisivel.value = !document.hidden;
}
watch(
  [video, emVista, elegivel, pausado, janelaVisivel],
  () => {
    const elemento = video.value;
    if (!elemento) return;
    elemento.muted = true;
    if (
      emVista.value &&
      elegivel.value &&
      !pausado.value &&
      janelaVisivel.value
    )
      elemento.play().catch(() => {
        pausado.value = true;
      });
    else elemento.pause();
  },
  { flush: "post" },
);
onMounted(() => {
  if (!midia.value) return;
  desktop = matchMedia("(min-width: 768px)");
  reduce = matchMedia("(prefers-reduced-motion: reduce)");
  desktop.addEventListener("change", atualizarElegibilidade);
  reduce.addEventListener("change", atualizarElegibilidade);
  document.addEventListener("visibilitychange", visibilidade);
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      ([entrada]) => {
        emVista.value = entrada.isIntersecting;
        atualizarElegibilidade();
      },
      { threshold: 0.1 },
    );
    observer.observe(superficie.value);
  }
  atualizarElegibilidade();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  desktop?.removeEventListener("change", atualizarElegibilidade);
  reduce?.removeEventListener("change", atualizarElegibilidade);
  document.removeEventListener("visibilitychange", visibilidade);
  video.value?.pause();
});
function adicionar() {
  registrarOrigemVoo(superficie.value);
  emit("add", props.item.produto);
}
</script>

<template>
  <article
    class="promotion-campaign"
    :class="{ 'promotion-campaign--featured': featured }"
    :data-product-id="item.produto.id"
  >
    <div ref="superficie" class="promotion-campaign__media">
      <template v-if="midia">
        <img
          :src="midia.poster"
          :alt="item.produto.nome"
          width="600"
          height="720"
          :loading="featured ? 'eager' : 'lazy'"
        />
        <video
          v-if="carregarVideo"
          ref="video"
          class="promotion-campaign__video"
          :class="{ 'is-ready': pronto }"
          :src="midia.video"
          :poster="midia.poster"
          muted
          playsinline
          loop
          preload="none"
          aria-hidden="true"
          @loadeddata="pronto = true"
          @error="falhou = true"
        />
        <button
          v-if="carregarVideo && pronto"
          type="button"
          class="promotion-campaign__play"
          :aria-label="
            pausado ? 'Reproduzir vídeo do produto' : 'Pausar vídeo do produto'
          "
          :aria-pressed="pausado"
          @click="pausado = !pausado"
        >
          <Play v-if="pausado" :size="18" aria-hidden="true" /><Pause
            v-else
            :size="18"
            aria-hidden="true"
          />
        </button>
      </template>
      <ProductImage
        v-else
        :produto="item.produto"
        :loading="featured ? 'eager' : 'lazy'"
      />
    </div>
    <div class="promotion-campaign__copy">
      <component :is="featured ? 'h2' : 'h3'">{{
        item.produto.nome
      }}</component>
      <p class="promotion-campaign__price">
        <s>{{ moeda(item.produto.preco) }}</s
        ><strong>{{ moeda(item.produto.preco_atual) }}</strong>
      </p>
      <p class="promotion-campaign__saving">{{ item.desconto }}% de desconto</p>
      <p class="promotion-campaign__validity">
        Válida até
        <time :datetime="item.promocao.data_fim">{{
          validadeDaOferta(item.promocao.data_fim)
        }}</time>
      </p>
      <div class="promotion-campaign__actions">
        <button
          type="button"
          class="promotion-campaign__add pp-card-action"
          data-card-action-radius
          :aria-label="`Adicionar ${item.produto.nome} ao carrinho`"
          :disabled="adicionando"
          @click="adicionar"
        >
          <CardActionContent
            ><LoaderCircle
              v-if="adicionando"
              class="promotion-campaign__spinner"
              :size="18"
              aria-hidden="true"
            /><Plus v-else :size="18" aria-hidden="true" />{{
              adicionando ? "Adicionando…" : "Adicionar ao carrinho"
            }}</CardActionContent
          >
        </button>
        <button
          type="button"
          class="promotion-campaign__favorite"
          :disabled="favoritando"
          :aria-pressed="favorito"
          :aria-label="
            favorito
              ? `Remover ${item.produto.nome} dos favoritos`
              : `Favoritar ${item.produto.nome}`
          "
          @click="emit('favorite', item.produto)"
        >
          <LoaderCircle
            v-if="favoritando"
            class="promotion-campaign__spinner"
            :size="20"
            aria-hidden="true"
          /><Heart
            v-else
            :size="20"
            :fill="favorito ? 'currentColor' : 'none'"
            aria-hidden="true"
          />
        </button>
      </div>
      <button
        type="button"
        class="promotion-campaign__details"
        :aria-label="`Ver detalhes de ${item.produto.nome}`"
        @click="emit('open', item.produto)"
      >
        Ver detalhes
      </button>
    </div>
  </article>
</template>

<style scoped src="./PromotionCampaign.css"></style>
