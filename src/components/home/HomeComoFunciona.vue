<template>
  <section class="como-funciona" aria-labelledby="titulo-como-funciona">
    <header class="como-funciona__topo">
      <h2 id="titulo-como-funciona">Como funciona</h2>
      <span class="como-funciona__nota" aria-hidden="true">três passos, sem fila</span>
    </header>

    <ol class="como-funciona__passos">
      <li
        v-for="(passo, indice) in PASSOS"
        :key="passo.titulo"
        ref="passos"
        class="como-funciona__passo"
      >
        <span class="como-funciona__icone" aria-hidden="true">
          <component :is="passo.icone" :size="26" />
        </span>
        <span class="como-funciona__numero" aria-hidden="true">{{ indice + 1 }}</span>
        <h3>{{ passo.titulo }}</h3>
        <p>{{ passo.texto }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { QrCode, ShoppingBag, WalletCards } from "lucide-vue-next";

const PASSOS = [
  {
    icone: ShoppingBag,
    titulo: "Escolha",
    texto: "Monte o pedido pelo cardápio antes do intervalo.",
  },
  {
    icone: WalletCards,
    titulo: "Pague",
    texto: "Pix ou cartão pelo app, ou dinheiro na retirada.",
  },
  {
    icone: QrCode,
    titulo: "Mostre o QR Code",
    texto: "Quando ficar pronto, você recebe o aviso e retira no balcão.",
  },
];
// Cada passo começa a subir um pouco depois do anterior (px de rolagem).
const ATRASO_POR_PASSO_PX = 60;
// Fração da altura da tela em que o passo termina de subir.
const TRECHO_DA_TELA = 0.45;

const passos = useTemplateRef("passos");
let consultaMovimento = null;
let quadroAgendado = false;

// Os passos acompanham a rolagem (sobem ao descer, descem ao voltar), como a cena do banner.
function atualizar() {
  quadroAgendado = false;
  const reduzido = Boolean(consultaMovimento?.matches);
  (passos.value || []).forEach((passo, indice) => {
    const topo = passo.getBoundingClientRect().top;
    const progresso = reduzido
      ? 1
      : (window.innerHeight - topo - indice * ATRASO_POR_PASSO_PX) / (window.innerHeight * TRECHO_DA_TELA);
    passo.style.setProperty("--q", Math.min(1, Math.max(0, progresso)).toFixed(3));
  });
}

function agendar() {
  if (quadroAgendado) return;
  quadroAgendado = true;
  window.requestAnimationFrame(atualizar);
}

onMounted(() => {
  consultaMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  consultaMovimento?.addEventListener?.("change", agendar);
  window.addEventListener("scroll", agendar, { passive: true });
  window.addEventListener("resize", agendar);
  atualizar();
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", agendar);
  window.removeEventListener("resize", agendar);
  consultaMovimento?.removeEventListener?.("change", agendar);
});
</script>

<style scoped>
.como-funciona__topo {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 16px;
}
.como-funciona__topo h2 {
  margin: 0;
  font-size: 24px;
}
.como-funciona__nota {
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-nota);
  font-size: 22px;
  font-weight: 700;
}
.como-funciona__passos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.como-funciona__passo {
  --q: 1;
  position: relative;
  padding: 22px;
  border: 1px solid var(--student-border);
  border-radius: var(--pp-radius-card-lg);
  background: var(--student-surface);
  opacity: var(--q);
  transform: translateY(calc((1 - var(--q)) * 70px));
}
.como-funciona__icone {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--pp-creme-2);
  color: var(--pp-dourado-escuro);
}
.como-funciona__numero {
  display: block;
  color: var(--pp-gold);
  font-family: var(--pp-font-titulo);
  font-size: 46px;
  line-height: 1;
}
.como-funciona__passo h3 {
  margin: 10px 0 6px;
  font-size: 18px;
}
.como-funciona__passo p {
  margin: 0;
  color: var(--student-muted);
  font-size: 14px;
  line-height: 1.5;
}
@media (max-width: 760px) {
  .como-funciona__passos {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
