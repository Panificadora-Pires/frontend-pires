<script setup>
import { computed, useTemplateRef } from "vue";
import { Heart, LoaderCircle, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";
import { useScrollVideo } from "@/composables/useScrollVideo";
import posterCoxinha from "@/assets/images/home/coxinha-promocao-poster.webp";

const clipeCoxinha = new URL(
  "../../assets/videos/coxinha-promocao-escura.mp4",
  import.meta.url,
).href;

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
const temClipe = computed(() => Number(props.produto.id) === 1);
const {
  active: rolagemAtiva,
  distance: distancia,
  panelHeight: alturaPainel,
  canLoad: carregarVideo,
  progress: progresso,
} = useScrollVideo(container, panel, video);
const preco = computed(() =>
  Number(props.produto.preco_atual ?? props.produto.preco),
);
const temDesconto = computed(() => Number(props.produto.preco) > preco.value);
const disponivel = computed(() => Number(props.produto.estoque) > 0);
const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function adicionar() {
  registrarOrigemVoo(midia.value);
  emit("add", props.produto);
}
</script>

<template>
  <section
    ref="container"
    class="home-promotion"
    :class="{ 'is-scrubbing': rolagemAtiva }"
    :style="{
      '--pp-promotion-panel-height': `${alturaPainel}px`,
      '--pp-promotion-distance': `${distancia}px`,
    }"
    aria-labelledby="titulo-promocoes"
  >
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
          <img
            class="home-promotion__poster"
            :src="posterCoxinha"
            alt=""
            width="600"
            height="720"
            loading="lazy"
          />
          <video
            v-if="carregarVideo"
            ref="video"
            class="home-promotion__video"
            :class="{ 'is-visible': rolagemAtiva }"
            :src="clipeCoxinha"
            :poster="posterCoxinha"
            width="600"
            height="720"
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
            tabindex="-1"
          />
        </template>
        <ProductImage v-else :produto="produto" />
      </button>
      <div
        v-if="rolagemAtiva"
        class="home-promotion__progress"
        aria-hidden="true"
      >
        <span :style="{ transform: `scaleX(${progresso})` }" />
      </div>
      <div class="home-promotion__conteudo">
        <h3 class="home-promotion__nome">{{ produto.nome }}</h3>
        <p v-if="produto.descricao" class="home-promotion__descricao">
          {{ produto.descricao }}
        </p>
        <p class="home-promotion__precos">
          <span v-if="temDesconto" class="home-promotion__anterior">
            De <s>{{ moeda.format(Number(produto.preco)) }}</s>
          </span>
          <span class="home-promotion__atual"
            ><span class="home-promotion__por">Por </span
            >{{ moeda.format(preco) }}</span
          >
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
              <LoaderCircle
                v-if="adicionando"
                :size="18"
                class="home-promotion__spinner"
                aria-hidden="true"
              />
              <Plus v-else :size="18" aria-hidden="true" />
              {{
                adicionando
                  ? "Adicionando…"
                  : disponivel
                    ? "Adicionar ao carrinho"
                    : "Sem estoque"
              }}
            </CardActionContent>
          </button>
          <button
            type="button"
            class="home-promotion__favorito"
            :disabled="favoritando"
            :aria-pressed="favorito"
            :aria-label="
              favorito
                ? `Remover ${produto.nome} dos favoritos`
                : `Favoritar ${produto.nome}`
            "
            @click="emit('favorite', produto)"
          >
            <LoaderCircle
              v-if="favoritando"
              :size="20"
              class="home-promotion__spinner"
              aria-hidden="true"
            />
            <Heart
              v-else
              :size="20"
              :fill="favorito ? 'currentColor' : 'none'"
              aria-hidden="true"
            />
          </button>
        </div>
        <button
          type="button"
          class="home-promotion__detalhes"
          @click="emit('open', produto)"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped src="./HomePromotionFeature.css"></style>
