<script setup>
import { ChevronDown } from "lucide-vue-next";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";

// Conteúdo conferido nos fluxos de pedidos, notificações e retirada por QR Code.
const duvidas = [
  {
    id: "acompanhar",
    pergunta: "Como acompanho meu pedido?",
    resposta: "Abra Meus pedidos para ver o andamento. O status é atualizado no app, sem precisar recarregar a página.",
  },
  {
    id: "aviso",
    pergunta: "Como sei que está pronto?",
    resposta: "Você recebe uma notificação no app quando o pedido fica pronto. Também pode conferir o status em Meus pedidos.",
  },
  {
    id: "retirada",
    pergunta: "Onde encontro o QR Code?",
    resposta: "Quando o pedido estiver pronto, abra Meus pedidos e toque em Ver QR Code. Mostre a tela no balcão para a equipe confirmar a retirada.",
  },
];
</script>

<template>
  <section class="home-faq" aria-labelledby="titulo-duvidas">
    <HomeSectionHeader title-id="titulo-duvidas" title="Antes de retirar, tire suas dúvidas."
      :action-to="{ name: 'pedidos' }" action-label="Meus pedidos" />
    <div class="home-faq__questions">
      <details v-for="duvida in duvidas" :key="duvida.id" class="home-faq__item" name="duvidas-retirada">
        <summary class="home-faq__question">
          {{ duvida.pergunta }}
          <ChevronDown :size="20" aria-hidden="true" />
        </summary>
        <p class="home-faq__answer">{{ duvida.resposta }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.home-faq {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  align-items: start;
  gap: var(--pp-space-6);
  padding-block: var(--pp-space-5);
}
.home-faq :deep(.home-section-header) { flex-direction: column; align-items: flex-start; margin: 0; }
.home-faq :deep(.home-section-header__action) { align-self: flex-start; }
.home-faq__questions { min-width: 0; border-top: 1px solid var(--pp-creme-borda); }
.home-faq__item { border-bottom: 1px solid var(--pp-creme-borda); }
.home-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pp-space-3);
  min-height: 72px;
  padding: var(--pp-space-3) 0;
  color: var(--pp-marrom);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
  list-style: none;
  cursor: pointer;
}
.home-faq__question::-webkit-details-marker { display: none; }
.home-faq__question svg { flex: none; transition: transform 180ms var(--pp-ease); }
.home-faq__item[open] .home-faq__question svg { transform: rotate(180deg); }
.home-faq__question:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
.home-faq__answer { max-width: 65ch; margin: 0; padding: 0 var(--pp-space-5) var(--pp-space-4) 0; color: var(--pp-texto-2); font-size: 15px; line-height: 1.7; }
.home-faq__item[open] .home-faq__answer { animation: answer-in 180ms var(--pp-ease); }
@keyframes answer-in { from { opacity: .4; } to { opacity: 1; } }
@media (max-width: 760px) {
  .home-faq { grid-template-columns: minmax(0, 1fr); gap: var(--pp-space-4); padding-block: var(--pp-space-3); }
  .home-faq__question { min-height: 64px; font-size: 15px; }
  .home-faq__answer { font-size: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .home-faq__question svg { transition: none; }
  .home-faq__item[open] .home-faq__answer { animation: none; }
}
</style>
