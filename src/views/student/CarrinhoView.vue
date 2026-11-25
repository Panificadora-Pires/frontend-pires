<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <h1>Seu carrinho</h1>
        <p>Seu intervalo começa por aqui.</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="16" />
        Continuar comprando
      </RouterLink>
    </header>

    <Transition
      name="cart-content"
      mode="out-in"
      @after-enter="focarVazioAposTransicao"
    >
      <section v-if="cart.vazio" key="vazio" class="cart-page__empty">
        <div class="cart-page__empty-copy">
          <span class="cart-page__eyebrow">Falta só escolher</span>
          <h2>Um intervalo<br />com seu sabor.</h2>
          <p>
            Seu carrinho está vazio. Encontre seu próximo favorito no cardápio.
          </p>
          <RouterLink :to="{ name: 'cardapio' }" class="cart-page__primary-link"
            >Explorar cardápio <ArrowRight :size="18" aria-hidden="true"
          /></RouterLink>
        </div>
        <div class="cart-page__empty-art" aria-hidden="true">
          <ProductIllustration tipo="coxinha" /><span
            >feito para o seu intervalo</span
          >
        </div>
      </section>

      <div v-else key="com-itens" class="cart-page__content">
        <div class="cart-page__layout">
          <section class="cart-page__items" aria-labelledby="cart-items-title">
            <div class="cart-page__section-head">
              <div>
                <h2 id="cart-items-title">Itens do pedido</h2>
                <p>
                  {{ cart.totalItens }}
                  {{
                    cart.totalItens === 1
                      ? "item selecionado"
                      : "itens selecionados"
                  }}
                </p>
              </div>

              <button
                type="button"
                ref="botaoLimparRef"
                class="cart-page__clear"
                :disabled="finalizando"
                @click="abrirConfirmacaoLimpeza"
              >
                <Trash2 :size="14" />
                Limpar
              </button>
            </div>

            <div v-if="sincronizando" class="cart-page__sync" role="status">
              <LoaderCircle :size="15" class="cart-page__spinner" />
              Conferindo preços e disponibilidade...
            </div>

            <TransitionGroup
              name="cart-item-list"
              tag="div"
              class="cart-page__item-list"
            >
              <article
                v-for="item in cart.itens"
                :key="item.produto.id"
                class="cart-item"
                :class="{ 'cart-item--problem': problemaItem(item) }"
              >
                <ProductImage :produto="item.produto" variant="compact" />

                <div class="cart-item__info">
                  <span class="cart-item__category">
                    {{ item.produto.categoria_nome || "Produto" }}
                  </span>
                  <h3>{{ item.produto.nome }}</h3>

                  <div class="cart-item__prices">
                    <span
                      v-if="item.produto.em_promocao"
                      class="cart-item__old-price"
                    >
                      {{ formatarPreco(item.produto.preco) }}
                    </span>
                    <strong>{{ formatarPreco(precoUnitario(item)) }}</strong>
                    <span>un.</span>
                  </div>

                  <p v-if="problemaItem(item)" class="cart-item__problem-text">
                    <CircleAlert :size="14" />
                    {{ problemaItem(item) }}
                  </p>
                </div>

                <div class="cart-item__actions">
                  <div
                    class="cart-item__quantity"
                    aria-label="Controle de quantidade"
                  >
                    <button
                      type="button"
                      class="pp-card-action"
                      :disabled="finalizando || item.quantidade <= 1"
                      :aria-label="`Diminuir quantidade de ${item.produto.nome}`"
                      @click="alterarQuantidade(item, item.quantidade - 1)"
                    >
                      <CardActionContent
                        ><Minus :size="15"
                      /></CardActionContent>
                    </button>
                    <strong>{{ item.quantidade }}</strong>
                    <button
                      type="button"
                      class="pp-card-action"
                      :disabled="finalizando || !podeAumentar(item)"
                      :aria-label="`Aumentar quantidade de ${item.produto.nome}`"
                      @click="alterarQuantidade(item, item.quantidade + 1)"
                    >
                      <CardActionContent><Plus :size="15" /></CardActionContent>
                    </button>
                  </div>

                  <small v-if="estoqueConhecido(item)" class="cart-item__stock">
                    {{ estoqueDisponivel(item) }}
                    {{
                      estoqueDisponivel(item) === 1
                        ? "disponível"
                        : "disponíveis"
                    }}
                  </small>
                </div>

                <div class="cart-item__subtotal">
                  <span>Subtotal</span>
                  <strong>
                    {{ formatarPreco(precoUnitario(item) * item.quantidade) }}
                  </strong>
                </div>

                <button
                  type="button"
                  class="cart-item__remove"
                  :disabled="finalizando"
                  :aria-label="`Remover ${item.produto.nome} do carrinho`"
                  @click="removerItem(item.produto.id)"
                >
                  <X :size="18" aria-hidden="true" />
                </button>
              </article>
            </TransitionGroup>
          </section>

          <aside class="cart-summary" aria-labelledby="cart-summary-title">
            <span class="cart-summary__eyebrow">Balcão Pires</span>
            <div class="cart-summary__head">
              <h2 id="cart-summary-title">Seu pedido</h2>
              <span
                >{{ cart.totalItens }}
                {{ cart.totalItens === 1 ? "item" : "itens" }}</span
              >
            </div>

            <div class="cart-summary__rows">
              <div>
                <span>Subtotal</span>
                <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
              </div>
              <div>
                <span>Taxa de retirada</span>
                <strong>Grátis</strong>
              </div>
            </div>

            <div class="cart-summary__total">
              <span>Total</span>
              <Transition name="cart-price" mode="out-in">
                <strong :key="cart.totalPreco">{{
                  formatarPreco(cart.totalPreco)
                }}</strong>
              </Transition>
            </div>

            <div class="cart-summary__pickup">
              <Clock3 :size="18" />
              <div>
                <strong>Retirada no balcão</strong>
                <p>
                  Você acompanha o preparo e retira quando o pedido estiver
                  pronto.
                </p>
              </div>
            </div>

            <div v-if="erroFinalizar" class="cart-summary__error" role="alert">
              <CircleAlert :size="17" />
              <span>{{ erroFinalizar }}</span>
            </div>

            <button
              type="button"
              class="cart-summary__checkout"
              :disabled="finalizando || sincronizando || temProblemas"
              @click="finalizarPedido"
            >
              <LoaderCircle
                v-if="finalizando"
                :size="18"
                class="cart-page__spinner"
              />
              <ShoppingBag v-else :size="18" />
              {{
                finalizando
                  ? "Conferindo pedido..."
                  : "Continuar para pagamento"
              }}
              <ArrowRight v-if="!finalizando" :size="16" />
            </button>

            <div class="cart-summary__safe">
              <CircleCheckBig :size="15" />
              Preços e estoque verificados antes do pagamento
            </div>
          </aside>
        </div>

        <CartRecommendations />
      </div>
    </Transition>

    <dialog
      ref="dialogoLimpezaRef"
      class="cart-clear-dialog"
      aria-labelledby="cart-clear-dialog-title"
      aria-describedby="cart-clear-dialog-description"
      @close="restaurarFocoLimpeza"
    >
      <span class="cart-clear-dialog__eyebrow">SEU CARRINHO</span>
      <h2 id="cart-clear-dialog-title" class="cart-clear-dialog__title">
        Tirar tudo do carrinho?
      </h2>
      <p
        id="cart-clear-dialog-description"
        class="cart-clear-dialog__description"
      >
        Todos os produtos escolhidos serão removidos. Você pode adicioná-los
        novamente pelo cardápio.
      </p>
      <div class="cart-clear-dialog__actions">
        <button
          ref="botaoCancelarLimpezaRef"
          type="button"
          class="cart-clear-dialog__cancel"
          @click="fecharConfirmacaoLimpeza"
        >
          Manter produtos
        </button>
        <button
          type="button"
          class="cart-clear-dialog__confirm"
          @click="confirmarLimpezaCarrinho"
        >
          <Trash2 :size="17" aria-hidden="true" />
          Sim, limpar carrinho
        </button>
      </div>
    </dialog>

    <Transition name="cart-toast">
      <div
        v-if="toast"
        class="cart-page__toast"
        role="status"
        aria-live="polite"
      >
        <Check :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-vue-next";

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import CartRecommendations from "@/components/cart/CartRecommendations.vue";
import { useCarrinho } from "@/composables/useCarrinho";

const {
  abrirConfirmacaoLimpeza,
  alterarQuantidade,
  botaoCancelarLimpezaRef,
  botaoLimparRef,
  cart,
  confirmarLimpezaCarrinho,
  dialogoLimpezaRef,
  erroFinalizar,
  estoqueConhecido,
  estoqueDisponivel,
  fecharConfirmacaoLimpeza,
  finalizando,
  finalizarPedido,
  focarVazioAposTransicao,
  formatarPreco,
  podeAumentar,
  precoUnitario,
  problemaItem,
  removerItem,
  restaurarFocoLimpeza,
  sincronizando,
  temProblemas,
  toast,
} = useCarrinho();
</script>

<style scoped src="./CarrinhoView.css"></style>
