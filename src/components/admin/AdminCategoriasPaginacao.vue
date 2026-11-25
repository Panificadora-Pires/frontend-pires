<script setup>
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

defineProps({
  dadosPagina: { type: Object, required: true },
  quantidadeVisivel: { type: Number, required: true },
  bloqueado: { type: Boolean, default: false },
});
const emit = defineEmits(["mudar"]);
</script>

<template>
  <footer
    class="categories-panel-footer"
  >
    <span
      >Exibindo {{ (dadosPagina.page - 1) * dadosPagina.page_size + 1 }}–{{
        (dadosPagina.page - 1) * dadosPagina.page_size + quantidadeVisivel
      }}
      de {{ dadosPagina.count }}. A ordem define a apresentação no
      cardápio.</span
    >
    <nav
      v-if="dadosPagina.total_pages > 1"
      class="categories-pagination"
      aria-label="Paginação de categorias"
    >
      <button
        type="button"
        :disabled="
          dadosPagina.page <= 1 || bloqueado
        "
        @click="emit('mudar', -1)"
      >
        <ChevronLeft :size="16" aria-hidden="true" />Anterior
      </button>
      <span
        >Página {{ dadosPagina.page }} de
        {{ dadosPagina.total_pages }}</span
      >
      <button
        type="button"
        :disabled="
          dadosPagina.page >= dadosPagina.total_pages ||
          bloqueado
        "
        @click="emit('mudar', 1)"
      >
        Próxima<ChevronRight :size="16" aria-hidden="true" />
      </button>
    </nav>
  </footer>
</template>

<style scoped src="./AdminCategoriasPaginacao.css"></style>
