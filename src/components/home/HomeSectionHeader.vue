<script setup>
import { ArrowUpRight } from "lucide-vue-next";

defineProps({
  titleId: { type: String, required: true },
  title: { type: String, required: true },
  intro: { type: String, default: "" },
  note: { type: String, default: "" },
  actionTo: { type: Object, default: null },
  actionLabel: { type: String, default: "" },
});
</script>

<template>
  <header class="home-section-header">
    <div class="home-section-header__copy">
      <div class="home-section-header__heading">
        <h2 :id="titleId" class="home-section-header__title">{{ title }}</h2>
        <span v-if="note" class="home-section-header__note" aria-hidden="true">{{ note }}</span>
      </div>
      <p v-if="intro" class="home-section-header__intro">{{ intro }}</p>
    </div>
    <RouterLink v-if="actionTo" :to="actionTo" class="home-section-header__action">
      {{ actionLabel }} <ArrowUpRight :size="18" aria-hidden="true" />
    </RouterLink>
  </header>
</template>

<style scoped>
.home-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--pp-home-section-header-gap);
  margin: 0 0 var(--pp-home-section-header-after);
  padding: 0;
}
.home-section-header__copy {
  align-self: flex-start;
  min-width: 0;
  max-width: 100%;
}
.home-section-header__heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px var(--pp-space-2);
}
.home-section-header__title {
  margin: 0 0 var(--pp-space-1);
  color: var(--pp-marrom);
  font-family: var(--pp-font-titulo);
  font-size: var(--pp-home-section-title-size);
  font-weight: 400;
  line-height: var(--pp-home-section-title-leading);
  letter-spacing: var(--pp-home-section-title-tracking);
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.home-section-header__intro {
  margin: 0;
  color: var(--pp-texto-2);
  font-family: var(--pp-font-body);
  font-size: var(--pp-home-section-intro-size);
  line-height: 1.5;
}
.home-section-header__note {
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-nota);
  font-size: var(--pp-home-section-note-size);
  font-weight: 700;
}
.home-section-header__action {
  display: inline-flex;
  align-items: center;
  gap: var(--pp-space-1);
  min-height: 44px;
  flex: none;
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-body);
  font-size: var(--pp-home-section-action-size);
  font-weight: 700;
  white-space: nowrap;
}
.home-section-header__action svg {
  flex: none;
}
.home-section-header__action:hover,
.home-section-header__action:focus-visible {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.home-section-header__action:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (max-width: 760px) {
  .home-section-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .home-section-header__action {
    align-self: flex-end;
  }
}
</style>
