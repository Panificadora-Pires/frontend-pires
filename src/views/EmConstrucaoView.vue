<template>
  <div class="placeholder">
    <div class="placeholder__card">
      <Construction :size="34" />
      <h1>Em construção</h1>
      <p>Essa tela ainda não foi implementada — as próximas telas do Figma virão aqui.</p>
      
      <!-- Trocado RouterLink por button para disparar o logout -->
      <button @click="voltarParaLogin" class="placeholder__link">
        Voltar ao login
      </button>
    </div>
  </div>
</template>

<script setup>
import { Construction } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const voltarParaLogin = () => {
  // 1. Limpa a autenticação (token, usuário)
  auth.logout()
  // 2. Redireciona para a tela de login
  router.push('/login')
}
</script>

<style scoped>
.placeholder {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pp-space-5);
  background: var(--pp-gradient-left);
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
  font-family: var(--pp-font-body);
  color: var(--pp-cream);
  font-size: 22px;
  margin: 0 0 8px;
}

.placeholder__card p {
  font-size: 15px;
  line-height: 1.5;
}

.placeholder__link {
  display: inline-block;
  margin-top: var(--pp-space-4);
  color: var(--pp-gold);
  font-weight: 600;
  font-size: 13.5px;
  text-decoration: none;
  cursor: pointer;
  /* Reset de estilos do botão */
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  transition: color 250ms ease;
}

.placeholder__link:hover {
  color: var(--pp-cream);
  text-decoration: underline;
}
</style>