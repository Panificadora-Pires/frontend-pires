<template>
  <Teleport to="body">
    <Transition name="product-modal">
      <div v-if="open" class="product-modal" role="presentation" @mousedown.self="$emit('close')">
        <section
          class="product-modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="produto ? `produto-modal-${produto.id}` : undefined"
        >
          <button type="button" class="product-modal__close" aria-label="Fechar detalhes" @click="$emit('close')">
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
                <span class="product-modal__category">{{ produto.categoria_nome || 'Produto' }}</span>
                <button
                  type="button"
                  class="product-modal__favorite"
                  :class="{ 'is-active': favorito }"
                  :aria-label="favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
                  @click="$emit('favorite', produto)"
                >
                  <Heart :size="19" :fill="favorito ? 'currentColor' : 'none'" />
                </button>
              </div>

              <h2 :id="`produto-modal-${produto.id}`">{{ produto.nome }}</h2>

              <p class="product-modal__description">
                {{ produto.descricao || 'Produto disponível para reserva na Pires Panificadora.' }}
              </p>

              <div class="product-modal__price-row">
                <div class="product-modal__prices">
                  <span v-if="produto.em_promocao" class="product-modal__old-price">
                    {{ formatarPreco(produto.preco) }}
                  </span>
                  <strong>{{ formatarPreco(produto.preco_atual ?? produto.preco) }}</strong>
                </div>

                <span class="product-modal__stock" :class="statusEstoque.classe">
                  <CircleCheck v-if="statusEstoque.disponivel" :size="15" />
                  <CircleX v-else :size="15" />
                  {{ statusEstoque.texto }}
                </span>
              </div>

              <div class="product-modal__divider" />

              <div class="product-modal__purchase">
                <div>
                  <span class="product-modal__label">Quantidade</span>
                  <div class="product-modal__quantity" aria-label="Quantidade do produto">
                    <button type="button" :disabled="quantidade <= 1" aria-label="Diminuir quantidade" @click="diminuir">
                      <Minus :size="17" />
                    </button>
                    <strong>{{ quantidade }}</strong>
                    <button
                      type="button"
                      :disabled="!statusEstoque.disponivel || quantidade >= limiteQuantidade"
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
                <LoaderCircle v-if="adding" :size="19" class="product-modal__spinner" />
                <ShoppingCart v-else :size="19" />
                {{ statusEstoque.disponivel ? 'Adicionar ao carrinho' : 'Produto indisponível' }}
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
} from 'lucide-vue-next'

import ProductImage from '@/components/catalog/ProductImage.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  produto: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  adding: { type: Boolean, default: false },
  favorito: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'favorite', 'add'])
const quantidade = ref(1)

watch(
  () => [props.open, props.produto?.id],
  ([aberto]) => {
    quantidade.value = 1
    document.body.style.overflow = aberto ? 'hidden' : ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('close')
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}

const estoque = computed(() => Number(props.produto?.estoque ?? 0))
const limiteQuantidade = computed(() => Math.max(1, estoque.value))

const statusEstoque = computed(() => {
  if (estoque.value <= 0) {
    return { disponivel: false, classe: 'is-empty', texto: 'Sem estoque' }
  }

  if (estoque.value <= 5) {
    return { disponivel: true, classe: 'is-low', texto: `Só ${estoque.value} disponíveis` }
  }

  return { disponivel: true, classe: 'is-available', texto: 'Disponível' }
})

const subtotal = computed(() => {
  const preco = Number(props.produto?.preco_atual ?? props.produto?.preco ?? 0)
  return formatarPreco(preco * quantidade.value)
})

function diminuir() {
  quantidade.value = Math.max(1, quantidade.value - 1)
}

function aumentar() {
  quantidade.value = Math.min(limiteQuantidade.value, quantidade.value + 1)
}

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}
</script>

<style scoped>
.product-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 26px;
  background: rgba(27, 16, 9, 0.52);
  backdrop-filter: blur(5px);
}

.product-modal__dialog {
  width: min(900px, 94vw);
  min-height: 500px;
  max-height: min(720px, 90vh);
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  background: #fff;
  color: #29241f;
  box-shadow: 0 30px 80px rgba(26, 15, 8, 0.28);
}

.product-modal__close {
  width: 38px;
  height: 38px;
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 4;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(36, 17, 8, 0.08);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #5b5148;
  box-shadow: 0 7px 18px rgba(28, 16, 9, 0.08);
  cursor: pointer;
}

.product-modal__media {
  min-width: 0;
  min-height: 500px;
  background: #f5f1ec;
}

.product-modal__offer {
  position: absolute;
  left: 22px;
  top: 22px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(183, 105, 8, 0.94);
  color: #fff8e9;
  font-size: 10.5px;
  font-weight: 800;
}

.product-modal__content {
  min-width: 0;
  overflow-y: auto;
  padding: 46px 38px 34px;
}

