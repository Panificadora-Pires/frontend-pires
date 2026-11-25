import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import paymentService from "@/services/payment.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { createAutoRefresh } from "@/utils/autoRefresh";
import {
  descreverEtapaPagamento,
  descreverEtapaPedido,
  etapaPagamentoAprovada,
} from "@/utils/checkoutProgress";

export function useCheckout() {
  const INTERVALO_PAGAMENTO_MS = 5_000;

  const auth = useAuthStore();
  const cart = useCartStore();

  const metodo = ref("pix");
  const checkoutId = ref(novoCheckoutId());
  const processando = ref(false);
  const erro = ref("");
  const resultado = ref(null);
  const consultando = ref(false);
  const pixCopiado = ref(false);
  let polling = null;
  let montado = true;
  const contextoAtual = (contexto) => montado && cart.contextoAtual(contexto);
  watch(
    () => cart.geracao,
    () => {
      pararPolling();
      resultado.value = null;
      erro.value = "";
      processando.value = false;
      consultando.value = false;
      pixCopiado.value = false;
      checkoutId.value = novoCheckoutId();
    },
    { flush: "sync" },
  );

  const pedido = computed(() => resultado.value?.pedido || null);
  const descricaoPagamento = computed(() =>
    descreverEtapaPagamento({
      forma: resultado.value?.pagamento?.forma_pagamento,
      status: resultado.value?.pagamento?.status_pagamento,
      temChallenge: Boolean(
        resultado.value?.pagamento?.mercadopago_challenge_url,
      ),
      temResultado: Boolean(resultado.value),
    }),
  );
  const descricaoPedido = computed(() => descreverEtapaPedido(pedido.value?.id));
  const etapaPagamentoConcluida = computed(() =>
    etapaPagamentoAprovada(resultado.value?.pagamento?.status_pagamento),
  );
  const pagamento = computed(() => resultado.value?.pagamento || null);
  const challengeUrl = computed(
    () => pagamento.value?.mercadopago_challenge_url || "",
  );
  const challengeOrigin = computed(() => {
    if (!challengeUrl.value) return "";
    try {
      return new URL(challengeUrl.value).origin;
    } catch {
      return "";
    }
  });
  const pagamentoAprovado = computed(
    () => pagamento.value?.status_pagamento === "aprovado",
  );
  const pagamentoPixPendente = computed(
    () =>
      pagamento.value?.forma_pagamento === "pix" &&
      ["pendente", "processando"].includes(pagamento.value?.status_pagamento),
  );
  const pagamentoDinheiro = computed(
    () => pagamento.value?.forma_pagamento === "dinheiro",
  );
  const pagamentoFalhou = computed(() =>
    ["recusado", "cancelado", "reembolsado", "erro"].includes(
      pagamento.value?.status_pagamento,
    ),
  );
  const mensagemResultado = computed(() => {
    if (pagamento.value?.status_pagamento === "recusado")
      return "O pagamento foi recusado. Você pode montar o pedido novamente e tentar outro meio de pagamento.";
    if (pagamento.value?.status_pagamento === "cancelado")
      return "O pagamento foi cancelado.";
    if (pagamento.value?.status_pagamento === "reembolsado")
      return "O pagamento foi reembolsado pelo Mercado Pago.";
    return "O pagamento não pôde ser concluído.";
  });
  const qrPixSrc = computed(() => {
    const valor = pagamento.value?.pix_qr_code_base64 || "";
    if (!valor) return "";
    return valor.startsWith("data:image/")
      ? valor
      : `data:image/png;base64,${valor}`;
  });

  function novoCheckoutId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (caractere) => {
        const aleatorio = Math.floor(Math.random() * 16);
        const valor = caractere === "x" ? aleatorio : (aleatorio & 0x3) | 0x8;
        return valor.toString(16);
      },
    );
  }

  function formatarPreco(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor || 0));
  }

  function precoItem(item) {
    return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0);
  }

  function selecionarMetodo(valor) {
    if (processando.value) return;
    metodo.value = valor;
    erro.value = "";
  }

  function mensagemErro(error) {
    const data = error?.response?.data;
    if (typeof data?.detail === "string") return data.detail;
    return "Não foi possível concluir o pagamento. Tente novamente.";
  }

  function tratarResposta(data, contexto) {
    if (!contextoAtual(contexto)) return;
    resultado.value = data;
    const status = data?.pagamento?.status_pagamento;

    if (
      ["aprovado", "pendente", "processando"].includes(status) ||
      data?.pagamento?.forma_pagamento === "dinheiro"
    ) {
      cart.limpar(contexto);
    }

    if (["pendente", "processando"].includes(status) && data?.pedido?.id) {
      iniciarPolling(data.pedido.id, contexto);
    } else {
      pararPolling();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function processarMercadoPago({ paymentType, formData }) {
    if (processando.value) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;
    processando.value = true;
    erro.value = "";

    try {
      const { data } = await paymentService.checkoutMercadoPago({
        checkoutId: checkoutId.value,
        cart,
        paymentType,
        formData,
      });

      if (!contextoAtual(contexto)) return;
      tratarResposta(data, contexto);

      if (
        ["recusado", "cancelado", "reembolsado", "erro"].includes(
          data?.pagamento?.status_pagamento,
        )
      ) {
        checkoutId.value = novoCheckoutId();
        throw new Error("Pagamento não aprovado");
      }
    } catch (error) {
      if (!contextoAtual(contexto)) return;
      erro.value = mensagemErro(error);
      if (error?.response?.data?.novo_checkout) {
        checkoutId.value = novoCheckoutId();
      }
      throw error;
    } finally {
      if (contextoAtual(contexto)) processando.value = false;
    }
  }

  async function finalizarDinheiro() {
    if (processando.value || cart.vazio) return;
    const contexto = cart.capturarContexto();
    if (!contextoAtual(contexto)) return;
    processando.value = true;
    erro.value = "";

    try {
      const { data } = await paymentService.checkoutDinheiro({
        checkoutId: checkoutId.value,
        cart,
      });
      tratarResposta(data, contexto);
    } catch (error) {
      if (contextoAtual(contexto)) erro.value = mensagemErro(error);
    } finally {
      if (contextoAtual(contexto)) processando.value = false;
    }
  }

  async function consultarPagamento(
    pedidoId,
    contexto = cart.capturarContexto(),
  ) {
    if (consultando.value || !contextoAtual(contexto)) return;
    consultando.value = true;
    try {
      const { data } = await paymentService.consultar(pedidoId);
      if (!contextoAtual(contexto)) return;
      resultado.value = data;
      const status = data?.pagamento?.status_pagamento;
      if (
        ["aprovado", "recusado", "cancelado", "reembolsado", "erro"].includes(
          status,
        )
      ) {
        pararPolling();
      }
    } catch {
    } finally {
      if (contextoAtual(contexto)) consultando.value = false;
    }
  }

  function iniciarPolling(pedidoId, contexto) {
    pararPolling();
    polling = createAutoRefresh(() => consultarPagamento(pedidoId, contexto), {
      intervalo: INTERVALO_PAGAMENTO_MS,
      imediato: false,
    });
    polling.iniciar();
  }

  function pararPolling() {
    polling?.parar();
    polling = null;
  }

  async function copiarPix() {
    const codigo = pagamento.value?.pix_qr_code;
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      pixCopiado.value = true;
      window.setTimeout(() => {
        pixCopiado.value = false;
      }, 1800);
    } catch {
      erro.value =
        "Não foi possível copiar automaticamente. Selecione o código Pix e copie manualmente.";
    }
  }

  function tratarMensagem3DS(event) {
    if (!challengeUrl.value || !pedido.value?.id) return;
    if (challengeOrigin.value && event.origin !== challengeOrigin.value) return;
    if (event.data?.status === "COMPLETE") {
      consultarPagamento(pedido.value.id);
    }
  }

  onMounted(() => window.addEventListener("message", tratarMensagem3DS));

  onBeforeUnmount(() => {
    montado = false;
    pararPolling();
    window.removeEventListener("message", tratarMensagem3DS);
  });

  return {
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
  };
}
