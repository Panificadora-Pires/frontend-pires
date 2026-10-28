import { onBeforeUnmount, onMounted, ref } from "vue";

import { createAutoRefresh } from "@/utils/autoRefresh";

/**
 * Liga `createAutoRefresh` ao ciclo de vida do componente: começa no `onMounted`
 * e para no `onBeforeUnmount`. Expõe o estado como refs para a interface.
 */
export function useAutoRefresh(tarefa, opcoes = {}) {
  const atualizando = ref(false);
  const ultimaAtualizacao = ref(null);
  const erro = ref(null);

  const controle = createAutoRefresh(tarefa, {
    ...opcoes,
    onEstado(estado) {
      atualizando.value = estado.atualizando;
      ultimaAtualizacao.value = estado.ultimaAtualizacao;
      erro.value = estado.erro;
    },
  });

  onMounted(() => controle.iniciar());
  onBeforeUnmount(() => controle.parar());

  return {
    atualizando,
    ultimaAtualizacao,
    erro,
    atualizarAgora: controle.atualizarAgora,
    reagendar: controle.reagendar,
  };
}
