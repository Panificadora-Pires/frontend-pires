<script setup>
import { computed, ref } from 'vue';
import { useAnimate, useReducedMotion } from 'motion-v';
import { Heart, LoaderCircle, Plus } from 'lucide-vue-next';
import ProductImage from '@/components/catalog/ProductImage.vue';
import CardActionContent from '@/components/ui/CardActionContent.vue';
import { categoriaProduto, precoProduto } from '@/utils/favoritos';

const props = defineProps({
  produto: { type: Object, required: true },
  favoritando: Boolean, adicionando: Boolean, destaque: Boolean,
});
const emit = defineEmits(['open', 'favorite', 'add']);
const reduzir = useReducedMotion();
const coracao = ref(null);
const [, animar] = useAnimate();
const removido = ref(false);
const preco = computed(() => precoProduto(props.produto));
const temDesconto = computed(() => props.produto.em_promocao && preco.value !== null && Number(props.produto.preco) > preco.value);
const indisponivel = computed(() => props.produto.ativo === false || Number(props.produto.estoque) <= 0 || preco.value === null);
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function remover() {
  // A ref Vue será limpa no teardown, mas o DOM permanece durante a saída.
  const elemento = coracao.value;
  emit('favorite', props.produto, () => {
    removido.value = true;
    if (!reduzir.value && elemento?.isConnected) animar(elemento, { scale: [1, 1.2, .85] }, { duration: .15 });
  });
}
</script>

<template>
  <article class="favorite-product" :class="{ 'favorite-product--featured': destaque }" :data-product-id="produto.id" :aria-labelledby="`favorite-title-${produto.id}`" :inert="removido || undefined">
    <div class="favorite-product__visual">
      <button type="button" class="favorite-product__image-button" :aria-label="`Ver detalhes de ${produto.nome}`" @click="emit('open', produto)"><ProductImage :produto="produto" /></button>
      <button :id="`favorite-remove-${produto.id}`" type="button" class="favorite-product__heart" :disabled="favoritando || removido" :aria-pressed="!removido" :aria-label="`Remover ${produto.nome} dos favoritos`" :aria-busy="favoritando" @click="remover">
        <LoaderCircle v-if="favoritando" :size="20" class="favorite-product__spinner" aria-hidden="true" />
        <span ref="coracao" v-show="!favoritando"><Heart :size="21" fill="currentColor" aria-hidden="true" /></span>
      </button>
    </div>
    <div class="favorite-product__copy">
      <p class="favorite-product__category">{{ categoriaProduto(produto) || 'Da Pires' }}</p>
      <h2 :id="`favorite-title-${produto.id}`"><button type="button" @click="emit('open', produto)">{{ produto.nome }}</button></h2>
      <p v-if="destaque" class="favorite-product__description">{{ produto.descricao || 'Sua escolha está guardada para o próximo intervalo.' }}</p>
      <p class="favorite-product__price"><s v-if="temDesconto" :aria-label="`Preço anterior: ${moeda.format(Number(produto.preco))}`">{{ moeda.format(Number(produto.preco)) }}</s><strong>{{ preco === null ? 'Consulte o preço' : moeda.format(preco) }}</strong><span v-if="produto.ativo === false">Indisponível</span><span v-else-if="Number(produto.estoque) <= 0">Sem estoque no momento</span></p>
      <div class="favorite-product__actions">
        <button type="button" class="favorite-product__details" @click="emit('open', produto)">Ver detalhes</button>
        <button type="button" class="favorite-product__add pp-card-action" data-card-action-radius :disabled="adicionando || indisponivel" :aria-label="`Adicionar ${produto.nome} ao carrinho`" :aria-busy="adicionando" @click="emit('add', produto, $event.currentTarget.closest('article').querySelector('.catalog-product-image'))">
          <CardActionContent><LoaderCircle v-if="adicionando" :size="18" class="favorite-product__spinner" aria-hidden="true" /><Plus v-else :size="18" aria-hidden="true" />{{ adicionando ? 'Conferindo…' : indisponivel ? 'Indisponível' : 'Adicionar' }}</CardActionContent>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.favorite-product { min-width: 0; height: 100%; display: flex; flex-direction: column; color: var(--pp-marrom); }
