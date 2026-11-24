<script setup>
import { onMounted, ref } from 'vue';
import { motion, usePresence, useReducedMotion } from 'motion-v';

const props = defineProps({
  produtoId: { type: [Number, String], required: true },
  animar: { type: Boolean, default: false },
});
const emit = defineEmits(['apareceu']);
const reduzir = useReducedMotion();
const elemento = ref(null);
// O valor inicial pertence à montagem deste ID, nunca ao render da página.
const entrada = props.animar && !reduzir.value ? { opacity: 0, y: 8 } : false;
let dom = null;
onMounted(() => {
  dom = elemento.value?.$el;
  emit('apareceu', props.produtoId);
});
usePresence({
  element: () => dom,
  // A saída mantém o DOM por 160 ms depois do teardown Vue. Aplicar inert
  // no próprio DOM impede teclado/toque também em filtros e remoção no modal.
  onExit() {
    if (!dom) return;
    dom.inert = true;
    dom.querySelector('article')?.setAttribute('inert', '');
  },
  onEnter() {
    if (!dom) return;
    dom.inert = false;
    dom.querySelector('article')?.removeAttribute('inert');
  },
});
</script>

<template>
  <motion.div ref="elemento" class="favorites-page__item" :layout="reduzir ? false : 'position'"
    :initial="entrada" :animate="{ opacity: 1, y: 0 }"
    :exit="{ opacity: 0, scale: reduzir ? 1 : .97, transition: { duration: reduzir ? 0 : .16 } }"
    :transition="{ duration: reduzir ? 0 : .2, layout: { duration: reduzir ? 0 : .22 } }">
    <slot />
  </motion.div>
</template>

<style scoped>
.favorites-page__item { min-width: 0; }
</style>
