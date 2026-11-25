<template>
  <article
    class="product-card"
    :class="{
      'product-card--promo': produto.em_promocao,
      'product-card--home': variant === 'home',
    }"
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
      class="product-card__favorite pp-card-action"
      :class="{ 'is-active': favorito, 'is-loading': favoritando }"
      :disabled="favoritando"
      :aria-pressed="favorito"
      :aria-label="
        favorito
          ? `Remover ${produto.nome} dos favoritos`
          : `Favoritar ${produto.nome}`
      "
      @click="$emit('favorite', produto)"
    >
      <CardActionContent>
        <LoaderCircle
          v-if="favoritando"
          :size="17"
          class="product-card__spinner"
          aria-hidden="true"
        />
        <Heart v-else :size="18" :fill="favorito ? 'currentColor' : 'none'" />
      </CardActionContent>
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
        class="product-card__add pp-card-action"
        :class="{ 'is-loading': adicionando }"
        :disabled="adicionando"
        :aria-label="`Adicionar ${produto.nome} ao carrinho`"
        @click="adicionar"
      >
        <CardActionContent>
          <LoaderCircle
            v-if="adicionando"
            :size="18"
            class="product-card__spinner"
            aria-hidden="true"
          />
          <Plus v-else :size="19" aria-hidden="true" />
        </CardActionContent>
      </button>
    </div>
  </article>
</template>

<script setup>
import { useTemplateRef } from "vue";
import { Heart, LoaderCircle, Plus, Sparkles, Tag } from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

const props = defineProps({
  produto: { type: Object, required: true },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
  adicionando: { type: Boolean, default: false },
  variant: { type: String, default: "default" },
});

const emit = defineEmits(["open", "favorite", "add"]);

const midia = useTemplateRef("midia");

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

<style scoped src="./ProductCard.css"></style>
