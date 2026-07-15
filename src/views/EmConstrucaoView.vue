<template>
  <div class="placeholder">
    <div class="placeholder__card">
      <Construction :size="34" />
      <h1>Em construção</h1>
      <p>Essa tela ainda não foi implementada — as próximas telas do Figma virão aqui.</p>
      <RouterLink to="/login" class="placeholder__link">Voltar ao login</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { Construction } from 'lucide-vue-next'
</script>

<style scoped>
.placeholder {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pp-space-5);
}

.placeholder__card {
  text-align: center;
  color: var(--pp-cream-dim);
  max-width: 320px;
}

.placeholder__card svg {
  color: var(--pp-gold);
  margin-bottom: var(--pp-space-3);
}

.placeholder__card h1 {
  font-family: var(--pp-font-display);
  color: var(--pp-cream);
  font-size: 22px;
  margin: 0 0 8px;
}

.placeholder__link {
  display: inline-block;
  margin-top: var(--pp-space-4);
  color: var(--pp-gold);
  font-weight: 600;
  font-size: 13.5px;
  text-decoration: none;
}
</style>
