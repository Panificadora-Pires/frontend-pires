<script setup>
import { computed, useTemplateRef } from "vue";
import { Heart, LoaderCircle, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";
import { useScrollVideo } from "@/composables/useScrollVideo";
import posterCoxinha from "@/assets/images/home/coxinha-promocao-poster.webp";

// URL estática sem importar o MP4 como módulo: no celular nenhuma requisição é feita.
const clipeCoxinha = new URL("../../assets/videos/coxinha-promocao-escura.mp4", import.meta.url).href;

const props = defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});
const emit = defineEmits(["open", "favorite", "add"]);
const midia = useTemplateRef("midia");
const container = useTemplateRef("container");
const panel = useTemplateRef("panel");
const video = useTemplateRef("video");
// Identificador confirmado no catálogo local; não associar mídia pelo nome/categoria.
const temClipe = computed(() => Number(props.produto.id) === 1);
const { active: rolagemAtiva, distance: distancia, panelHeight: alturaPainel, canLoad: carregarVideo, progress: progresso } = useScrollVideo(container, panel, video);
const preco = computed(() => Number(props.produto.preco_atual ?? props.produto.preco));
const temDesconto = computed(() => Number(props.produto.preco) > preco.value);
const disponivel = computed(() => Number(props.produto.estoque) > 0);
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function adicionar() {
  registrarOrigemVoo(midia.value);
  emit("add", props.produto);
}
</script>

