<template>
  <Teleport to="body">
    <Transition name="product-modal">
      <div
        v-if="open"
        class="product-modal"
        role="presentation"
        @mousedown.self="$emit('close')"
      >
        <section
          class="product-modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="produto ? `produto-modal-${produto.id}` : undefined"
        >
          <button
            type="button"
            class="product-modal__close"
            aria-label="Fechar detalhes"
            @click="$emit('close')"
          >
            <X :size="20" />
          </button>

          <div v-if="loading" class="product-modal__loading" aria-live="polite">
            <LoaderCircle :size="30" />
            <span>Carregando detalhes...</span>
          </div>

          <template v-else-if="produto">
            <div class="product-modal__media">
              <ProductImage :produto="produto" variant="modal" loading="eager">
                <span v-if="produto.em_promocao" class="product-modal__offer">
                  <Tag :size="13" /> Em promoção
                </span>
              </ProductImage>
            </div>

            <div class="product-modal__content">
              <div class="product-modal__topline">
                <span class="product-modal__category">{{
                  produto.categoria_nome || "Produto"
                }}</span>
                <button
                  type="button"
                  class="product-modal__favorite"
                  :class="{ 'is-active': favorito, 'is-loading': favoritando }"
                  :disabled="favoritando"
                  :aria-label="
                    favorito
                      ? 'Remover dos favoritos'
                      : 'Adicionar aos favoritos'
                  "
                  @click="$emit('favorite', produto)"
                >
                  <LoaderCircle
                    v-if="favoritando"
                    :size="18"
                    class="product-modal__spinner"
                  />
                  <Heart
                    v-else
                    :size="19"
                    :fill="favorito ? 'currentColor' : 'none'"
                  />
                </button>
              </div>

              <h2 :id="`produto-modal-${produto.id}`">{{ produto.nome }}</h2>

              <p class="product-modal__description">
                {{
                  produto.descricao ||
                  "Produto disponível para reserva na Pires Panificadora."
                }}
              </p>

              <div class="product-modal__price-row">
                <div class="product-modal__prices">
                  <span
                    v-if="produto.em_promocao"
                    class="product-modal__old-price"
                  >
                    {{ formatarPreco(produto.preco) }}
                  </span>
                  <strong>{{
                    formatarPreco(produto.preco_atual ?? produto.preco)
                  }}</strong>
                </div>

                <span
                  class="product-modal__stock"
                  :class="statusEstoque.classe"
                >
                  <CircleCheck v-if="statusEstoque.disponivel" :size="15" />
                  <CircleX v-else :size="15" />
                  {{ statusEstoque.texto }}
                </span>
              </div>

              <div class="product-modal__divider" />

              <div class="product-modal__purchase">
                <div>
                  <span class="product-modal__label">Quantidade</span>
                  <div
                    class="product-modal__quantity"
                    aria-label="Quantidade do produto"
                  >
                    <button
                      type="button"
                      :disabled="quantidade <= 1"
                      aria-label="Diminuir quantidade"
                      @click="diminuir"
                    >
                      <Minus :size="17" />
                    </button>
                    <strong>{{ quantidade }}</strong>
                    <button
                      type="button"
                      :disabled="
                        !statusEstoque.disponivel ||
                        quantidade >= limiteQuantidade
                      "
                      aria-label="Aumentar quantidade"
                      @click="aumentar"
                    >
                      <Plus :size="17" />
                    </button>
                  </div>
                </div>

                <div class="product-modal__subtotal">
                  <span>Subtotal</span>
                  <strong>{{ subtotal }}</strong>
                </div>
              </div>

              <button
                type="button"
                class="product-modal__add"
                :disabled="!statusEstoque.disponivel || adding"
                @click="$emit('add', { produto, quantidade })"
              >
                <LoaderCircle
                  v-if="adding"
                  :size="19"
                  class="product-modal__spinner"
                />
                <ShoppingCart v-else :size="19" />
                {{
                  statusEstoque.disponivel
                    ? "Adicionar ao carrinho"
                    : "Produto indisponível"
                }}
              </button>

              <p class="product-modal__hint">
                <Clock3 :size="14" />
                Reserve agora e retire no balcão no intervalo.
              </p>
            </div>
          </template>

          <div v-else class="product-modal__error">
            <CircleAlert :size="30" />
            <strong>Não foi possível carregar este produto.</strong>
            <button type="button" @click="$emit('close')">Fechar</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  X,
} from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  adding: { type: Boolean, default: false },
  favorito: { type: Boolean, default: false },
  favoritando: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "favorite", "add"]);
const quantidade = ref(1);

watch(
  () => [props.open, props.produto?.id],
  ([aberto]) => {
    quantidade.value = 1;
    document.body.style.overflow = aberto ? "hidden" : "";
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.body.style.overflow = "";
});

function onKeydown(event) {
  if (event.key === "Escape" && props.open) emit("close");
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", onKeydown);
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
}

const estoque = computed(() => Number(props.produto?.estoque ?? 0));
const limiteQuantidade = computed(() => Math.max(1, estoque.value));