.product-modal__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.product-modal__category {
  display: inline-flex;
  align-items: center;
  min-height: 27px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f7f2eb;
  color: #9a6818;
  font-size: 10.5px;
  font-weight: 800;
}

.product-modal__favorite {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #eee7df;
  border-radius: 50%;
  background: #fff;
  color: #81786e;
  cursor: pointer;
}

.product-modal__favorite.is-active {
  border-color: #f0d9c9;
  background: #fff7ef;
  color: #b96834;
}

.product-modal h2 {
  margin: 17px 0 9px;
  color: #251f1a;
  font-size: clamp(27px, 3vw, 38px);
  line-height: 1.06;
  letter-spacing: -0.035em;
}

.product-modal__description {
  min-height: 48px;
  margin: 0;
  color: #726960;
  font-size: 13px;
  line-height: 1.65;
}

.product-modal__price-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-top: 25px;
}

.product-modal__prices {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-modal__prices strong {
  color: #b67816;
  font-size: 27px;
  letter-spacing: -0.025em;
}

.product-modal__old-price {
  color: #a49a91;
  font-size: 11px;
  text-decoration: line-through;
}

.product-modal__stock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 750;
}

.product-modal__stock.is-available {
  background: #edf7ef;
  color: #4c7655;
}

.product-modal__stock.is-low {
  background: #fff5df;
  color: #9b6a19;
}

.product-modal__stock.is-empty {
  background: #f9ecea;
  color: #a8534c;
}

.product-modal__divider {
  height: 1px;
  margin: 27px 0 23px;
  background: #eee8e1;
}

.product-modal__purchase {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.product-modal__label,
.product-modal__subtotal span {
  display: block;
  margin-bottom: 8px;
  color: #8d8379;
  font-size: 10.5px;
  font-weight: 700;
}

.product-modal__quantity {
  display: grid;
  grid-template-columns: 38px 48px 38px;
  align-items: center;
  min-height: 40px;
  border: 1px solid #e8e0d7;
  border-radius: 12px;
  background: #faf8f5;
}

.product-modal__quantity button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #5e554d;
  cursor: pointer;
}

.product-modal__quantity button:disabled {
  color: #c7c0b9;
  cursor: not-allowed;
}

.product-modal__quantity strong {
  text-align: center;
  font-size: 13px;
}

.product-modal__subtotal {
  text-align: right;
}

.product-modal__subtotal strong {
  color: #2b241e;
  font-size: 18px;
}

.product-modal__add {
  width: 100%;
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 24px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(95deg, #e1a536, #efb541);
  color: #29170b;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  box-shadow: 0 10px 24px rgba(224, 168, 62, 0.2);
  cursor: pointer;
}

.product-modal__add:disabled {
  background: #e6e1dc;
  color: #99918a;
  box-shadow: none;
  cursor: not-allowed;
}

.product-modal__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 12px 0 0;
  color: #938a81;
  font-size: 10px;
}

.product-modal__loading,
.product-modal__error {
  grid-column: 1 / -1;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #7d746c;
}

.product-modal__loading svg,
.product-modal__spinner {
  animation: modal-spin 800ms linear infinite;
}

.product-modal__error strong {
  color: #40362e;
}

.product-modal__error button {
  min-height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 9px;
  background: #e1a536;
  color: #28160b;
  font-weight: 800;
  cursor: pointer;
}

@keyframes modal-spin {
  to { transform: rotate(360deg); }
}

.product-modal-enter-active,
.product-modal-leave-active {
  transition: opacity 180ms ease;
}

.product-modal-enter-active .product-modal__dialog,
.product-modal-leave-active .product-modal__dialog {
  transition: transform 220ms ease, opacity 220ms ease;
}

.product-modal-enter-from,
.product-modal-leave-to {
  opacity: 0;
}

.product-modal-enter-from .product-modal__dialog,
.product-modal-leave-to .product-modal__dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.985);
}

@media (max-width: 760px) {
  .product-modal {
    place-items: end center;
    padding: 0;
  }

  .product-modal__dialog {
    width: 100%;
    max-height: 92dvh;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: 220px auto;
    border-radius: 24px 24px 0 0;
  }

  .product-modal__media {
    min-height: 220px;
  }

  .product-modal__content {
    padding: 25px 20px max(26px, env(safe-area-inset-bottom));
  }

  .product-modal__close {
    top: 12px;
    right: 12px;
  }

  .product-modal__offer {
    left: 14px;
    top: 14px;
  }

  .product-modal h2 {
    margin-top: 13px;
    font-size: 25px;
  }

  .product-modal__description {
    min-height: auto;
  }

  .product-modal__price-row {
    margin-top: 18px;
  }

  .product-modal__divider {
    margin: 20px 0;
  }
}

@media (max-width: 420px) {
  .product-modal__purchase {
    gap: 12px;
  }

  .product-modal__quantity {
    grid-template-columns: 34px 40px 34px;
  }

  .product-modal__quantity button {
    width: 34px;
  }
}
</style>
