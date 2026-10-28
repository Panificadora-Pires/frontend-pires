<template>
  <li
    class="cb-msg"
    :class="{
      'cb-msg--usuario': mensagem.autor === 'usuario',
      'cb-msg--erro': mensagem.erro,
    }"
  >
    <span class="cb-msg__sr">{{ autorLegivel }}:</span>
    <p class="cb-msg__texto">{{ mensagem.texto }}</p>

    <ul v-if="mensagem.pedidos?.length" class="cb-msg__cards">
      <li v-for="pedido in mensagem.pedidos" :key="pedido.id" class="cb-msg__card">
        <Package :size="15" aria-hidden="true" />
        <span class="cb-msg__card-nome">Pedido #{{ pedido.id }}</span>
        <span class="cb-msg__card-info">
          {{ pedido.status_display }} · {{ moeda(pedido.total) }}
        </span>
      </li>
    </ul>

    <ul v-if="mensagem.produtos?.length" class="cb-msg__cards">
      <li
        v-for="produto in mensagem.produtos"
        :key="produto.id"
        class="cb-msg__card"
        :class="{ 'is-esgotado': !produto.disponivel }"
      >
        <CircleCheck v-if="produto.disponivel" :size="15" aria-hidden="true" />
        <CircleSlash v-else :size="15" aria-hidden="true" />
        <span class="cb-msg__card-nome">{{ produto.nome }}</span>
        <span class="cb-msg__card-info">
          {{ moeda(produto.preco) }} ·
          {{ produto.disponivel ? "Disponível" : "Esgotado" }}
        </span>
      </li>
    </ul>

    <button
      v-if="mensagem.erro"
      type="button"
      class="cb-msg__repetir"
      @click="emit('repetir', mensagem.id)"
    >
      <RotateCw :size="13" aria-hidden="true" /> Tentar de novo
    </button>

    <div
      v-if="mostrarAcoes && mensagem.acoes?.length"
      class="cb-msg__acoes"
      role="group"
      aria-label="Próximos passos"
    >
      <button
        v-for="acao in mensagem.acoes"
        :key="chaveAcao(acao)"
        type="button"
        class="cb-msg__acao"
        :class="`cb-msg__acao--${acao.tipo}`"
        @click="emit('acao', acao)"
      >
        <MessageCircle v-if="acao.tipo === 'chat'" :size="14" aria-hidden="true" />
        <ArrowRight v-else-if="acao.tipo === 'rota'" :size="14" aria-hidden="true" />
        {{ acao.rotulo }}
      </button>
    </div>
  </li>
</template>

<script setup>
import { computed } from "vue";
import {
  ArrowRight,
  CircleCheck,
  CircleSlash,
  MessageCircle,
  Package,
  RotateCw,
} from "lucide-vue-next";

const props = defineProps({
  mensagem: { type: Object, required: true },
  // Só a última resposta do assistente mostra os botões de próximo passo.
  mostrarAcoes: { type: Boolean, default: false },
});

const emit = defineEmits(["acao", "repetir"]);

const autorLegivel = computed(() =>
  props.mensagem.autor === "usuario" ? "Você" : "Assistente da Pires",
);

function chaveAcao(acao) {
  return `${acao.tipo}-${acao.valor ?? acao.pedido ?? acao.rota}`;
}

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}
</script>

<style scoped>
.cb-msg {
  max-width: 88%;
  align-self: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--student-border);
  border-radius: 4px var(--student-radius) var(--student-radius) var(--student-radius);
  background: var(--student-surface);
  color: var(--student-text);
}
.cb-msg--usuario {
  align-self: flex-end;
  border-color: var(--student-accent-soft);
  border-radius: var(--student-radius) 4px var(--student-radius) var(--student-radius);
  background: var(--student-accent-soft);
}
.cb-msg--erro {
  border-color: var(--student-danger);
  background: var(--student-danger-soft);
}
.cb-msg__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.cb-msg__texto {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.cb-msg__cards {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.cb-msg__card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 2px 8px;
  padding: 8px 10px;
  border: 1px solid var(--student-border);
  border-radius: var(--student-radius-sm);
  background: var(--student-surface-soft);
  color: var(--student-success);
}
.cb-msg__card.is-esgotado {
  color: var(--student-muted);
}
.cb-msg__card-nome {
  color: var(--student-text);
  font-size: 13px;
  font-weight: 700;
}
.cb-msg__card-info {
  grid-column: 2;
  color: var(--student-muted);
  font-size: 12px;
}
.cb-msg__repetir {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 0 10px;
  border: 1px solid var(--student-border-strong);
  border-radius: var(--student-radius-sm);
  background: var(--student-surface);
  color: var(--student-text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.cb-msg__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.cb-msg__acao {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border: 1px solid var(--student-accent);
  border-radius: var(--pp-radius-full);
  background: var(--student-surface);
  color: var(--student-accent-hover);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}
.cb-msg__acao:hover {
  background: var(--student-accent-soft);
}
.cb-msg__acao--chat {
  border-color: var(--student-accent-hover);
  background: var(--student-accent-hover);
  color: var(--student-surface);
}
.cb-msg__acao--chat:hover {
  background: var(--student-accent);
}
</style>
