<template>
  <button
    class="pp-btn"
    :class="[`pp-btn--${variant}`, { 'pp-btn--block': block }]"
    :disabled="loading || disabled"
    v-bind="$attrs"
  >
    <template v-if="loading">
      <span class="pp-btn__spinner" aria-hidden="true" />
      <span>{{ loadingText }}</span>
    </template>
    <template v-else>
      <component :is="icon" v-if="icon" :size="18" class="pp-btn__icon" />
      <slot />
    </template>
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | ghost
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  loadingText: { type: String, default: 'Carregando...' },
  disabled: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null }, // <-- PROP ADICIONADA DE VOLTA
})
</script>

<style scoped>
.pp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--pp-radius-btn);
  font-weight: 600;
  font-size: 16px;
  padding: 0 24px;
  height: 52px; 
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: all 250ms ease;
  font-family: var(--pp-font-body);
  letter-spacing: 0.01em;
  position: relative;
  overflow: hidden;
}

.pp-btn--block {
  width: 100%;
}

.pp-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.pp-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.pp-btn--primary {
  background: var(--pp-gradient-gold);
  color: var(--pp-bg-dark);
  box-shadow: var(--pp-shadow-soft);
}

.pp-btn--primary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px); 
  box-shadow: var(--pp-shadow-elevation);
}

.pp-btn--ghost {
  background: transparent;
  color: var(--pp-cream);
  border-color: var(--pp-gold); 
  border-width: 1px;
}

.pp-btn--ghost:hover:not(:disabled) {
  background: var(--pp-gold); 
  color: var(--pp-bg-dark);
  border-color: var(--pp-gold);
  transform: translateY(-2px);
}

/* Classe do ícone para garantir alinhamento perfeito */
.pp-btn__icon {
  flex-shrink: 0;
  transition: transform 250ms ease;
}

.pp-btn:hover .pp-btn__icon {
  transform: translateX(2px); /* Leve animação no ícone ao hover */
}

.pp-btn__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(36, 21, 9, 0.3);
  border-top-color: var(--pp-bg-dark);
  animation: pp-spin 0.7s linear infinite;
}

.pp-btn--ghost .pp-btn__spinner {
  border-color: rgba(243, 233, 216, 0.3);
  border-top-color: var(--pp-cream);
}

@keyframes pp-spin {
  to { transform: rotate(360deg); }
}
</style>