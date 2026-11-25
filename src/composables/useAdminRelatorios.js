import { computed, onBeforeUnmount, ref } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useAdminRelatoriosStore } from "@/stores/adminRelatorios";
import {
  csvSerieDiaria,
  dataBR,
  inteiro,
  moeda,
  periodoRapido,
  porcentagem,
  validarPeriodo,
} from "@/utils/adminRelatorios";

export function useAdminRelatorios() {
  const store = useAdminRelatoriosStore();
  const inicial = periodoRapido(30);
  const inicio = ref(inicial.inicio);
  const fim = ref(inicial.fim);
  const aplicado = ref({ ...inicial });
  const atalho = ref(30);
  const erroPeriodo = ref("");
  const metricaGrafico = ref("total_vendido");
  const relatorio = computed(() => store.relatorio);
  const variacoes = computed(
    () => relatorio.value?.comparacao.variacao_percentual || {},
  );
  const metricas = [
    { chave: "total_pedidos", rotulo: "Pedidos retirados", formato: "inteiro" },
    { chave: "ticket_medio", rotulo: "Ticket médio", formato: "moeda" },
    { chave: "itens_vendidos", rotulo: "Itens vendidos", formato: "inteiro" },
  ];
  const rankingGrafico = computed(() =>
    store.ranking.map((item) => ({
      id: item.produto_id,
      label: item.produto_nome,
      value: Number(item.quantidade_vendida),
    })),
  );
  const pagamentos = computed(() =>
    (relatorio.value?.formas_pagamento || []).map((item) => ({
      label: { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }[
        item.forma_pagamento
      ],
      value: item.total_pedidos,
      color: {
        pix: "var(--pp-verde)",
        cartao: "var(--pp-dourado-profundo)",
        dinheiro: "var(--pp-marrom-2)",
      }[item.forma_pagamento],
    })),
  );
  const ultimosDias = computed(() =>
    (relatorio.value?.serie_diaria || []).slice(-7).reverse(),
  );
  const valoresSpark = computed(() =>
    (relatorio.value?.serie_diaria || []).map(
      (x) => Number(x.total_vendido) || 0,
    ),
  );
  const posicoesSpark = computed(() => {
    const valores = valoresSpark.value;
    const max = Math.max(1, ...valores);
    return valores.map((valor, i) => ({
      x: 4 + (valores.length === 1 ? 0.5 : i / (valores.length - 1)) * 352,
      y: 83 - (valor / max) * 69,
    }));
  });
  const sparkLine = computed(() =>
    posicoesSpark.value
      .map(
        (p, i) =>
          (i === 0 ? "M" : "L") + " " + p.x.toFixed(2) + " " + p.y.toFixed(2),
      )
      .join(" "),
  );
  const sparkArea = computed(() =>
    posicoesSpark.value.length
      ? sparkLine.value +
        " L " +
        posicoesSpark.value.at(-1).x.toFixed(2) +
        " 87 L " +
        posicoesSpark.value[0].x.toFixed(2) +
        " 87 Z"
      : "",
  );

  function textoVariacao(valor) {
    return valor === null || valor === undefined
      ? "Sem dados para comparação"
      : porcentagem(valor);
  }
  function classeVariacao(valor) {
    return {
      "is-positive": valor !== null && valor !== undefined && Number(valor) > 0,
      "is-negative": valor !== null && valor !== undefined && Number(valor) < 0,
    };
  }
  function carregarSilencioso() {
    return store.carregar({
      inicio: aplicado.value.inicio,
      fim: aplicado.value.fim,
    });
  }
  const { atualizarAgora } = useAutoRefresh(carregarSilencioso, {
    intervalo: 60_000,
  });
  async function gerar() {
    erroPeriodo.value = validarPeriodo(inicio.value, fim.value);
    if (erroPeriodo.value) return;
    aplicado.value = { inicio: inicio.value, fim: fim.value };
    try {
      await store.carregar(aplicado.value);
    } catch {}
  }
  function aplicarAtalho(dias) {
    atalho.value = dias;
    const valor = periodoRapido(dias);
    inicio.value = valor.inicio;
    fim.value = valor.fim;
    gerar();
  }
  function tentarNovamente() {
    atualizarAgora().catch(() => {});
  }
  function exportarCsv() {
    if (!relatorio.value) return;
    const conteudo = csvSerieDiaria(relatorio.value);
    const arquivo = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "pires-relatorio-" +
      relatorio.value.periodo.data_inicio +
      "-a-" +
      relatorio.value.periodo.data_fim +
      ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  onBeforeUnmount(() => store.resetar());

  return {
    aplicarAtalho,
    atalho,
    classeVariacao,
    erroPeriodo,
    exportarCsv,
    fim,
    gerar,
    inicio,
    metricaGrafico,
    metricas,
    pagamentos,
    rankingGrafico,
    relatorio,
    sparkArea,
    sparkLine,
    store,
    tentarNovamente,
    textoVariacao,
    ultimosDias,
    variacoes,
    dataBR,
    inteiro,
    moeda,
  };
}
