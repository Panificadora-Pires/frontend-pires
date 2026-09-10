<template>
  <article
    class="product-card"
    :class="{ 'product-card--promo': produto.em_promocao }"
  >
    <button
      type="button"
      class="product-card__media-button"
      :aria-label="`Ver detalhes de ${produto.nome}`"
      @click="$emit('open', produto)"
    >
      <ProductImage :produto="produto">
        <span
          v-if="produto.em_promocao"
          class="product-card__badge product-card__badge--promo"
        >
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
      :aria-label="
        favorito
          ? `Remover ${produto.nome} dos favoritos`
          : `Favoritar ${produto.nome}`
      "
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

    <button
      type="button"
      class="product-card__copy"
      @click="$emit('open', produto)"
    >
      <span class="product-card__category">{{
        produto.categoria_nome || "Produto"
      }}</span>
      <h2>{{ produto.nome }}</h2>
    </button>

    <div class="product-card__footer">
      <div class="product-card__prices">
        <span v-if="produto.em_promocao" class="product-card__old-price">
          {{ formatarPreco(produto.preco) }}
        </span>
        <strong>{{
          formatarPreco(produto.preco_atual ?? produto.preco)
        }}</strong>
      </div>

      <button
        type="button"
        class="product-card__add"
        :class="{ 'is-loading': adicionando }"
        :disabled="adicionando"
        :aria-label="`Adicionar ${produto.nome} ao carrinho`"
        @click="$emit('add', produto)"
      >
        <LoaderCircle
          v-if="adicionando"
          :size="18"
          class="product-card__spinner"
          aria-hidden="true"
        />
        <Plus v-else :size="19" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<script setup>
import { Heart, LoaderCircle, Plus, Sparkles, Tag } from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";

defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});

defineEmits(["open", "favorite", "add"]);

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}
</script>

<style scoped>
.product-card {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}
.product-card:hover {
  border-color: #d4c3aa;
  transform: translateY(-1px);
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
  left: 9px;
  top: 9px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 5px;
  background: #40362f;
  color: #fff;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product-card__badge--promo {
  background: #8e5b16;
}
.product-card__favorite {
  position: absolute;
  right: 9px;
  top: 9px;
  z-index: 3;
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(40, 35, 31, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #776f67;
  cursor: pointer;
}
.product-card__favorite:hover {
  color: #443d37;
}
.product-card__favorite.is-active {
  color: #a34540;
}
.product-card__favorite:disabled {
  opacity: 0.6;
}
.product-card__copy {
  padding: 12px 12px 5px;
}
.product-card__category {
  display: block;
  margin-bottom: 4px;
  color: var(--student-muted);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.product-card h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}
.product-card__footer {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 11px 11px;
}
.product-card__prices {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.product-card__prices strong {
  color: var(--student-text);
  font-size: 15px;
}
.product-card__old-price {
  color: #9b938b;
  font-size: 9px;
  text-decoration: line-through;
}
.product-card__add {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  cursor: pointer;
}
.product-card__add:hover:not(:disabled) {
  background: #18120e;
}
.product-card__add:disabled {
  opacity: 0.5;
}
.product-card__spinner {
  animation: pc-spin 0.7s linear infinite;
}
@keyframes pc-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 640px) {
  .product-card h2 {
    font-size: 12px;
  }
  .product-card__copy {
    padding: 10px 10px 4px;
  }
  .product-card__footer {
    padding: 5px 9px 9px;
  }
  .product-card__favorite {
    width: 29px;
    height: 29px;
  }
  .product-card__add {
    width: 32px;
    height: 32px;
  }
}
</style>
