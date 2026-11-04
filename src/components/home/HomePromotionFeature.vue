<script setup>
import { computed, useTemplateRef } from "vue";
import { Heart, LoaderCircle, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const props = defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});
const emit = defineEmits(["open", "favorite", "add"]);
const midia = useTemplateRef("midia");
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
  <section class="home-promotion" aria-labelledby="titulo-promocoes">
    <HomeSectionHeader
      title-id="titulo-promocoes"
      title="Promoções de hoje"
      :action-to="{ name: 'promocoes' }"
      action-label="Ver promoções"
    />
    <div class="home-promotion__oferta">
      <button
        ref="midia"
        type="button"
        class="home-promotion__midia"
        :aria-label="`Ver detalhes de ${produto.nome}`"
        @click="emit('open', produto)"
      >
        <ProductImage :produto="produto" />
      </button>
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
  padding: clamp(24px, 4vw, 48px);
  border-radius: var(--pp-radius-card-lg);
  background: var(--pp-marrom);
  color: var(--pp-creme);
}
.home-promotion :deep(.home-section-header__title) { color: var(--pp-creme); }
.home-promotion :deep(.home-section-header__action) { color: var(--pp-gold); }
.home-promotion :deep(.home-section-header__action:focus-visible) { outline-color: var(--pp-gold); }
.home-promotion__oferta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  align-items: center;
  gap: clamp(24px, 5vw, 64px);
}
.home-promotion__midia {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: var(--pp-radius-card-lg);
  overflow: hidden;
  background: var(--pp-creme-2);
  cursor: pointer;
}
.home-promotion__midia :deep(.catalog-product-image) { aspect-ratio: 1; }
.home-promotion__conteudo { min-width: 0; overflow-wrap: anywhere; }
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
  --pp-card-action-radius: 110%;
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
.home-promotion__favorito:hover,
.home-promotion__favorito[aria-pressed="true"] { color: var(--pp-gold); border-color: var(--pp-gold); }
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
  .home-promotion__oferta { grid-template-columns: minmax(0, 1fr); gap: var(--pp-space-3); }
  .home-promotion__midia { max-width: 440px; justify-self: center; }
}
@media (prefers-reduced-motion: reduce) {
  .home-promotion__spinner { animation: none; }
}
</style>
