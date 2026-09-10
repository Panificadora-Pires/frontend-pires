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
.catalog-product-image{position:relative;overflow:hidden;background:#f0ece7;color:#b09268}.catalog-product-image--card{aspect-ratio:1.18/1}.catalog-product-image--compact{width:82px;height:82px;flex:0 0 82px;border-radius:8px}.catalog-product-image--modal{height:100%;min-height:430px}.catalog-product-image img{width:100%;height:100%;display:block;object-fit:cover}.catalog-product-image__fallback{width:100%;height:100%;display:grid;place-items:center;background:#f0ece7;color:#b09268}@media(max-width:700px){.catalog-product-image--card{aspect-ratio:1.08/1}.catalog-product-image--modal{min-height:230px;height:230px}}
</style>
