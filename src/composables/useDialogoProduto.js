import { onBeforeUnmount, watch } from "vue";

export function useDialogoProduto({ aberto, dialogo, fechar, aoFecharPeloFundo }) {
  let overflowAnterior = null;
  let gatilho = null;
  let fundoPressionado = false;

  function restaurarPagina() {
    if (overflowAnterior !== null) {
      const { valor, prioridade } = overflowAnterior;
      if (valor) document.body.style.setProperty("overflow", valor, prioridade);
      else document.body.style.removeProperty("overflow");
      overflowAnterior = null;
    }
    if (gatilho?.isConnected) gatilho.focus({ preventScroll: true });
    gatilho = null;
  }

  watch(
    [aberto, dialogo],
    ([estaAberto, elemento]) => {
      if (!elemento) return;
      if (estaAberto && !elemento.open) {
        gatilho = document.activeElement;
        overflowAnterior = {
          valor: document.body.style.getPropertyValue("overflow"),
          prioridade: document.body.style.getPropertyPriority("overflow"),
        };
        document.body.style.setProperty("overflow", "hidden");
        elemento.showModal();
        fechar.value?.focus({ preventScroll: true });
      } else if (!estaAberto && elemento.open) {
        elemento.close();
        restaurarPagina();
      }
    },
    { immediate: true, flush: "post" },
  );

  onBeforeUnmount(() => {
    dialogo.value?.close();
    restaurarPagina();
  });

  function conterTab(event) {
    if (event.key !== "Tab") return;
    const controles = [
      ...dialogo.value.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ),
    ].filter((elemento) => elemento.getClientRects().length);
    const primeiro = controles[0];
    const ultimo = controles.at(-1);
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo?.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro?.focus();
    }
  }

  function marcarFundo(event) {
    fundoPressionado = event.target === dialogo.value;
  }

  function fecharPeloFundo(event) {
    if (fundoPressionado && event.target === dialogo.value) aoFecharPeloFundo();
    fundoPressionado = false;
  }

  return { conterTab, marcarFundo, fecharPeloFundo };
}
