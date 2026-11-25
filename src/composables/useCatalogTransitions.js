import { nextTick, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

export function useCatalogTransitions() {
  const router = useRouter();
  let atual;
  const trocaDeRota = (to, from) =>
    (from.name === "home" && to.name === "cardapio") ||
    (from.name === "cardapio" && to.name === "home");
  function encerrar() {
    if (!atual) return;
    atual.confirmar();
    atual.transicao.skipTransition();
    atual = undefined;
    delete document.documentElement.dataset.ppTransition;
    document.documentElement.style.removeProperty("--pp-nav-direction");
  }
  const pararAntes = router.beforeResolve((to, from) => {
    encerrar();
    if (!document.startViewTransition || movimentoReduzido() || document.hidden)
      return;
    const trocaRota = trocaDeRota(to, from);
    const mesmasSelecoes = [
      ...new Set([...Object.keys(to.query), ...Object.keys(from.query)]),
    ].every(
      (chave) =>
        chave === "pagina" ||
        JSON.stringify(to.query[chave]) === JSON.stringify(from.query[chave]),
    );
    const pagina = (query) => Number(query.pagina || 1);
    const trocaPagina =
      to.name === "cardapio" &&
      from.name === "cardapio" &&
      mesmasSelecoes &&
      pagina(to.query) !== pagina(from.query) &&
      Number.isSafeInteger(pagina(to.query)) &&
      pagina(to.query) > 0;
    if (!trocaRota && !trocaPagina) return;

    const raiz = document.documentElement;
    raiz.dataset.ppTransition = trocaRota ? "route" : "grid";
    raiz.style.setProperty(
      "--pp-nav-direction",
      trocaRota
        ? to.name === "home"
          ? "-1"
          : "1"
        : String(Math.sign(pagina(to.query) - pagina(from.query))),
    );
    let liberar;
    const capturaPronta = new Promise((resolve) => {
      liberar = resolve;
    });
    let confirmar;
    const navegacaoConfirmada = new Promise((resolve) => {
      confirmar = resolve;
    });
    try {
      const transicao = document.startViewTransition(async () => {
        liberar();
        await navegacaoConfirmada;
        await nextTick();
      });
      const registro = { to, transicao, confirmar };
      atual = registro;
      transicao.ready.catch(() => {});
      transicao.finished
        .finally(() => {
          if (atual === registro) encerrar();
        })
        .catch(() => {});
    } catch {
      delete raiz.dataset.ppTransition;
      raiz.style.removeProperty("--pp-nav-direction");
      liberar();
    }
    return capturaPronta;
  });
  const pararDepois = router.afterEach(async (to, from, falha) => {
    if (atual?.to === to) {
      atual.confirmar();
      if (falha) encerrar();
    }
    if (falha || !trocaDeRota(to, from)) return;
    await nextTick();
    if (document.activeElement === document.body) {
      const titulo = document.querySelector(".student-layout__main h1");
      titulo?.setAttribute("tabindex", "-1");
      titulo?.focus({ preventScroll: true });
    }
  });
  onBeforeUnmount(() => {
    pararAntes();
    pararDepois();
    encerrar();
  });
}
