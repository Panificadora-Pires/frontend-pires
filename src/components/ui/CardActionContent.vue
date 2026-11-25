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
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    const radius = style.borderTopLeftRadius;
    const rounded = Math.min(width / 2, height / 2, radius.includes("%")
      ? parseFloat(radius) * Math.min(width, height) / 100 : parseFloat(radius));
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
  <span class="pp-card-action__content"><slot /></span>
  <span ref="fill" class="pp-card-action__fill" aria-hidden="true">
    <span class="pp-card-action__content"><slot /></span>
  </span>
</template>
