<script setup>
import { Layers3, Pencil } from "lucide-vue-next";

import CardActionContent from "@/components/ui/CardActionContent.vue";

defineProps({ categoria: { type: Object, required: true } });
const emit = defineEmits(["editar"]);
</script>

<template>
  <li
    class="categories-item"
  >
    <div class="categories-identity">
      <span class="categories-identity-icon" aria-hidden="true"
        ><Layers3 :size="20"
      /></span>
      <div>
        <strong>{{ categoria.nome }}</strong>
        <p>
          {{ categoria.descricao || "Sem descrição cadastrada" }}
        </p>
        <small v-if="categoria.slug">{{
          categoria.slug
        }}</small>
      </div>
    </div>
    <div class="categories-order">
      <span class="categories-mobile-label">Ordem</span>
      <strong>{{ categoria.ordem }}</strong>
    </div>
    <div class="categories-state-cell">
      <span class="categories-mobile-label">Situação</span>
      <span
        class="categories-status"
        :class="{ 'is-inactive': !categoria.ativa }"
      >
        <span class="categories-status-dot" aria-hidden="true"></span>
        {{ categoria.ativa ? "Ativa" : "Inativa" }}
      </span>
    </div>
    <div class="categories-actions">
      <button
        type="button"
        class="categories-edit pp-card-action pp-admin-action--secondary"
        data-card-action-radius
        :aria-label="'Editar ' + categoria.nome"
        @click="emit('editar', categoria)"
      >
        <CardActionContent
          ><Pencil
            :size="15"
            aria-hidden="true"
          />Editar</CardActionContent
        >
      </button>
    </div>
  </li>
</template>

<style scoped src="./AdminCategoriaItem.css"></style>