<template>
  <section ref="container" class="home-promotion" :class="{ 'is-scrubbing': rolagemAtiva }"
    :style="{ '--pp-promotion-panel-height': `${alturaPainel}px`, '--pp-promotion-distance': `${distancia}px` }"
    aria-labelledby="titulo-promocoes">
    <div ref="panel" class="home-promotion__painel">
      <HomeSectionHeader
        class="home-promotion__cabecalho"
        title-id="titulo-promocoes"
        title="Promoções de hoje"
        :action-to="{ name: 'promocoes' }"
        action-label="Ver promoções"
      />
      <button
        ref="midia"
        type="button"
        class="home-promotion__midia"
        :aria-label="`Ver detalhes de ${produto.nome}`"
        @click="emit('open', produto)"
      >
        <template v-if="temClipe">
          <img class="home-promotion__poster" :src="posterCoxinha" alt="" width="600" height="720" loading="lazy" />
          <video v-if="carregarVideo" ref="video" class="home-promotion__video" :class="{ 'is-visible': rolagemAtiva }"
            :src="clipeCoxinha" :poster="posterCoxinha" width="600" height="720"
            muted playsinline preload="metadata" aria-hidden="true" tabindex="-1" />
        </template>
        <ProductImage v-else :produto="produto" />
      </button>
      <div v-if="rolagemAtiva" class="home-promotion__progress" aria-hidden="true">
        <span :style="{ transform: `scaleX(${progresso})` }" />
      </div>
      <div class="home-promotion__conteudo">
        <h3 class="home-promotion__nome">{{ produto.nome }}</h3>
        <p v-if="produto.descricao" class="home-promotion__descricao">{{ produto.descricao }}</p>
        <p class="home-promotion__precos">
          <span v-if="temDesconto" class="home-promotion__anterior">
            De <s>{{ moeda.format(Number(produto.preco)) }}</s>
          </span>
          <span class="home-promotion__atual"><span class="home-promotion__por">Por </span>{{ moeda.format(preco) }}</span>
        </p>
        <div class="home-promotion__acoes">
          <button
            type="button"
            class="home-promotion__adicionar pp-card-action"
            :class="{ 'is-loading': adicionando }"
            :disabled="adicionando || !disponivel"
            @click="adicionar"
          >
            <CardActionContent>
              <LoaderCircle v-if="adicionando" :size="18" class="home-promotion__spinner" aria-hidden="true" />
              <Plus v-else :size="18" aria-hidden="true" />
              {{ adicionando ? "Adicionando…" : disponivel ? "Adicionar ao carrinho" : "Sem estoque" }}
            </CardActionContent>
          </button>
          <button
            type="button"
            class="home-promotion__favorito"
            :disabled="favoritando"
            :aria-pressed="favorito"
            :aria-label="favorito ? `Remover ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`"
            @click="emit('favorite', produto)"
          >
            <LoaderCircle v-if="favoritando" :size="20" class="home-promotion__spinner" aria-hidden="true" />
            <Heart v-else :size="20" :fill="favorito ? 'currentColor' : 'none'" aria-hidden="true" />
          </button>
        </div>
        <button type="button" class="home-promotion__detalhes" @click="emit('open', produto)">
          Ver detalhes
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-promotion {
  color: var(--pp-creme);
  background: var(--pp-promotion-stage);
  /* Faixa contínua sem usar 100vw (que inclui a barra de rolagem). */
  box-shadow: 0 0 0 100vmax var(--pp-promotion-stage);
  clip-path: inset(0 -100vmax);
}
.home-promotion.is-scrubbing {
  height: calc(var(--pp-promotion-panel-height) + var(--pp-promotion-distance));
  /* Permite alcançar e liberar o último quadro mesmo com rodapé curto. */
  padding-bottom: max(0px, calc(100vh - var(--pp-altura-topo) - var(--pp-space-3) - var(--pp-promotion-panel-height)));
  box-sizing: content-box;
}
.home-promotion__painel {
  position: static;
  top: calc(var(--pp-altura-topo) + var(--pp-space-3));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: "media heading" "media content";
  grid-template-rows: 1fr auto;
  padding-block: var(--pp-space-5);
  background: var(--pp-promotion-stage);
}
.home-promotion__progress {
  grid-area: media;
  align-self: end;
  justify-self: center;
  z-index: 1;
  width: 38%;
  height: 2px;
  margin-bottom: var(--pp-space-3);
  overflow: hidden;
  background: var(--pp-marrom-2);
  pointer-events: none;
}
.home-promotion__progress span { display: block; width: 100%; height: 100%; background: var(--pp-gold); transform-origin: left; }
.home-promotion__cabecalho {
  grid-area: heading;
  align-self: end;
  margin: 0;
  padding-inline: clamp(24px, 4vw, 48px);
}
.is-scrubbing .home-promotion__painel { position: sticky; }
.home-promotion :deep(.home-section-header) { flex-direction: column; align-items: flex-start; gap: 0; }
.home-promotion :deep(.home-section-header__action) { align-self: flex-start; }
.home-promotion :deep(.home-section-header__title) { color: var(--pp-creme); }
.home-promotion :deep(.home-section-header__action) { color: var(--pp-gold); }
.home-promotion :deep(.home-section-header__action:focus-visible) { outline-color: var(--pp-gold); }
.home-promotion__midia {
  grid-area: media;
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: var(--pp-promotion-stage);
  cursor: pointer;
}
.home-promotion__midia :deep(.catalog-product-image) { aspect-ratio: 1; height: 100%; background: transparent; }
.home-promotion__poster,
.home-promotion__video { display: block; width: 100%; height: 100%; object-fit: contain; }
.home-promotion__video { position: absolute; inset: 0; visibility: hidden; pointer-events: none; }
.home-promotion__video.is-visible { visibility: visible; }
.home-promotion__conteudo {
  grid-area: content;
  min-width: 0;
  align-self: start;
  padding: var(--pp-space-4) clamp(24px, 4vw, 48px) 0;
  overflow-wrap: anywhere;
}
.home-promotion__nome {
  margin: 0;
  color: var(--pp-creme);
  font-family: var(--pp-font-titulo);
  font-size: clamp(28px, 2.8vw, 40px);
  font-weight: 400;
  line-height: 1.2;
  text-wrap: balance;
}
.home-promotion__descricao {
  max-width: 46ch;
  margin: var(--pp-space-3) 0 0;
  color: var(--pp-cream-dim);
  font-size: 15px;
  line-height: 1.6;
}
.home-promotion__precos { display: grid; gap: 4px; margin: var(--pp-space-4) 0; }
.home-promotion__anterior { color: var(--pp-cream-dim); font-size: 14px; }
.home-promotion__atual {
  color: var(--pp-creme);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.home-promotion__por { font-size: 14px; font-weight: 400; }
.home-promotion__acoes { display: flex; flex-wrap: wrap; align-items: center; gap: var(--pp-space-2); }
.home-promotion__adicionar {
  min-height: 48px;
  max-width: 100%;
  padding: var(--pp-space-2) var(--pp-space-4);
  border: 0;
  border-radius: var(--pp-radius-full);
  background: var(--pp-gold);
  color: var(--pp-marrom);
  font: 700 14px / 1.5 var(--pp-font-body);
  cursor: pointer;
}
.home-promotion__adicionar :deep(.pp-card-action__content),
.home-promotion__adicionar :deep(.pp-card-action__fill) { gap: var(--pp-space-1); }
.home-promotion__adicionar :deep(.pp-card-action__fill) { background: var(--pp-creme); color: var(--pp-marrom); }
.home-promotion__favorito {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid var(--pp-cream-dim);
  border-radius: 50%;
  background: transparent;
  color: var(--pp-creme);
  cursor: pointer;
}
.home-promotion__favorito[aria-pressed="true"] { color: var(--pp-gold); border-color: var(--pp-gold); }
@media (hover: hover) {
  .home-promotion__favorito:hover:not(:disabled) { color: var(--pp-gold); border-color: var(--pp-gold); }
}
.home-promotion__detalhes {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: var(--pp-space-1);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pp-creme);
  font: 600 14px var(--pp-font-body);
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.home-promotion button:focus-visible { outline: 3px solid var(--pp-gold); outline-offset: 4px; }
.home-promotion button:disabled { opacity: 0.6; cursor: wait; }
.home-promotion__spinner { flex-shrink: 0; animation: promotion-spin 0.7s linear infinite; }
@keyframes promotion-spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .home-promotion__painel {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "heading" "media" "content";
    grid-template-rows: auto;
    padding-block: var(--pp-space-4);
  }
  .home-promotion__cabecalho { padding: 0; }
  .home-promotion :deep(.home-section-header) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--pp-space-2);
    justify-content: space-between;
  }
  .home-promotion :deep(.home-section-header__action) { align-self: center; }
  .home-promotion__midia { aspect-ratio: auto; height: clamp(180px, 52vw, 220px); }
  .home-promotion__midia :deep(.catalog-product-image) { aspect-ratio: auto; }
  .home-promotion__poster {
    position: absolute;
    top: 50%;
    left: 50%;
    width: auto;
    max-width: none;
    height: 135%;
    transform: translate(-50%, -50%);
  }
  .home-promotion__conteudo { padding: var(--pp-space-2) 0 0; }
  .home-promotion__descricao { margin-top: var(--pp-space-2); }
  .home-promotion__precos { margin-block: var(--pp-space-3); }
  /* Corredor livre para o botão flutuante de dúvidas, inclusive em telas de 320px. */
  .home-promotion__acoes { flex-wrap: nowrap; padding-right: 64px; }
  .home-promotion__adicionar { flex: 1; min-width: 0; padding-inline: var(--pp-space-2); }
  .home-promotion__favorito { flex-shrink: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .home-promotion__spinner { animation: none; }
}
</style>
