<template>
  <div ref="raiz" class="catalog-select" @focusout="aoPerderFoco">
    <button
      ref="gatilho"
      type="button"
      class="catalog-select__trigger"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="aberto"
      :aria-controls="listId"
      @click="alternar"
      @keydown="tecladoGatilho"
    >
      <span>{{ selecionado.label }}</span>
      <ChevronDown :size="16" aria-hidden="true" :class="{ aberto }" />
    </button>
    <Transition name="catalog-options">
      <ul v-if="aberto" :id="listId" ref="lista" class="catalog-select__list" role="listbox" :aria-label="ariaLabel">
        <li
          v-for="(opcao, indice) in options"
          :key="opcao.value"
          class="catalog-select__option"
          role="option"
          tabindex="-1"
          :aria-selected="String(opcao.value) === String(modelValue)"
          @click="escolher(opcao.value)"
          @keydown="tecladoOpcao($event, indice)"
        >
          {{ opcao.label }}
          <Check v-if="String(opcao.value) === String(modelValue)" :size="15" aria-hidden="true" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  options: { type: Array, required: true },
  ariaLabel: { type: String, required: true },
});
const emit = defineEmits(["update:modelValue"]);
const aberto = ref(false);
const raiz = ref(null);
const gatilho = ref(null);
const lista = ref(null);
const listId = useId();
const selecionado = computed(() =>
  props.options.find(opcao => String(opcao.value) === String(props.modelValue)) ||
  props.options[0] || { label: "Selecione" },
);
function indiceAtual() {
  return Math.max(0, props.options.findIndex(opcao => String(opcao.value) === String(props.modelValue)));
}
function focar(indice) {
  lista.value?.querySelectorAll('[role="option"]')?.[indice]?.focus();
}
function abrir(indice = indiceAtual()) {
  if (!props.options.length) return;
  aberto.value = true;
  nextTick(() => focar(indice));
}
function alternar() {
  if (aberto.value) aberto.value = false;
  else abrir();
}
function escolher(value) {
  emit("update:modelValue", value);
  aberto.value = false;
  nextTick(() => gatilho.value?.focus());
}
function tecladoGatilho(event) {
  if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  abrir(event.key === "ArrowUp" ? Math.max(0, indiceAtual() - 1) : indiceAtual());
}
function tecladoOpcao(event, indice) {
  const n = props.options.length;
  if (!n) return;
  const proximo = event.key === "ArrowDown" ? (indice + 1) % n
    : event.key === "ArrowUp" ? (indice - 1 + n) % n
      : event.key === "Home" ? 0
        : event.key === "End" ? n - 1 : null;
  if (proximo !== null) {
    event.preventDefault();
    focar(proximo);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    escolher(props.options[indice].value);
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
onBeforeUnmount(() => document.removeEventListener("pointerdown", aoClicarFora));
</script>

<style scoped>
.catalog-select{position:relative;min-width:180px;max-width:100%}
.catalog-select__trigger{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:46px;padding:0 14px;border:1px solid var(--pp-admin-border);border-radius:11px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:13px;cursor:pointer;transition:border-color 200ms ease,box-shadow 200ms ease}
.catalog-select__trigger:hover,.catalog-select__trigger[aria-expanded="true"]{border-color:var(--pp-admin-accent)}
.catalog-select__trigger:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:3px}
.catalog-select__trigger svg{flex:none;color:var(--pp-admin-accent);transition:transform 180ms ease}
.catalog-select__trigger svg.aberto{transform:rotate(180deg)}
.catalog-select__list{position:absolute;top:calc(100% + 7px);left:0;z-index:70;width:max(100%,230px);max-width:min(310px,calc(100vw - 40px));max-height:min(350px,65vh);overflow:auto;padding:6px;margin:0;list-style:none;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-admin-surface);box-shadow:0 18px 38px color-mix(in srgb,var(--pp-marrom) 17%,transparent)}
.catalog-select__option{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:40px;padding:9px 11px;border-radius:8px;font-size:13px;color:var(--pp-admin-text);cursor:pointer;outline:none}
.catalog-select__option:hover,.catalog-select__option:focus-visible{background:var(--pp-creme-2)}
.catalog-select__option[aria-selected="true"]{background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent);font-weight:650}
.catalog-select__option[aria-selected="true"]:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:-2px}
.catalog-select__option svg{flex:none}
.catalog-options-enter-active,.catalog-options-leave-active{transition:opacity 140ms ease,transform 170ms ease}
.catalog-options-enter-from,.catalog-options-leave-to{opacity:0;transform:translateY(-5px)}
@media(max-width:767px){.catalog-select{min-width:0;width:100%}.catalog-select__list{width:100%}}
@media(prefers-reduced-motion:reduce){.catalog-select__trigger,.catalog-select__trigger svg,.catalog-options-enter-active,.catalog-options-leave-active{transition:none}}
</style>
