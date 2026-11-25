import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

import { movimentoReduzido } from "@/utils/vooAoCarrinho";

export function useTrilhaCategorias(trilhaRef, dependencias) {
  const indicadorCategoria = shallowRef({
    width: "0px",
    transform: "translateX(0px)",
  });
  let observer;

  function alinharCategoria(revelar = false) {
    const trilha = trilhaRef.value;
    const ativo = trilha?.querySelector('[aria-pressed="true"]');
    indicadorCategoria.value = {
      width: `${ativo?.offsetWidth || 0}px`,
      transform: `translateX(${ativo?.offsetLeft || 0}px)`,
    };
    if (!ativo || !revelar) return;
    const inicio = ativo.offsetLeft;
    const fim = inicio + ativo.offsetWidth;
    if (
      inicio < trilha.scrollLeft ||
      fim > trilha.scrollLeft + trilha.clientWidth
    ) {
      trilha.scrollTo({
        left: inicio - (trilha.clientWidth - ativo.offsetWidth) / 2,
        behavior: movimentoReduzido() ? "instant" : "smooth",
      });
    }
  }

  watch(
    dependencias,
    async () => {
      await nextTick();
      alinharCategoria(true);
    },
    { flush: "post" },
  );

  onMounted(() => {
    observer = new ResizeObserver(() => alinharCategoria());
    observer.observe(trilhaRef.value);
    document.fonts.ready.then(() => alinharCategoria());
    alinharCategoria();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  return { indicadorCategoria };
}
