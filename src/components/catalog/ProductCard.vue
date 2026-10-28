<template>
  <article
    class="product-card"
    :class="{ 'product-card--promo': produto.em_promocao }"
  >
    <button
      ref="midia"
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
        @click="adicionar"
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
import { useTemplateRef } from "vue";
import { Heart, LoaderCircle, Plus, Sparkles, Tag } from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const props = defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
});

const emit = defineEmits(["open", "favorite", "add"]);

const midia = useTemplateRef("midia");

// O voo até o carrinho parte da imagem do card; ele só acontece se o item entrar no carrinho.
function adicionar() {
  registrarOrigemVoo(midia.value);
  emit("add", props.produto);
}

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
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-card-lg);
  background: var(--student-surface);
  transition:
    border-color 0.2s var(--pp-ease),
    box-shadow 0.2s var(--pp-ease);
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
  overflow: hidden;
  border-radius: 14px;
}
/* Zoom só na imagem: o card não muda de tamanho. */
.product-card__media-button :deep(img),
.product-card__media-button :deep(svg) {
  transition: transform 0.45s var(--pp-ease);
}
@media (hover: hover) {
  .product-card:hover {
    border-color: var(--student-border-strong);
    box-shadow: var(--student-shadow);
  }
  .product-card:hover .product-card__media-button :deep(img) {
    transform: scale(1.06);
  }
  .product-card:hover .product-card__media-button :deep(svg) {
    transform: scale(1.08) rotate(-3deg);
  }
}
.product-card__badge {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: var(--pp-radius-full);
  background: var(--student-text);
  color: var(--pp-creme);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product-card__badge--promo {
  background: var(--student-accent);
}
.product-card__favorite {
  position: absolute;
  right: 18px;
  top: 18px;
  z-index: 3;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--student-surface);
  color: var(--student-muted);
  box-shadow: 0 2px 8px rgba(42, 22, 11, 0.08);
  cursor: pointer;
  transition: transform 0.15s var(--pp-ease);
}
.product-card__favorite:active {
  transform: scale(0.9);
}
.product-card__favorite.is-active {
  color: var(--student-danger);
}
.product-card__favorite:disabled {
  opacity: 0.6;
}
.product-card__copy {
  padding: 12px 4px 4px;
}
.product-card__category {
  display: block;
  margin-bottom: 3px;
  color: var(--student-muted-2);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product-card h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}
.product-card__footer {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 4px 2px;
}
.product-card__prices {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.product-card__prices strong {
  color: var(--pp-marrom-2);
  font-size: 17px;
}
.product-card__old-price {
  color: var(--student-muted-2);
  font-size: 12px;
  text-decoration: line-through;
}
.product-card__add {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--student-text);
  color: var(--pp-creme);
  cursor: pointer;
  transition:
    transform 0.15s var(--pp-ease),
    background 0.2s;
}
.product-card__add:hover:not(:disabled) {
  background: var(--pp-marrom-2);
}
.product-card__add:active:not(:disabled) {
  transform: scale(0.9);
}
.product-card__add:disabled {
  opacity: 0.55;
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
  .product-card {
    padding: 8px;
    border-radius: 16px;
  }
  .product-card h2 {
    font-size: 14px;
  }
  .product-card__favorite {
    right: 14px;
    top: 14px;
    width: 34px;
    height: 34px;
  }
  .product-card__add {
    width: 40px;
    height: 40px;
  }
}
</style>