.favorite-product__visual { position: relative; min-width: 0; overflow: hidden; border-radius: var(--pp-radius-sm); background: var(--pp-creme-2); }
.favorite-product__image-button { display: block; width: 100%; padding: 0; border: 0; color: inherit; cursor: pointer; background: transparent; }
.favorite-product__image-button :deep(.catalog-product-image) { aspect-ratio: 1.35; transition: transform 220ms var(--pp-ease); }
.favorite-product__heart { position: absolute; right: 10px; top: 10px; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 1px solid var(--pp-creme-borda); border-radius: 50%; color: var(--pp-dourado-profundo); background: var(--pp-creme); cursor: pointer; }
.favorite-product__heart span { display: grid; place-items: center; }
.favorite-product__copy { display: flex; flex: 1; flex-direction: column; padding-top: 18px; }
.favorite-product__category { margin: 0 0 7px; font: 500 12px/1.5 var(--pp-font-body); color: var(--pp-dourado-profundo); }
.favorite-product h2 { margin: 0; font: 400 26px/1.15 var(--pp-font-titulo); overflow-wrap: anywhere; }
.favorite-product h2 button { min-width: 44px; min-height: 44px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.favorite-product__description { margin: 16px 0 0; max-width: 48ch; color: var(--pp-texto-2); font: 400 15px/1.7 var(--pp-font-body); }
.favorite-product__price { display: flex; flex-direction: column; gap: 5px; margin: 14px 0 20px; }
.favorite-product__price strong { font: 600 20px/1.35 var(--pp-font-body); }
.favorite-product__price span { color: var(--pp-texto-2); font-size: 12px; }
.favorite-product__price s { color: var(--pp-texto-2); font-size: 12px; }
.favorite-product__actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; }
.favorite-product__details { min-height: 44px; padding: 0; border: 0; background: transparent; font: 600 12px/1.4 var(--pp-font-body); text-decoration: underline; text-underline-offset: 4px; color: var(--pp-marrom-2); cursor: pointer; }
.favorite-product__add { min-height: 44px; padding: 10px 14px; border: 1px solid var(--pp-marrom); border-radius: var(--pp-radius-full); background: var(--pp-marrom); color: var(--pp-creme); font: 600 12px/1.4 var(--pp-font-body); cursor: pointer; }
.favorite-product button:disabled { cursor: default; opacity: .65; }
.favorite-product button:focus-visible { outline: 3px solid var(--pp-dourado-profundo); outline-offset: 3px; }
.favorite-product__image-button:focus-visible { outline-offset: -4px; }
.favorite-product--featured { display: grid; grid-template-columns: 52% minmax(0, 1fr); align-items: center; gap: clamp(28px, 5vw, 64px); }
.favorite-product--featured .favorite-product__copy { padding: 20px 0; }
.favorite-product--featured .favorite-product__visual { max-height: 380px; }
.favorite-product--featured .favorite-product__image-button :deep(.catalog-product-image) { aspect-ratio: 1.4; max-height: 380px; }
.favorite-product--featured h2 { font-size: clamp(36px, 4vw, 52px); }
.favorite-product--featured .favorite-product__category { font-size: 14px; }
.favorite-product--featured .favorite-product__price { margin-block: 24px; }
.favorite-product--featured .favorite-product__price strong { font-size: 28px; }
.favorite-product--featured .favorite-product__actions { justify-content: flex-start; gap: 28px; }
.favorite-product--featured .favorite-product__add { min-height: 48px; font-size: 14px; padding-inline: 24px; }
.favorite-product__spinner { animation: favorite-spin 800ms linear infinite; }
@keyframes favorite-spin { to { transform: rotate(360deg); } }
@media (hover: hover) and (pointer: fine) { .favorite-product__image-button:hover :deep(.catalog-product-image) { transform: scale(1.03); } .favorite-product__heart:hover { background: var(--pp-creme-2); } }
@media (max-width: 760px) { .favorite-product--featured { display: flex; gap: 0; } .favorite-product--featured .favorite-product__copy { padding-top: 20px; } .favorite-product--featured h2 { font-size: 36px; } }
@media (max-width: 480px) { .favorite-product__image-button :deep(.catalog-product-image), .favorite-product--featured .favorite-product__image-button :deep(.catalog-product-image) { aspect-ratio: 1.5; max-height: 220px; } .favorite-product__copy { padding-top: 16px; } .favorite-product h2 { font-size: 28px; } .favorite-product__add { min-width: 128px; font-size: 13px; } }
@media (prefers-reduced-motion: reduce) { .favorite-product__image-button :deep(.catalog-product-image) { transition: none; transform: none !important; } .favorite-product__spinner { animation: none; } }
</style>
