<template>
  <nav class="admin-nav" :aria-label="label">
    <div v-for="group in groups" :key="group.label" class="admin-nav__group">
      <span class="admin-nav__group-label">{{ group.label }}</span>
      <RouterLink v-for="item in group.items" :key="item.name" :to="{ name: item.name }" class="admin-nav__item" :class="{ 'is-active': item.name === routeName || item.children?.includes(routeName) }" :aria-current="item.name === routeName ? 'page' : null" @click="emit('navigate')">
        <component :is="item.icon" :size="18" aria-hidden="true" /><span>{{ item.label }}</span>
        <span v-if="item.badge" class="admin-nav__badge" :aria-label="`${item.badge} pedidos aguardando ação`">{{ Number(item.badge) > 99 ? '99+' : item.badge }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
<script setup>
defineProps({ groups: { type: Array, required: true }, routeName: { type: [String, Symbol], default: null }, label: { type: String, default: "Navegação administrativa" } });
const emit = defineEmits(["navigate"]);
</script>
<style scoped>
.admin-nav { display: grid; gap: 26px; }
.admin-nav__group { display: grid; gap: 3px; }
.admin-nav__group-label { padding: 0 12px 6px; color: var(--pp-admin-sidebar-muted); font-size: 13px; line-height: 1.4; }
.admin-nav__item { display: flex; align-items: center; gap: 11px; min-height: 44px; padding: 10px 12px; border-radius: var(--pp-radius-sm); color: var(--pp-admin-sidebar-text); font-size: 14px; line-height: 1.4; font-weight: 500; transition: background 150ms ease, color 150ms ease; }
.admin-nav__item:hover { background: var(--pp-admin-sidebar-border); }
.admin-nav__item.is-active { background: var(--pp-admin-bg); color: var(--pp-admin-text); font-weight: 600; }
.admin-nav__item.is-active svg { color: var(--pp-admin-accent); }
.admin-nav__item:focus-visible { outline: 2px solid var(--pp-admin-sidebar-accent); outline-offset: 3px; }
.admin-nav__badge { display: inline-grid; place-items: center; min-width: 22px; min-height: 22px; margin-left: auto; padding: 1px 5px; border-radius: 5px; background: var(--pp-admin-sidebar-accent); color: var(--pp-admin-text); font-size: 12px; line-height: 1.3; font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .admin-nav__item { transition: none; } }
</style>
