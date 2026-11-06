import { onBeforeUnmount, onMounted } from "vue";

// QR e conversa compartilham a mesma propriedade do foco e do bloqueio de rolagem.
// O diálogo nativo torna o restante da página inerte. A contenção explícita evita
// que Shift+Tab no primeiro controle passe pela barra do navegador.
export function useOrderDialog(dialogo, aoFechar) {
  let focoAnterior;
  let overflowAnterior;
  let prioridadeAnterior;
  let ativo = true;
  let fechando = false;
  let animacao;

  function fecharNoFundo(event) {
    if (event.target !== dialogo.value) return;
    const area = dialogo.value.getBoundingClientRect();
    if (
      event.clientX < area.left ||
      event.clientX > area.right ||
      event.clientY < area.top ||
      event.clientY > area.bottom
    )
      fechar();
  }

  function prenderFoco(event) {
    if (event.key !== "Tab") return;
    const focaveis = [
      ...dialogo.value.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ),
    ].filter(
      (elemento) =>
        elemento.getClientRects().length && !elemento.closest("[inert]"),
    );
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (!primeiro) {
      event.preventDefault();
      dialogo.value.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  async function fechar() {
    if (fechando || !ativo) return;
    fechando = true;
    if (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      dialogo.value?.animate
    ) {
      animacao = dialogo.value.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160,
        easing: "ease-out",
        fill: "forwards",
      });
      await animacao.finished.catch(() => {});
    }
    if (ativo) aoFechar();
  }

  onMounted(() => {
    focoAnterior = document.activeElement;
    overflowAnterior = document.body.style.getPropertyValue("overflow");
    prioridadeAnterior = document.body.style.getPropertyPriority("overflow");
    document.body.style.setProperty("overflow", "hidden");
    dialogo.value.showModal();
    dialogo.value.addEventListener("keydown", prenderFoco);
    dialogo.value.querySelector("[autofocus]")?.focus({ preventScroll: true });
  });
  onBeforeUnmount(() => {
    ativo = false;
    animacao?.cancel();
    dialogo.value?.removeEventListener("keydown", prenderFoco);
    dialogo.value?.close();
    if (overflowAnterior)
      document.body.style.setProperty(
        "overflow",
        overflowAnterior,
        prioridadeAnterior,
      );
    else document.body.style.removeProperty("overflow");
    const destino =
      focoAnterior?.isConnected && !focoAnterior.disabled
        ? focoAnterior
        : document.querySelector(".orders-page__refresh");
    destino?.focus({ preventScroll: true });
  });
  return { fechar, fecharNoFundo };
}