const statusEstoque = computed(() => {
  if (estoque.value <= 0) {
    return { disponivel: false, classe: "is-empty", texto: "Sem estoque" };
  }

  if (estoque.value <= 5) {
    return {
      disponivel: true,
      classe: "is-low",
      texto: `Só ${estoque.value} disponíveis`,
    };
  }

  return { disponivel: true, classe: "is-available", texto: "Disponível" };
});

const subtotal = computed(() => {
  const preco = Number(props.produto?.preco_atual ?? props.produto?.preco ?? 0);
  return formatarPreco(preco * quantidade.value);
});

function diminuir() {
  quantidade.value = Math.max(1, quantidade.value - 1);
}

function aumentar() {
  quantidade.value = Math.min(limiteQuantidade.value, quantidade.value + 1);
}

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}
</script>

<style scoped>
.product-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(27, 22, 18, 0.58);
}
.product-modal__dialog {
  position: relative;
  width: min(900px, 100%);
  max-height: min(720px, 92vh);
  display: grid;
  grid-template-columns: minmax(330px, 0.95fr) minmax(0, 1.05fr);
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(22, 17, 13, 0.26);
}
.product-modal__close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 4;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--student-border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #4d4640;
  cursor: pointer;
}
.product-modal__media {
  position: relative;
  min-width: 0;
}
.product-modal__offer {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 3;
  padding: 5px 8px;
  border-radius: 5px;
  background: #8f5b16;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product-modal__content {
  min-width: 0;
  padding: 34px 34px 28px;
  overflow: auto;
}
.product-modal__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 11px;
}
.product-modal__category {
  color: var(--student-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.product-modal__favorite {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--student-border);
  border-radius: 50%;
  background: #fff;
  color: #756d66;
  cursor: pointer;
}
.product-modal__favorite.is-active {
  color: #a34540;
}
.product-modal h2 {
  margin: 0 0 9px;
  font-size: 26px;
  line-height: 1.15;
}
.product-modal__description {
  margin: 0 0 20px;
  color: var(--student-muted);
  font-size: 13px;
  line-height: 1.6;
}
.product-modal__price-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.product-modal__prices {
  display: flex;
  flex-direction: column;
}
.product-modal__prices strong {
  font-size: 26px;
}
.product-modal__old-price {
  color: #9d958d;
  font-size: 11px;
  text-decoration: line-through;
}
.product-modal__stock {
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
}
.product-modal__stock.is-available {
  background: var(--student-success-soft);
  color: var(--student-success);
}
.product-modal__stock.is-low {
  background: #fff6e8;
  color: #8c641f;
}
.product-modal__stock.is-empty {
  background: var(--student-danger-soft);
  color: var(--student-danger);
}
.product-modal__divider {
  height: 1px;
  margin: 22px 0;
  background: var(--student-border);
}
.product-modal__purchase {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px 18px;
  align-items: end;
}
.product-modal__label,
.product-modal__subtotal span {
  display: block;
  margin-bottom: 6px;
  color: var(--student-muted);
  font-size: 10px;
  font-weight: 600;
}
.product-modal__quantity {
  height: 40px;
  display: grid;
  grid-template-columns: 38px 44px 38px;
  border: 1px solid var(--student-border-strong);
  border-radius: 8px;
  overflow: hidden;
}
.product-modal__quantity button {
  border: 0;
  background: #faf8f5;
  color: var(--student-text);
  cursor: pointer;
}
.product-modal__quantity strong {
  display: grid;
  place-items: center;
  border-inline: 1px solid var(--student-border);
  font-size: 12px;
}
.product-modal__subtotal {
  text-align: right;
}
.product-modal__subtotal strong {
  font-size: 17px;
}
.product-modal__add {
  grid-column: 1/-1;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.product-modal__add:disabled {
  opacity: 0.5;
}
.product-modal__hint {
  grid-column: 1/-1;
  margin: 0;
  color: var(--student-muted);
  font-size: 10px;
  line-height: 1.5;
}
.product-modal__loading,
.product-modal__error {
  grid-column: 1/-1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  color: var(--student-muted);
  text-align: center;
}
.product-modal__spinner {
  animation: pm-spin 0.7s linear infinite;
}
.product-modal__error strong {
  color: var(--student-text);
}
.product-modal__error button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  background: #fff;
  color: var(--student-text);
  font-size: 11px;
  font-weight: 700;
}
@keyframes pm-spin {
  to {
    transform: rotate(360deg);
  }
}
.product-modal-enter-active,
.product-modal-leave-active {
  transition: opacity 0.15s ease;
}
.product-modal-enter-from,
.product-modal-leave-to {
  opacity: 0;
}
@media (max-width: 700px) {
  .product-modal {
    padding: 10px;
    align-items: end;
  }
  .product-modal__dialog {
    max-height: 94vh;
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .product-modal__content {
    padding: 22px 18px 20px;
    overflow: visible;
  }
  .product-modal__media {
    min-height: 230px;
  }
  .product-modal h2 {
    font-size: 22px;
  }
  .product-modal__purchase {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
