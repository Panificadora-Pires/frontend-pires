<script setup>
import { computed, ref } from "vue";
import { useAnimate, useReducedMotion } from "motion-v";
import { Heart, LoaderCircle, Plus } from "lucide-vue-next";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import {
  categoriaProduto,
  precoProduto,
  disponibilidadeProduto,
} from "@/utils/favoritos";

const props = defineProps({
  produto: { type: Object, required: true },
  favoritando: Boolean,
  adicionando: Boolean,
  destaque: Boolean,
});
const emit = defineEmits(["open", "favorite", "add"]);
const reduzir = useReducedMotion();
const coracao = ref(null);
const [, animar] = useAnimate();
const removido = ref(false);
const preco = computed(() => precoProduto(props.produto));
const temDesconto = computed(
  () =>
    props.produto.em_promocao &&
    preco.value !== null &&
    Number(props.produto.preco) > preco.value,
);
const disponibilidade = computed(() => disponibilidadeProduto(props.produto));
const indisponivel = computed(
  () =>
    ["indisponivel", "sem-estoque"].includes(disponibilidade.value) ||
    preco.value === null,
);
const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
function remover() {
  const elemento = coracao.value;
  emit("favorite", props.produto, () => {
    removido.value = true;
    if (!reduzir.value && elemento?.isConnected)
      animar(elemento, { scale: [1, 1.2, 0.85] }, { duration: 0.15 });
  });
}
</script>

<template>
  <article
    class="favorite-product"
    :class="{ 'favorite-product--featured': destaque }"
    :data-product-id="produto.id"
    :aria-labelledby="`favorite-title-${produto.id}`"
    :inert="removido || undefined"
  >
    <div class="favorite-product__visual">
      <button
        type="button"
        class="favorite-product__image-button"
        :aria-label="`Ver detalhes de ${produto.nome}`"
        @click="emit('open', produto)"
      >
        <ProductImage :produto="produto" />
      </button>
      <button
        :id="`favorite-remove-${produto.id}`"
        type="button"
        class="favorite-product__heart"
        :disabled="favoritando || removido"
        :aria-pressed="!removido"
        :aria-label="`Remover ${produto.nome} dos favoritos`"
        :aria-busy="favoritando"
        @click="remover"
      >
        <LoaderCircle
          v-if="favoritando"
          :size="20"
          class="favorite-product__spinner"
          aria-hidden="true"
        />
        <span ref="coracao" v-show="!favoritando"
          ><Heart :size="21" fill="currentColor" aria-hidden="true"
        /></span>
      </button>
    </div>
    <div class="favorite-product__copy">
      <p class="favorite-product__category">
        {{ categoriaProduto(produto) || "Da Pires" }}
      </p>
      <h2 :id="`favorite-title-${produto.id}`">
        <button type="button" @click="emit('open', produto)">
          {{ produto.nome }}
        </button>
      </h2>
      <p v-if="destaque" class="favorite-product__description">
        {{
          produto.descricao ||
          "Sua escolha está guardada para o próximo intervalo."
        }}
      </p>
      <p class="favorite-product__price">
        <s
          v-if="temDesconto"
          :aria-label="`Preço anterior: ${moeda.format(Number(produto.preco))}`"
          >{{ moeda.format(Number(produto.preco)) }}</s
        ><strong>{{
          preco === null ? "Consulte o preço" : moeda.format(preco)
        }}</strong
        ><span v-if="disponibilidade === 'indisponivel'">Indisponível</span
        ><span v-else-if="disponibilidade === 'sem-estoque'"
          >Sem estoque no momento</span
        ><span v-else-if="disponibilidade === 'desconhecida'"
          >Disponibilidade conferida ao adicionar</span
        >
      </p>
      <div class="favorite-product__actions">
        <button
          type="button"
          class="favorite-product__details"
          @click="emit('open', produto)"
        >
          Ver detalhes
        </button>
        <button
          type="button"
          class="favorite-product__add pp-card-action"
          data-card-action-radius
          :disabled="adicionando || indisponivel"
          :aria-label="`Adicionar ${produto.nome} ao carrinho`"
          :aria-busy="adicionando"
          @click="
            emit(
              'add',
              produto,
              $event.currentTarget
                .closest('article')
                .querySelector('.catalog-product-image'),
            )
          "
        >
          <CardActionContent
            ><LoaderCircle
              v-if="adicionando"
              :size="18"
              class="favorite-product__spinner"
              aria-hidden="true"
            /><Plus v-else :size="18" aria-hidden="true" />{{
              adicionando
                ? "Conferindo…"
                : indisponivel
                  ? "Indisponível"
                  : "Adicionar"
            }}</CardActionContent
          >
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped src="./FavoriteProduct.css"></style>
