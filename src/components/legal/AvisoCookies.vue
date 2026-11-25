<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { X } from "lucide-vue-next";
import { VERSAO_DOCUMENTOS } from "@/content/documentosLegais";

// Aviso apenas informativo: o site só usa armazenamento essencial e terceiros necessários.
const CHAVE = "pp_aviso_cookies";
const route = useRoute();
const visivel = ref(false);

onMounted(() => {
  try { visivel.value = localStorage.getItem(CHAVE) !== VERSAO_DOCUMENTOS; } catch { visivel.value = true; }
});
function fechar() {
  visivel.value = false;
  try { localStorage.setItem(CHAVE, VERSAO_DOCUMENTOS); } catch { /* navegador sem armazenamento: some só nesta visita */ }
}
</script>

<template>
  <aside v-if="visivel && route.name !== 'cookies'" class="aviso-cookies" aria-label="Aviso de cookies">
    <p>
      Usamos só o armazenamento essencial (login e carrinho) e cookies do Google e do Mercado Pago necessários ao login e ao pagamento. Sem anúncios nem rastreamento.
      <RouterLink :to="{ name: 'cookies' }">Política de Cookies</RouterLink>
    </p>
    <button type="button" class="aviso-cookies__fechar" aria-label="Fechar aviso de cookies" @click="fechar">
      <X :size="18" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.aviso-cookies {
  position: fixed; z-index: 120; left: 16px; bottom: 16px;
  display: flex; align-items: flex-start; gap: var(--pp-space-2);
  max-width: 400px; padding: 12px 8px 12px 16px;
  border: 1px solid var(--pp-creme-borda); border-radius: var(--pp-radius-btn);
  background: var(--pp-creme); color: var(--pp-marrom); box-shadow: var(--pp-sombra-card);
}
.aviso-cookies p { margin: 0; font-size: 13px; line-height: 1.5; }
.aviso-cookies a { color: var(--pp-dourado-profundo); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.aviso-cookies__fechar {
  flex: 0 0 auto; display: grid; place-items: center; width: 44px; height: 44px; margin-top: -8px;
  border: 0; border-radius: var(--pp-radius-btn); background: transparent; color: var(--pp-marrom); cursor: pointer;
}
.aviso-cookies__fechar:hover { background: var(--pp-creme-2); }
.aviso-cookies a:focus-visible, .aviso-cookies__fechar:focus-visible { outline: 3px solid var(--pp-dourado-escuro); outline-offset: 2px; }
/* Acima da barra inferior do celular (64px em StudentLayout). */
@media (max-width: 980px) {
  .aviso-cookies { right: 16px; bottom: calc(76px + env(safe-area-inset-bottom)); max-width: none; }
}
</style>
