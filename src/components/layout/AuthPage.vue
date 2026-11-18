<script setup>
import { inject } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
const { ocupado } = inject("authExperience");
onBeforeRouteLeave((to) => ocupado.value && to.meta.somenteVisitante ? false : true);
onBeforeRouteUpdate(() => !ocupado.value);
</script>

<template>
  <section class="auth-page">
    <div class="auth-page__heading"><slot name="heading" /></div>
    <slot />
  </section>
</template>
