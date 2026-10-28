<template>
  <span
    class="pp-refresh-status"
    :class="{ 'is-error': comErro }"
    :title="titulo"
  >
    <CircleAlert v-if="comErro" :size="13" aria-hidden="true" />
    <RefreshCw
      v-else
      :size="13"
      :class="{ 'pp-refresh-status__spin': atualizando }"
      aria-hidden="true"
    />
    {{ texto }}
  </span>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { CircleAlert, RefreshCw } from "lucide-vue-next";

const props = defineProps({
  ultimaAtualizacao: { type: Date, default: null },
  atualizando: { type: Boolean, default: false },
  erro: { type: [Object, String, Boolean], default: null },
});

// Relógio só para o texto relativo ("há 2 min"); não faz requisições.
const agora = ref(Date.now());
let relogio = null;

onMounted(() => {
  relogio = window.setInterval(() => {
    agora.value = Date.now();
  }, 15_000);
});

onBeforeUnmount(() => window.clearInterval(relogio));

const comErro = computed(() => Boolean(props.erro) && !props.atualizando);

const texto = computed(() => {
  if (props.atualizando && !props.ultimaAtualizacao) return "Carregando...";
  if (props.atualizando) return "Atualizando...";
  if (comErro.value) return "Sem conexão, tentando de novo";
  if (!props.ultimaAtualizacao) return "";

  const segundos = Math.max(
    0,
    Math.floor((agora.value - props.ultimaAtualizacao.getTime()) / 1000),
  );
  if (segundos < 60) return "Atualizado agora";

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Atualizado há ${minutos} min`;

  return `Atualizado às ${props.ultimaAtualizacao.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
});

const titulo = computed(() =>
  props.ultimaAtualizacao
    ? `Última atualização: ${props.ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
    : undefined,
);
</script>

<style scoped>
.pp-refresh-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
}

.pp-refresh-status.is-error {
  color: var(--pp-error);
  opacity: 1;
}

.pp-refresh-status__spin {
  animation: pp-refresh-spin 0.9s linear infinite;
}

@keyframes pp-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pp-refresh-status__spin {
    animation: none;
  }
}
</style>
