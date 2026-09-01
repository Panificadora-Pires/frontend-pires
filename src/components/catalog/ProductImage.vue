<template>
  <div class="catalog-product-image" :class="`catalog-product-image--${variant}`">
    <img
      v-if="temImagem"
      :src="urlImagem"
      :alt="produto?.nome || 'Produto'"
      :loading="loading"
      @error="imagemComErro = true"
    />

    <div v-else class="catalog-product-image__fallback" aria-hidden="true">
      <component :is="iconeCategoria" :size="tamanhoIcone" :stroke-width="1.7" />
    </div>

    <slot />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  Coffee,
  Cookie,
  Croissant,
  Package,
  Sandwich,
  ShoppingBag,
} from 'lucide-vue-next'

import { resolverUrlMidia } from '@/services/catalog.service'

const props = defineProps({
  produto: { type: Object, default: null },
  variant: { type: String, default: 'card' },
  loading: { type: String, default: 'lazy' },
})

const imagemComErro = ref(false)

watch(
  () => props.produto?.imagem,
  () => {
    imagemComErro.value = false
  },
)

const urlImagem = computed(() => resolverUrlMidia(props.produto?.imagem))
const temImagem = computed(() => Boolean(urlImagem.value) && !imagemComErro.value)

const tamanhoIcone = computed(() => {
  if (props.variant === 'modal') return 74
  if (props.variant === 'compact') return 34
  return 48
})

const ICONES = {
  salgado: Croissant,
  salgados: Croissant,
  pao: Croissant,
  paes: Croissant,
  doce: Cookie,
  doces: Cookie,
  bebida: Coffee,
  bebidas: Coffee,
  lanche: Sandwich,
  lanches: Sandwich,
  combo: ShoppingBag,
  combos: ShoppingBag,
}

function chaveCategoria(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const iconeCategoria = computed(() => {
  const categoria = props.produto?.categoria_nome || props.produto?.categoria?.nome
  return ICONES[chaveCategoria(categoria)] || Package
})
</script>

<style scoped>
.catalog-product-image {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% 24%, rgba(224, 168, 62, 0.12), transparent 34%),
    #f5f1ec;
}

.catalog-product-image--card {
  width: 100%;
  aspect-ratio: 1.2 / 1;
  border-radius: 14px;
}

.catalog-product-image--compact {
  width: 68px;
  height: 68px;
  flex: 0 0 auto;
  border-radius: 12px;
}

.catalog-product-image--modal {
  width: 100%;
  min-height: 300px;
  height: 100%;
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
  min-height: inherit;
  display: grid;
  place-items: center;
  color: #d69828;
}

@media (max-width: 680px) {
  .catalog-product-image--card {
    aspect-ratio: 1 / 0.92;
    border-radius: 12px;
  }

  .catalog-product-image--modal {
    min-height: 220px;
    height: 220px;
  }
}
</style>
