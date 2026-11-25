<script setup>
import { inject } from "vue";
import {
  CircleAlert,
  LoaderCircle,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-vue-next";

import CardActionContent from "@/components/ui/CardActionContent.vue";

const {
  aoCancelarExclusao,
  aoClicarForaExclusao,
  aoFecharExclusao,
  confirmarExclusao,
  erroExclusao,
  excluindo,
  exclusaoDialog,
  fecharExclusao,
  promocaoParaExcluir,
  ref,
} = inject("adminPromocoes");
</script>

<template>
  <dialog
    ref="exclusaoDialog"
    class="promotions-dialog promotions-delete-dialog"
    aria-labelledby="promotions-delete-title"
    @cancel="aoCancelarExclusao"
    @close="aoFecharExclusao"
    @click="aoClicarForaExclusao"
  >
    <div class="promotions-dialog-panel">
      <header class="promotions-dialog-header">
        <div>
          <span>CONFIRMAÇÃO</span>
          <h2 id="promotions-delete-title">Excluir promoção</h2>
          <p>Esta ação não exclui o produto do catálogo.</p>
        </div>
        <button
          type="button"
          class="promotions-close"
          :disabled="excluindo"
          aria-label="Fechar confirmação"
          @click="fecharExclusao"
        >
          <X :size="19" aria-hidden="true" />
        </button>
      </header>
      <div class="promotions-delete-body">
        <div class="promotions-delete-icon">
          <TriangleAlert :size="24" aria-hidden="true" />
        </div>
        <div>
          <strong
            >Excluir a oferta de
            {{ promocaoParaExcluir?.produto_nome }}?</strong
          >
          <p>
            O preço especial deixará de valer. O produto continuará cadastrado
            normalmente.
          </p>
        </div>
        <p v-if="erroExclusao" class="promotions-form-error" role="alert">
          <CircleAlert :size="16" aria-hidden="true" />{{ erroExclusao }}
        </p>
      </div>
      <footer class="promotions-dialog-actions">
        <button
          type="button"
          class="promotions-cancel pp-card-action pp-admin-action--secondary"
          data-card-action-radius
          :disabled="excluindo"
          @click="fecharExclusao"
        >
          <CardActionContent>Voltar</CardActionContent>
        </button>
        <button
          type="button"
          class="promotions-delete-confirm pp-card-action pp-admin-action--danger"
          data-card-action-radius
          :disabled="excluindo || !promocaoParaExcluir"
          @click="confirmarExclusao"
        >
          <CardActionContent>
            <LoaderCircle
              v-if="excluindo"
              :size="16"
              class="promotions-spin"
              aria-hidden="true"
            />
            <Trash2 v-else :size="16" aria-hidden="true" />
            {{ excluindo ? "Excluindo…" : "Excluir promoção" }}
          </CardActionContent>
        </button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped src="./AdminPromocaoExclusao.css"></style>
