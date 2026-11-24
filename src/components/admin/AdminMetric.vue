<template>
  <div class="pp-admin-metric" :aria-busy="loading">
    <span class="pp-admin-metric__label">{{ label }}</span>
    <strong>{{ loading || value === null || value === undefined ? '—' : value }}</strong>
    <small v-if="caption">{{ caption }}</small>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true }, value: { type: [String, Number], default: null },
  caption: { type: String, default: '' }, loading: { type: Boolean, default: false },
});
</script>

<style scoped>
.pp-admin-metric{min-width:0;display:flex;flex-direction:column;gap:4px;padding:0 22px}
.pp-admin-metric__label{color:var(--pp-admin-muted);font-size:13px}
.pp-admin-metric strong{color:var(--pp-admin-text);font-size:28px;line-height:1.3;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.pp-admin-metric small{color:var(--pp-admin-muted);font-size:13px;line-height:1.4}
@media(max-width:767px){.pp-admin-metric{padding:17px 16px}.pp-admin-metric strong{font-size:24px}}
</style>
