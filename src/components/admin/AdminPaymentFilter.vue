<template>
  <div ref="raiz" class="payment-filter" @focusout="aoPerderFoco">
    <button
      ref="gatilho"
      type="button"
      class="payment-filter__trigger"
      aria-label="Filtrar por pagamento"
      aria-haspopup="listbox"
      :aria-expanded="aberto"
      :aria-controls="listaId"
      @click="alternar"
      @keydown="tecladoGatilho"
    >
      <span>{{ opcaoSelecionada.label }}</span>
      <ChevronDown
        :size="16"
        class="payment-filter__chevron"
        :class="{ 'is-open': aberto }"
        aria-hidden="true"
      />
    </button>
    <Transition name="payment-menu">
      <ul
        v-if="aberto"
        :id="listaId"
        ref="lista"
        role="listbox"
        class="payment-filter__options"
        aria-label="Status do pagamento"
      >
        <li
          v-for="(opcao, indice) in opcoes"
          :key="opcao.valor"
          role="option"
          tabindex="-1"
          class="payment-filter__option"
          :aria-selected="modelValue === opcao.valor"
          @click="selecionar(opcao.valor)"
          @keydown="tecladoOpcao($event, indice)"
        >
          <span>{{ opcao.label }}</span>
          <Check
            v-if="modelValue === opcao.valor"
            :size="15"
            aria-hidden="true"
          />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
} from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const opcoes = [
  { valor: "", label: "Todos os pagamentos" },
  { valor: "pendente", label: "Pendente" },
  { valor: "processando", label: "Processando" },
  { valor: "aprovado", label: "Aprovado" },
  { valor: "recusado", label: "Recusado" },
  { valor: "cancelado", label: "Cancelado" },
  { valor: "reembolsado", label: "Reembolsado" },
  { valor: "erro", label: "Erro" },
];
const listaId = useId();
const aberto = ref(false);
const raiz = ref(null);
const gatilho = ref(null);
const lista = ref(null);
const opcaoSelecionada = computed(
  () => opcoes.find((opcao) => opcao.valor === props.modelValue) || opcoes[0],
);

function focarOpcao(indice) {
  const elementos = lista.value?.querySelectorAll('[role="option"]');
  elementos?.[indice]?.focus();
}

function abrir(
  indice = opcoes.findIndex((opcao) => opcao.valor === props.modelValue),
) {
  aberto.value = true;
  nextTick(() => focarOpcao(Math.max(indice, 0)));
}

function alternar() {
  if (aberto.value) aberto.value = false;
  else abrir();
}

function selecionar(valor) {
  emit("update:modelValue", valor);
  aberto.value = false;
  nextTick(() => gatilho.value?.focus());
}

function tecladoGatilho(event) {
  if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
  event.preventDefault();
  if (aberto.value) return;
  const indice = opcoes.findIndex((opcao) => opcao.valor === props.modelValue);
  abrir(event.key === "ArrowUp" ? Math.max(0, indice - 1) : indice);
}

function tecladoOpcao(event, indice) {
  let proximo = null;
  if (event.key === "ArrowDown") proximo = (indice + 1) % opcoes.length;
  else if (event.key === "ArrowUp")
    proximo = (indice - 1 + opcoes.length) % opcoes.length;
  else if (event.key === "Home") proximo = 0;
  else if (event.key === "End") proximo = opcoes.length - 1;

  if (proximo !== null) {
    event.preventDefault();
    focarOpcao(proximo);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selecionar(opcoes[indice].valor);
  } else if (event.key === "Escape") {
    event.preventDefault();
    aberto.value = false;
    nextTick(() => gatilho.value?.focus());
  }
}

function aoPerderFoco(event) {
  if (!raiz.value?.contains(event.relatedTarget)) aberto.value = false;
}

function aoClicarFora(event) {
  if (!raiz.value?.contains(event.target)) aberto.value = false;
}

onMounted(() => document.addEventListener("pointerdown", aoClicarFora));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", aoClicarFora),
);
</script>

<style scoped>
.payment-filter {
  position: relative;
  display: flex;
  min-width: 194px;
}
.payment-filter__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid var(--pp-admin-border);
  border-radius: 11px;
  background: var(--pp-admin-surface);
  color: var(--pp-admin-text);
  box-shadow: 0 2px 10px rgba(53, 27, 10, 0.025);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 220ms ease,
    background-color 220ms ease,
    box-shadow 250ms ease;
}
.payment-filter__trigger:hover,
.payment-filter__trigger[aria-expanded="true"] {
  border-color: var(--pp-admin-accent);
  background: var(--pp-admin-surface);
}
.payment-filter__trigger:focus-visible {
  outline: 2px solid var(--pp-admin-accent);
  outline-offset: 3px;
}
.payment-filter__chevron {
  flex: none;
  color: var(--pp-admin-accent);
  transition: transform 200ms ease;
}
.payment-filter__chevron.is-open {
  transform: rotate(180deg);
}
.payment-filter__options {
  position: absolute;
  z-index: 70;
  top: calc(100% + 8px);
  right: 0;
  width: max(100%, 220px);
  max-height: min(380px, 60vh);
  overflow-y: auto;
  padding: 6px;
  margin: 0;
  list-style: none;
  border: 1px solid var(--pp-admin-border);
  border-radius: 12px;
  background: var(--pp-admin-surface);
  color: var(--pp-admin-text);
  box-shadow: 0 16px 38px rgba(49, 27, 13, 0.14);
}
.payment-filter__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 39px;
  padding: 9px 11px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.payment-filter__option:hover,
.payment-filter__option:focus-visible {
  background: var(--pp-creme-2);
}
.payment-filter__option[aria-selected="true"] {
  background: var(--pp-admin-warning-bg);
  color: var(--pp-admin-accent);
  font-weight: 650;
}
.payment-filter__option[aria-selected="true"]:focus-visible {
  outline: 2px solid var(--pp-admin-accent);
  outline-offset: -2px;
}
.payment-filter__option svg {
  flex: none;
}
.payment-menu-enter-active,
.payment-menu-leave-active {
  transition:
    opacity 140ms ease,
    transform 170ms ease;
}
.payment-menu-enter-from,
.payment-menu-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
@media (max-width: 820px) {
  .payment-filter {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .payment-filter__trigger,
  .payment-filter__chevron,
  .payment-menu-enter-active,
  .payment-menu-leave-active {
    transition: none;
  }
}
</style>
