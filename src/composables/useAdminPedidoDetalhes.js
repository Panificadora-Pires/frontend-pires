import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { mensagemErroApi } from "@/services/admin.service";
import { useAdminOrdersStore } from "@/stores/adminOrders";

export function useAdminPedidoDetalhes() {
  const INTERVALO_DETALHE_MS = 15_000;

  const route = useRoute();
  const adminOrders = useAdminOrdersStore();
  const pedido = ref(adminOrders.porId(route.params.id));
  const erro = ref("");
  let versaoLocal = 0;
  const acao = ref(false);
  const scannerAberto = ref(false);
  const cancelamentoAberto = ref(false);

  const totalItens = computed(() =>
    (pedido.value?.itens || []).reduce(
      (s, i) => s + Number(i.quantidade || 0),
      0,
    ),
  );
  const confirmacaoBloqueada = computed(() =>
    Boolean(
      pedido.value &&
      ["pix", "cartao"].includes(pedido.value.forma_pagamento) &&
      pedido.value.status_pagamento !== "aprovado",
    ),
  );
  const avisoPagamento = computed(() =>
    confirmacaoBloqueada.value
      ? "O pagamento online ainda não foi aprovado. A confirmação do pedido será liberada após a aprovação."
      : "",
  );

  function moeda(v) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(v || 0));
  }
  function formatarData(v) {
    return v
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(v))
      : "—";
  }
  function badgePedido(status) {
    if (status === "pendente") return "admin-badge--warning";
    if (status === "confirmado") return "admin-badge--info";
    if (status === "pronto") return "admin-badge--success";
    if (status === "cancelado") return "admin-badge--danger";
    return "admin-badge--neutral";
  }
  function badgePagamento(status) {
    if (status === "aprovado") return "admin-badge--success";
    if (["recusado", "cancelado", "erro"].includes(status))
      return "admin-badge--danger";
    if (status === "processando") return "admin-badge--info";
    if (status === "reembolsado") return "admin-badge--neutral";
    return "admin-badge--warning";
  }
  function msgErro(e) {
    return mensagemErroApi(e, "Não foi possível concluir a operação.");
  }

  async function carregar() {
    const versaoNoInicio = versaoLocal;
    try {
      const atualizado = await adminOrders.obterPedido(route.params.id);
      if (versaoNoInicio === versaoLocal && !acao.value) {
        pedido.value = atualizado;
      }
      erro.value = "";
    } catch (error) {
      if (!pedido.value) erro.value = "Não foi possível carregar este pedido.";
      throw error;
    }
  }

  const { erro: erroAtualizacao, atualizarAgora } = useAutoRefresh(carregar, {
    intervalo: INTERVALO_DETALHE_MS,
  });

  watch(
    () => route.params.id,
    (id, anterior) => {
      if (!id || id === anterior) return;
      pedido.value = adminOrders.porId(id);
      erro.value = "";
      versaoLocal += 1;
      atualizarAgora();
    },
  );

  async function alterar(status) {
    acao.value = true;
    erro.value = "";
    try {
      versaoLocal += 1;
      pedido.value = await adminOrders.alterarStatus(pedido.value.id, status);
      return true;
    } catch (e) {
      erro.value = msgErro(e);
      return false;
    } finally {
      acao.value = false;
    }
  }

  function abrirCancelamento() {
    erro.value = "";
    cancelamentoAberto.value = true;
  }

  function fecharCancelamento() {
    if (acao.value) return;
    cancelamentoAberto.value = false;
  }

  async function confirmarCancelamento() {
    const sucesso = await alterar("cancelado");
    if (sucesso) {
      cancelamentoAberto.value = false;
    }
  }

  function onRetirado(p) {
    scannerAberto.value = false;
    versaoLocal += 1;
    pedido.value = p;
    adminOrders.substituirPedido(p);
  }

  return {
    abrirCancelamento,
    acao,
    alterar,
    atualizarAgora,
    avisoPagamento,
    badgePagamento,
    badgePedido,
    cancelamentoAberto,
    confirmacaoBloqueada,
    confirmarCancelamento,
    erro,
    erroAtualizacao,
    fecharCancelamento,
    formatarData,
    moeda,
    onRetirado,
    pedido,
    route,
    scannerAberto,
    totalItens,
  };
}
