<template>
  <div class="placeholder">
    <div class="placeholder__card">
      <Construction :size="34" />
      <h1>Em construção</h1>
      <p>
        Essa tela ainda não foi implementada — as próximas telas do Figma virão
        aqui.
      </p>
      <RouterLink :to="{ name: 'home' }" class="placeholder__link"
        >Voltar ao início</RouterLink
      >
    </div>
  </div>
</template>

<script setup>
import { Construction } from "lucide-vue-next";
</script>

<style scoped>
.placeholder {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pp-space-4);
}

.placeholder__card {
  text-align: center;
  color: var(--pp-text-dark-soft);
  max-width: 320px;
}

.placeholder__card svg {
  color: var(--pp-gold-hover);
  margin-bottom: var(--pp-space-2);
}

.placeholder__card h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--pp-text-dark);
  margin: 0 0 var(--pp-space-1);
}

.placeholder__link {
  display: inline-block;
  margin-top: var(--pp-space-3);
  color: var(--pp-gold-hover);
  font-weight: 700;
  font-size: 13px;
}
</style>
