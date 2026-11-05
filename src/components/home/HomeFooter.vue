<script setup>
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { ArrowUp } from "lucide-vue-next";
import { movimentoReduzido } from "@/utils/vooAoCarrinho";

const wordmark = useTemplateRef("wordmark");
let observer;
function voltarAoTopo() {
  document.getElementById("inicio-home")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: movimentoReduzido() ? "instant" : "smooth" });
}
onMounted(() => {
  if (movimentoReduzido() || !window.IntersectionObserver) return;
  observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    wordmark.value?.classList.add("is-revealing");
    observer.disconnect();
  }, { threshold: .15 });
  observer.observe(wordmark.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <footer class="home-footer">
    <div class="home-footer__top">
      <div class="home-footer__marca">
        <img src="/logo.png" alt="Pires Panificadora" width="64" height="64" loading="lazy" />
        <span>Pires Panificadora</span>
      </div>
      <nav class="home-footer__links" aria-label="Explore a Pires">
        <RouterLink :to="{ name: 'cardapio' }">Cardápio</RouterLink>
        <RouterLink :to="{ name: 'promocoes' }">Promoções</RouterLink>
        <RouterLink :to="{ name: 'pedidos' }">Meus pedidos</RouterLink>
      </nav>
      <button type="button" class="home-footer__top-link" @click="voltarAoTopo">
        Voltar ao topo <ArrowUp :size="18" aria-hidden="true" />
      </button>
    </div>
    <div ref="wordmark" class="home-footer__wordmark" aria-hidden="true">PIRES</div>
  </footer>
</template>

<style scoped>
.home-footer {
  margin-top: var(--pp-home-section-space);
  padding-top: var(--pp-space-5);
  border-top: 1px solid var(--pp-creme-borda);
  color: var(--pp-marrom);
}
.home-footer__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--pp-space-4);
}
.home-footer__marca { display: flex; align-items: center; gap: var(--pp-space-2); }
.home-footer__marca img { display: block; object-fit: contain; }
.home-footer__marca span { font-family: var(--pp-font-titulo); font-size: 22px; font-weight: 400; }
.home-footer__links { display: flex; flex-wrap: wrap; gap: var(--pp-space-1) var(--pp-space-4); }
.home-footer__links a,
.home-footer__top-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--pp-marrom);
  font-size: 14px;
  font-weight: 600;
}
.home-footer__top-link { gap: var(--pp-space-1); border: 0; padding: 0; background: transparent; cursor: pointer; }
.home-footer__top-link:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
.home-footer__wordmark {
  margin-top: var(--pp-space-5);
  padding-bottom: .05em;
  overflow: hidden;
  color: transparent;
  background-image: radial-gradient(var(--pp-marrom-2) 1px, transparent 1.2px);
  background-size: 4px 4px;
  background-clip: text;
  font-family: var(--pp-font-titulo);
  font-size: clamp(120px, 30vw, 400px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -.025em;
  text-align: center;
  user-select: none;
}
.home-footer__wordmark.is-revealing { animation: wordmark-in 400ms var(--pp-ease); }
@keyframes wordmark-in { from { opacity: .3; filter: blur(3px); } to { opacity: 1; filter: blur(0); } }
@media (max-width: 760px) {
  .home-footer__top { align-items: flex-start; gap: var(--pp-space-3); }
  .home-footer__marca { width: 100%; }
  .home-footer__links { gap: 0 var(--pp-space-3); }
  .home-footer__wordmark { margin-top: var(--pp-space-4); }
}
@media (prefers-reduced-motion: reduce) {
  .home-footer__wordmark.is-revealing { animation: none; }
}
.home-footer__links a:hover,
.home-footer__links a:focus-visible { text-decoration: underline; text-underline-offset: 4px; }
.home-footer__links a:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 4px; }
</style>
