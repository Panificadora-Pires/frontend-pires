<template>
  <button
    :type="type"
    class="pp-btn"
    :class="[`pp-btn--${variant}`, { 'pp-btn--block': block }]"
    :disabled="loading || disabled"
    :aria-busy="loading"
    v-bind="$attrs"
  >
    <template v-if="loading">
      <span class="pp-btn__spinner" aria-hidden="true" />
      <span>{{ loadingText }}</span>
    </template>

    <template v-else>
      <component
        :is="icon"
        v-if="icon"
        :size="18"
        class="pp-btn__icon"
        aria-hidden="true"
      />
      <slot />
    </template>
  </button>
</template>

<script setup>
defineOptions({ inheritAttrs: false });

defineProps({
  type: { type: String, default: "button" },
  variant: { type: String, default: "primary" },
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  loadingText: { type: String, default: "Carregando..." },
  disabled: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
});
</script>

<style scoped>
.pp-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 50px;
  padding: 0 22px;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.005em;
  cursor: pointer;
  transition:
    transform 180ms ease,
    filter 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.pp-btn--block {
  width: 100%;
}

.pp-btn--primary {
  background: linear-gradient(90deg, #ffbd3c 0%, #ffc84e 100%);
  color: #2a150b;
  box-shadow: 0 8px 22px rgba(224, 168, 62, 0.18);
}

.pp-btn--primary:hover:not(:disabled) {
  filter: brightness(1.04);
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(224, 168, 62, 0.24);
}

.pp-btn--ghost {
  border-color: var(--pp-gold);
  background: rgba(31, 14, 5, 0.12);
  color: var(--pp-cream);
}

.pp-btn--ghost:hover:not(:disabled) {
  background: var(--pp-gold-soft);
}

.pp-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}

.pp-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.pp-btn__icon {
  flex: 0 0 auto;
}

.pp-btn__spinner {
  width: 17px;
  height: 17px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: pp-spin 650ms linear infinite;
}

@keyframes pp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
