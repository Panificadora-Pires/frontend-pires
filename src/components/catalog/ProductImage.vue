<template>
  <div
    class="catalog-product-image"
    :class="`catalog-product-image--${variant}`"
    :data-ilustracao="tipoIlustracao"
  >
    <img
      v-if="temImagem"
      :src="urlImagem"
      :alt="produto?.nome || 'Produto'"
      :loading="loading"
      @error="imagemComErro = true"
    />

    <div v-else class="catalog-product-image__fallback" aria-hidden="true">
      <ProductIllustration :tipo="tipoIlustracao" />
    </div>

    <slot />
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import { resolverUrlMidia } from "@/services/catalog.service";
import { ilustracaoParaProduto } from "@/utils/ilustracaoProduto";

const props = defineProps({
  produto: { type: Object, default: null },
  variant: { type: String, default: "card" },
  loading: { type: String, default: "lazy" },
});

const imagemComErro = ref(false);

watch(
  () => props.produto?.imagem,
  () => {
    imagemComErro.value = false;
  },
);

const urlImagem = computed(() => resolverUrlMidia(props.produto?.imagem));
const temImagem = computed(
  () => Boolean(urlImagem.value) && !imagemComErro.value,
);

// Sem foto: ilustração própria escolhida pelo nome/categoria (o cardápio é fictício).
const tipoIlustracao = computed(() => ilustracaoParaProduto(props.produto));
</script>

<style scoped>
.catalog-product-image {
  position: relative;
  overflow: hidden;
  background: var(--pp-creme-2);
}
.catalog-product-image--card {
  aspect-ratio: 1.18/1;
}
.catalog-product-image--compact {
  width: 82px;
  height: 82px;
  flex: 0 0 82px;
  border-radius: 8px;
}
.catalog-product-image--modal {
  height: 100%;
  min-height: 430px;
}
.catalog-product-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.catalog-product-image__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 9%;
  background: var(--pp-creme-2);
}
.catalog-product-image--compact .catalog-product-image__fallback {
  padding: 8%;
}
.catalog-product-image--modal .catalog-product-image__fallback {
  padding: 14%;
}
@media (max-width: 700px) {
  .catalog-product-image--card {
    aspect-ratio: 1.08/1;
  }
  .catalog-product-image--modal {
    min-height: 230px;
    height: 230px;
  }
}
</style>
