<template>
  <div class="checkout-page">
    <nav class="checkout-progress" aria-label="Etapas da compra">
      <div class="checkout-progress__step is-done">
        <span><CircleCheckBig :size="14" /></span>
        <div>
          <strong>Carrinho</strong>
          <small>Itens revisados</small>
        </div>
      </div>
      <div
        class="checkout-progress__line"
        :class="{ 'is-done': etapaPagamentoConcluida }"
      />
      <div
        class="checkout-progress__step"
        :class="{
          'is-active': !etapaPagamentoConcluida,
          'is-done': etapaPagamentoConcluida,
        }"
      >
        <span>
          <CircleCheckBig v-if="etapaPagamentoConcluida" :size="14" />
          <span v-else>2</span>
        </span>
        <div>
          <strong>Pagamento</strong>
          <small>{{ descricaoPagamento }}</small>
        </div>
      </div>
      <div
        class="checkout-progress__line"
        :class="{ 'is-done': etapaPagamentoConcluida }"
      />
      <div
        class="checkout-progress__step"
        :class="{ 'is-active': Boolean(pedido) }"
      >
        <span>3</span>
        <div>
          <strong>Confirmação</strong>
          <small>{{ descricaoPedido }}</small>
        </div>
      </div>
    </nav>

    <header class="checkout-page__header">
      <div>
        <h1>{{ resultado ? "Status do pedido" : "Pagamento" }}</h1>
        <span v-if="!resultado" class="checkout-page__note"
          >Seu pedido, do seu jeito.</span
        >
        <p>
          {{
            resultado
              ? "Confira abaixo as informações da sua compra."
              : "Escolha como pagar e confira o total antes de confirmar."
          }}
        </p>
      </div>

      <RouterLink
        v-if="!resultado"
        :to="{ name: 'carrinho' }"
        class="checkout-page__back"
      >
        <ArrowLeft :size="16" />
        Voltar ao carrinho
      </RouterLink>
    </header>

    <CheckoutResultado
      v-if="resultado"
      :pedido="pedido"
      :pagamento="pagamento"
      :pagamento-aprovado="pagamentoAprovado"
      :challenge-url="challengeUrl"
      :pagamento-pix-pendente="pagamentoPixPendente"
      :pagamento-dinheiro="pagamentoDinheiro"
      :pagamento-falhou="pagamentoFalhou"
      :mensagem-resultado="mensagemResultado"
      :qr-pix-src="qrPixSrc"
      :pix-copiado="pixCopiado"
      :consultando="consultando"
      :total-formatado="pedido ? formatarPreco(pedido.total) : ''"
      @copiar-pix="copiarPix"
    />

    <section v-else-if="cart.vazio" class="checkout-empty">
      <ShoppingCart :size="30" />
      <h2>Seu carrinho está vazio</h2>
      <p>Volte ao cardápio e escolha os produtos antes de abrir o checkout.</p>
      <RouterLink :to="{ name: 'cardapio' }" class="checkout-page__primary">
        Ver cardápio
      </RouterLink>
    </section>

    <div v-else class="checkout-page__layout">
      <main class="checkout-payment">
        <div class="checkout-payment__head">
          <div>
            <span class="checkout-payment__kicker">Escolha uma opção</span>
            <h2>Como você quer pagar?</h2>
            <p>Escolha a opção que funciona melhor para você.</p>
          </div>
        </div>

        <div
          class="checkout-methods"
          role="group"
          aria-label="Forma de pagamento"
        >
          <button
            type="button"
            :aria-pressed="metodo === 'pix'"
            :disabled="processando"
            :class="{ 'is-active': metodo === 'pix' }"
            @click="selecionarMetodo('pix')"
          >
            <span class="checkout-methods__icon"><QrCode :size="20" /></span>
            <span class="checkout-methods__copy">
              <strong>Pix</strong>
              <small>QR Code ou copia e cola</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'pix'" :size="17" />
            </span>
          </button>

          <button
            type="button"
            :aria-pressed="metodo === 'card'"
            :disabled="processando"
            :class="{ 'is-active': metodo === 'card' }"
            @click="selecionarMetodo('card')"
          >
            <span class="checkout-methods__icon"
              ><CreditCard :size="20"
            /></span>
            <span class="checkout-methods__copy">
              <strong>Cartão</strong>
              <small>Crédito ou débito</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'card'" :size="17" />
            </span>
          </button>

          <button
            type="button"
            :aria-pressed="metodo === 'cash'"
            :disabled="processando"
            :class="{ 'is-active': metodo === 'cash' }"
            @click="selecionarMetodo('cash')"
          >
            <span class="checkout-methods__icon"><Banknote :size="20" /></span>
            <span class="checkout-methods__copy">
              <strong>Dinheiro</strong>
              <small>Pague no momento da retirada</small>
            </span>
            <span class="checkout-methods__check">
              <CircleCheckBig v-if="metodo === 'cash'" :size="17" />
            </span>
          </button>
        </div>

        <div class="checkout-payment__body">
          <div class="checkout-payment__amount">
            <span>Total do pedido</span>
            <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
          </div>
          <div v-if="metodo === 'cash'" class="checkout-cash">
            <div class="checkout-cash__icon">
              <Banknote :size="25" />
            </div>
            <div class="checkout-cash__copy">
              <h3>Pague ao retirar</h3>
              <p>
                Seu pedido será reservado agora. Leve o valor em dinheiro e o
                pagamento será confirmado na retirada.
              </p>
            </div>
            <button
              type="button"
              :disabled="processando"
              @click="finalizarDinheiro"
            >
              <LoaderCircle
                v-if="processando"
                :size="17"
                class="checkout-page__spinner"
              />
              <Banknote v-else :size="17" />
              {{
                processando
                  ? "Criando pedido..."
                  : `Registrar pedido · ${formatarPreco(cart.totalPreco)}`
              }}
            </button>
          </div>

          <MercadoPagoPaymentBrick
            v-else
            :key="`${metodo}-${cart.totalPreco}`"
            :amount="cart.totalPreco"
            :email="auth.usuario?.email || ''"
            :mode="metodo"
            :submit-handler="processarMercadoPago"
          />
        </div>

        <div v-if="erro" class="checkout-payment__error" role="alert">
          <CircleAlert :size="17" />
          <span>{{ erro }}</span>
        </div>

        <div class="checkout-payment__security">
          <ShieldCheck :size="17" />
          <div>
            <strong>Pagamento protegido</strong>
            <p>
              Cartão e Pix são processados pelo Mercado Pago. A Pires não recebe
              número do cartão nem CVV.
            </p>
          </div>
        </div>
      </main>

      <aside class="checkout-summary">
        <div class="checkout-summary__head">
          <div>
            <span>Seu pedido</span>
            <strong
              >{{ cart.totalItens }}
              {{ cart.totalItens === 1 ? "item" : "itens" }}</strong
            >
          </div>
          <RouterLink :to="{ name: 'carrinho' }">Editar</RouterLink>
        </div>

        <details class="checkout-summary__details" open>
          <summary class="checkout-summary__toggle">
            Ver itens e valores do pedido
          </summary>
          <div class="checkout-summary__items">
            <div
              v-for="item in cart.itens"
              :key="item.produto.id"
              class="checkout-summary__item"
            >
              <ProductImage :produto="item.produto" variant="compact" />
              <div class="checkout-summary__item-copy">
                <strong>{{ item.produto.nome }}</strong>
                <span
                  >{{ item.quantidade }}x ·
                  {{ formatarPreco(precoItem(item)) }} cada</span
                >
              </div>
              <strong class="checkout-summary__item-price">
                {{ formatarPreco(precoItem(item) * item.quantidade) }}
              </strong>
            </div>
          </div>

          <div class="checkout-summary__rows">
            <div>
              <span>Subtotal</span>
              <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
            </div>
            <div>
              <span>Retirada no balcão</span>
              <strong>Grátis</strong>
            </div>
          </div>
        </details>

        <div class="checkout-summary__total">
          <span>Total</span>
          <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
        </div>

        <div class="checkout-summary__pickup">
          <Clock3 :size="17" />
          <span
            >Você será avisado quando o pedido estiver pronto para
            retirada.</span
          >
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import {
  ArrowLeft,
  Banknote,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  CreditCard,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  ShoppingCart,
} from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import CheckoutResultado from "@/components/checkout/CheckoutResultado.vue";
import MercadoPagoPaymentBrick from "@/components/payment/MercadoPagoPaymentBrick.vue";
import { useCheckout } from "@/composables/useCheckout";

const {
  auth,
  cart,
  challengeUrl,
  consultando,
  copiarPix,
  descricaoPagamento,
  descricaoPedido,
  erro,
  etapaPagamentoConcluida,
  finalizarDinheiro,
  formatarPreco,
  mensagemResultado,
  metodo,
  pagamento,
  pagamentoAprovado,
  pagamentoDinheiro,
  pagamentoFalhou,
  pagamentoPixPendente,
  pedido,
  pixCopiado,
  precoItem,
  processando,
  processarMercadoPago,
  qrPixSrc,
  resultado,
  selecionarMetodo,
  consultarPagamento,
} = useCheckout();
</script>

<style scoped src="./CheckoutView.css"></style>
