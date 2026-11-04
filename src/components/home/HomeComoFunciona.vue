<script setup>
import { ArrowUpRight } from "lucide-vue-next";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import fotoCombo from "@/assets/images/home/combo-balcao-runway.webp";

const PASSOS = [
  { titulo: "Escolha", texto: "Monte o pedido pelo cardápio antes do intervalo." },
  { titulo: "Pague", texto: "Pix ou cartão pelo app, ou dinheiro na retirada." },
  { titulo: "Mostre o QR Code", texto: "Quando ficar pronto, você recebe o aviso e retira no balcão." },
];
</script>

<template>
  <section class="como-funciona" aria-labelledby="titulo-como-funciona">
    <img
      class="como-funciona__foto"
      :src="fotoCombo"
      alt="Coxinha e suco de laranja"
      width="1100"
      height="1100"
      loading="lazy"
      decoding="async"
    />
    <div class="como-funciona__conteudo">
      <HomeSectionHeader
        title-id="titulo-como-funciona"
        title="Do pedido ao balcão"
        note="três passos, sem fila"
      />
      <ol class="como-funciona__passos">
        <li v-for="(passo, indice) in PASSOS" :key="passo.titulo" class="como-funciona__passo">
          <span class="como-funciona__numero" aria-hidden="true">{{ indice + 1 }}</span>
          <div>
            <h3>{{ passo.titulo }}</h3>
            <p>{{ passo.texto }}</p>
          </div>
        </li>
      </ol>
      <RouterLink :to="{ name: 'cardapio' }" class="como-funciona__acao pp-card-action">
        <CardActionContent>Ver cardápio <ArrowUpRight :size="18" aria-hidden="true" /></CardActionContent>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.como-funciona {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(32px, 5vw, 72px);
}
.como-funciona__foto {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: var(--pp-radius-card-lg);
}
.como-funciona__conteudo { min-width: 0; }
.como-funciona__passos {
  display: grid;
  gap: var(--pp-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.como-funciona__passo {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: var(--pp-space-3);
}
.como-funciona__numero {
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-titulo);
  font-size: 32px;
  line-height: 1.2;
}
.como-funciona__passo h3 {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 1.4;
}
.como-funciona__passo p {
  max-width: 42ch;
  margin: 0;
  color: var(--pp-texto-2);
  font-size: 15px;
  line-height: 1.6;
}
.como-funciona__acao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--pp-space-1);
  min-height: 48px;
  margin-top: var(--pp-space-5);
  padding: var(--pp-space-2) var(--pp-space-4);
  border-radius: var(--pp-radius-full);
  background: var(--pp-marrom);
  color: var(--pp-creme);
  font-size: 14px;
  font-weight: 700;
}
.como-funciona__acao { --pp-card-action-radius: 110%; }
.como-funciona__acao:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (max-width: 760px) {
  .como-funciona { grid-template-columns: minmax(0, 1fr); gap: var(--pp-space-4); }
  .como-funciona__foto { max-height: 440px; }
}
</style>
