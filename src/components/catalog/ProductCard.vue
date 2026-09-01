<template>
  <article class="product-card" :class="{ 'product-card--promo': produto.em_promocao }">
    <button
      type="button"
      class="product-card__media-button"
      :aria-label="`Ver detalhes de ${produto.nome}`"
      @click="$emit('open', produto)"
    >
      <ProductImage :produto="produto">
        <span v-if="produto.em_promocao" class="product-card__badge product-card__badge--promo">
          <Tag :size="12" aria-hidden="true" />
          Oferta
        </span>
        <span v-else-if="produto.destaque" class="product-card__badge">
          <Sparkles :size="12" aria-hidden="true" />
          Destaque
        </span>
      </ProductImage>
    </button>

    <button
      type="button"
      class="product-card__favorite"
      :class="{ 'is-active': favorito, 'is-loading': favoritando }"
      :disabled="favoritando"
      :aria-label="favorito ? `Remover ${produto.nome} dos favoritos` : `Favoritar ${produto.nome}`"
      @click="$emit('favorite', produto)"
    >
      <LoaderCircle
        v-if="favoritando"
        :size="17"
        class="product-card__spinner"
        aria-hidden="true"
      />
      <Heart v-else :size="18" :fill="favorito ? 'currentColor' : 'none'" />
    </button>

    <button type="button" class="product-card__copy" @click="$emit('open', produto)">
      <span class="product-card__category">{{ produto.categoria_nome || 'Produto' }}</span>
      <h2>{{ produto.nome }}</h2>
    </button>

    <div class="product-card__footer">
      <div class="product-card__prices">
        <span v-if="produto.em_promocao" class="product-card__old-price">
          {{ formatarPreco(produto.preco) }}
        </span>
        <strong>{{ formatarPreco(produto.preco_atual ?? produto.preco) }}</strong>
      </div>

      <button
        type="button"
        class="product-card__add"
        :class="{ 'is-loading': adicionando }"
        :disabled="adicionando"
        :aria-label="`Adicionar ${produto.nome} ao carrinho`"
        @click="$emit('add', produto)"
      >
        <LoaderCircle v-if="adicionando" :size="18" class="product-card__spinner" aria-hidden="true" />
        <Plus v-else :size="19" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<script setup>
import { Heart, LoaderCircle, Plus, Sparkles, Tag } from 'lucide-vue-next'

import ProductImage from '@/components/catalog/ProductImage.vue'

defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
})

defineEmits(['open', 'favorite', 'add'])

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}
</script>

<style scoped>
.product-card {
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid rgba(44, 28, 17, 0.075);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(50, 34, 24, 0.045);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.product-card:hover {
  transform: translateY(-3px);
  border-color: rgba(224, 168, 62, 0.24);
  box-shadow: 0 14px 34px rgba(50, 34, 24, 0.085);
}

.product-card__media-button,
.product-card__copy {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.product-card__media-button {
  width: 100%;
  display: block;
}

.product-card__badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(36, 17, 8, 0.88);
  color: #f8ead7;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  backdrop-filter: blur(8px);
}

.product-card__badge--promo {
  background: rgba(183, 105, 8, 0.94);
  color: #fff8e9;
}

.product-card__favorite {
  width: 34px;
  height: 34px;
  position: absolute;
  top: 17px;
  right: 17px;
  z-index: 2;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(50, 34, 24, 0.08);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #81786e;
  box-shadow: 0 5px 14px rgba(37, 23, 14, 0.08);
  cursor: pointer;
  transition: transform 160ms ease, color 160ms ease, background 160ms ease;
}

.product-card__favorite:hover {
  transform: scale(1.05);
}

.product-card__favorite.is-active {
  color: #b96834;
  background: #fff7ef;
}

.product-card__favorite:disabled {
  cursor: wait;
}

.product-card__favorite.is-loading {
  color: #b27a23;
}

.product-card__copy {
  min-height: 67px;
  padding: 12px 2px 7px;
}

.product-card__category {
  display: block;
  margin-bottom: 4px;
  color: #9a9187;
  font-size: 10.5px;
  font-weight: 650;
}

.product-card h2 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #29241f;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 750;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding: 4px 2px 2px;
}

.product-card__prices {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.product-card__prices strong {
  color: #2a2520;
  font-size: 14.5px;
  line-height: 1.2;
}

.product-card__old-price {
  color: #a39b93;
  font-size: 10px;
  text-decoration: line-through;
}

.product-card__add {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(135deg, #e0a83e, #efb33e);
  color: #2a170c;
  cursor: pointer;
  box-shadow: 0 7px 18px rgba(224, 168, 62, 0.2);
  transition: transform 160ms ease, filter 160ms ease;
}

.product-card__add:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.product-card__add:disabled {
  opacity: 0.68;
  cursor: wait;
}

.product-card__spinner {
  animation: product-spin 750ms linear infinite;
}

@keyframes product-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 680px) {
  .product-card {
    padding: 7px;
    border-radius: 15px;
    box-shadow: 0 6px 18px rgba(50, 34, 24, 0.04);
  }

  .product-card:hover {
    transform: none;
  }

  .product-card__favorite {
    width: 30px;
    height: 30px;
    top: 12px;
    right: 12px;
  }

  .product-card__badge {
    left: 8px;
    bottom: 8px;
    min-height: 22px;
    padding-inline: 7px;
    font-size: 8.5px;
  }

  .product-card__copy {
    min-height: 61px;
    padding: 9px 2px 5px;
  }

  .product-card__category {
    font-size: 9.5px;
  }

  .product-card h2 {
    font-size: 12.5px;
  }

  .product-card__prices strong {
    font-size: 13px;
  }

  .product-card__add {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }
}
</style>
