<script setup>
import {
  ArrowRight,
  Banknote,
  CircleCheckBig,
  CircleX,
  Clock3,
  Copy,
  LoaderCircle,
  QrCode,
  ShieldCheck,
} from "lucide-vue-next";

defineProps({
  pedido: { type: Object, default: null },
  pagamento: { type: Object, default: null },
  pagamentoAprovado: { type: Boolean, default: false },
  challengeUrl: { type: String, default: "" },
  pagamentoPixPendente: { type: Boolean, default: false },
  pagamentoDinheiro: { type: Boolean, default: false },
  pagamentoFalhou: { type: Boolean, default: false },
  mensagemResultado: { type: String, default: "" },
  qrPixSrc: { type: String, default: "" },
  pixCopiado: { type: Boolean, default: false },
  consultando: { type: Boolean, default: false },
  totalFormatado: { type: String, default: "" },
});
const emit = defineEmits(["copiar-pix"]);
</script>

<template>
  <section
    class="checkout-result"
    aria-label="Situação atual do pedido"
  >
    <div class="checkout-result__top" aria-live="polite" aria-atomic="true">
      <template v-if="pagamentoAprovado">
        <span class="checkout-result__icon checkout-result__icon--success">
          <CircleCheckBig :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Pagamento aprovado</span>
          <h2>Pedido #{{ pedido.id }} confirmado</h2>
          <p>
            Seu pedido já entrou no fluxo de preparo da Pires Panificadora.
          </p>
        </div>
      </template>

      <template v-else-if="challengeUrl">
        <span class="checkout-result__icon checkout-result__icon--waiting">
          <ShieldCheck :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Verificação do cartão</span>
          <h2>Confirme a compra no seu banco</h2>
          <p>Conclua a autenticação solicitada pelo emissor do cartão.</p>
        </div>
      </template>

      <template v-else-if="pagamentoPixPendente">
        <span class="checkout-result__icon checkout-result__icon--pix">
          <QrCode :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Aguardando Pix</span>
          <h2>Pague o pedido #{{ pedido.id }}</h2>
          <p>
            Use o QR Code ou o Pix copia e cola. A confirmação é automática.
          </p>
        </div>
      </template>

      <template v-else-if="pagamentoDinheiro">
        <span class="checkout-result__icon checkout-result__icon--cash">
          <Banknote :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Pagamento na retirada</span>
          <h2>Pedido #{{ pedido.id }} recebido</h2>
          <p>
            O pagamento será registrado quando você retirar o pedido no
            balcão.
          </p>
        </div>
      </template>

      <template v-else-if="pagamentoFalhou">
        <span class="checkout-result__icon checkout-result__icon--error">
          <CircleX :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Pagamento não concluído</span>
          <h2>Não foi possível concluir o pagamento</h2>
          <p>{{ mensagemResultado }}</p>
        </div>
      </template>

      <template v-else>
        <span class="checkout-result__icon checkout-result__icon--waiting">
          <Clock3 :size="30" />
        </span>
        <div>
          <span class="checkout-result__label">Processando</span>
          <h2>Pagamento em análise</h2>
          <p>A confirmação ainda está sendo processada.</p>
        </div>
      </template>
    </div>

    <div v-if="pagamentoDinheiro" class="checkout-result__next">
      <Clock3 :size="20" aria-hidden="true" />
      <div>
        <strong>Próximo passo: retirada</strong>
        <p>
          Acompanhe o preparo em Meus pedidos. Você será avisado quando
          estiver pronto e poderá pagar em dinheiro no balcão.
        </p>
      </div>
    </div>

    <div v-if="challengeUrl" class="checkout-result__challenge">
      <iframe
        :src="challengeUrl"
        title="Autenticação de segurança do cartão"
        referrerpolicy="strict-origin-when-cross-origin"
      />
    </div>

    <div v-else-if="pagamentoPixPendente" class="checkout-result__pix">
      <div v-if="pagamento.pix_qr_code_base64" class="checkout-result__qr">
        <img :src="qrPixSrc" alt="QR Code Pix do pedido" />
      </div>

      <div class="checkout-result__pix-info">
        <h3>Como pagar</h3>
        <ol>
          <li>Abra o Pix no aplicativo do seu banco.</li>
          <li>Escaneie o QR Code ou use o código copia e cola.</li>
          <li>Conclua o pagamento e aguarde a confirmação nesta tela.</li>
        </ol>

        <div v-if="pagamento.pix_qr_code" class="checkout-result__pix-code">
          <code>{{ pagamento.pix_qr_code }}</code>
          <button type="button" @click="emit('copiar-pix')">
            <Copy :size="15" />
            {{ pixCopiado ? "Copiado" : "Copiar código" }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="
        challengeUrl ||
        pagamentoPixPendente ||
        (!pagamentoAprovado && !pagamentoDinheiro && !pagamentoFalhou)
      "
      class="checkout-result__waiting"
    >
      <LoaderCircle :size="16" class="checkout-page__spinner" />
      <span>
        {{
          consultando
            ? "Atualizando o status..."
            : challengeUrl
              ? "Aguardando a autenticação..."
              : pagamentoPixPendente
                ? "Aguardando confirmação do pagamento..."
                : "Verificando pagamento..."
        }}
      </span>
    </div>

    <div v-if="pedido" class="checkout-result__footer">
      <div class="checkout-result__summary">
        <span>Total do pedido</span>
        <strong>{{ totalFormatado }}</strong>
      </div>

      <div class="checkout-result__actions">
        <RouterLink :to="{ name: 'pedidos' }" class="checkout-page__primary">
          Acompanhar pedido
          <ArrowRight :size="16" />
        </RouterLink>
        <RouterLink
          :to="{ name: 'cardapio' }"
          class="checkout-page__secondary"
        >
          Voltar ao cardápio
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped src="./CheckoutResultado.css"></style>
