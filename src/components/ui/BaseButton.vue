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
      <component :is="icon" v-if="icon" :size="17" />
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
  icon: { type: [Object, Function], default: null },
})
</script>

<style scoped>
.pp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--pp-radius-sm);
  font-weight: 600;
  font-size: 14.5px;
  padding: 13px 20px;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  font-family: var(--pp-font-body);
}

.pp-btn--block {
  width: 100%;
}

.pp-btn:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.pp-btn--primary {
  background: var(--pp-gold);
  color: var(--pp-bg-dark);
}

.pp-btn--primary:hover:not(:disabled) {
  background: var(--pp-gold-hover);
}

.pp-btn--ghost {
  background: transparent;
  color: var(--pp-cream);
  border-color: var(--pp-border);
}

.pp-btn--ghost:hover:not(:disabled) {
  background: var(--pp-gold-soft);
}

.pp-btn__spinner {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(36, 21, 9, 0.35);
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
