<script setup>
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

const fill = useTemplateRef("fill");
let observer;

onMounted(() => {
  const element = fill.value;
  const action = element.closest(".home .pp-card-action, .pp-card-action[data-card-action-radius]");
  if (!action) return;

  function ajustarRaio() {
    const style = getComputedStyle(element);
    // Dimensões locais não incluem a escala de :active durante um resize.
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    const radius = style.borderTopLeftRadius;
    const rounded = Math.min(width / 2, height / 2, radius.includes("%")
      ? parseFloat(radius) * Math.min(width, height) / 100 : parseFloat(radius));
    // Distância até a borda arredondada mais distante da origem inferior central.
    // Evita consumir parte dos 450ms expandindo uma área que já saiu do botão.
    const reach = Math.hypot(width / 2 - rounded, height - rounded) + rounded;
    action.style.setProperty("--pp-card-action-radius", `${reach}px`);
  }

  observer = new ResizeObserver(ajustarRaio);
  observer.observe(action);
  ajustarRaio();
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <!-- A cópia visual acompanha o recorte para manter o contraste durante o preenchimento. -->
  <span class="pp-card-action__content"><slot /></span>
  <span ref="fill" class="pp-card-action__fill" aria-hidden="true">
    <span class="pp-card-action__content"><slot /></span>
  </span>
</template>
