<template>
  <section class="pp-admin-panel" :aria-labelledby="titleId">
    <header class="pp-admin-panel__header">
      <div>
        <h2 :id="titleId">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>

<script setup>
import { useId } from "vue";
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" },
});
const titleId = `admin-panel-${useId()}`;
</script>

<style scoped>
.pp-admin-panel {
  min-width: 0;
  background: var(--pp-admin-surface);
  border: 1px solid var(--pp-admin-border);
  border-radius: var(--pp-admin-radius);
  padding: 20px;
}
.pp-admin-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.pp-admin-panel__header h2 {
  margin: 0;
  color: var(--pp-admin-text);
  font-size: 17px;
  font-weight: 650;
  line-height: 1.4;
}
.pp-admin-panel__header p {
  color: var(--pp-admin-muted);
  font-size: 13px;
  line-height: 1.5;
  margin: 5px 0 0;
}
@media (max-width: 767px) {
  .pp-admin-panel {
    padding: 20px;
  }
}
</style>
