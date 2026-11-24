<template>
  <div ref="raiz" class="remote-category">
    <button
      type="button"
      class="remote-category__trigger"
      :aria-label="ariaLabel"
      :aria-required="required || undefined"
      aria-haspopup="listbox"
      :aria-expanded="aberto"
      :aria-controls="aberto ? listId : undefined"
      @click="alternar"
      @keydown.down.prevent="abrir"
      @keydown.esc.prevent="fechar"
    >
      <span>{{ textoSelecionado }}</span>
      <ChevronDown :size="16" aria-hidden="true" :class="{ 'is-open': aberto }" />
    </button>

    <div v-if="aberto" class="remote-category__panel">
      <div class="remote-category__search">
        <Search :size="16" aria-hidden="true" />
        <input
          ref="campoBusca"
          v-model="busca"
          type="search"
          maxlength="100"
          autocomplete="off"
          aria-label="Pesquisar categorias"
          :aria-controls="listId"
          placeholder="Buscar categoria..."
          @keydown.down.prevent="focarPrimeira"
          @keydown.esc.prevent="fechar"
        />
      </div>
      <p v-if="erro" class="remote-category__error" role="alert">
        {{ erro }}
        <button type="button" @click="carregar(false)">Tentar novamente</button>
      </p>
      <p v-else-if="carregando && !paginaDados.results.length" class="remote-category__status" role="status">
        Buscando categorias…
      </p>
      <p v-else-if="!opcoes.length" class="remote-category__status">
        Nenhuma categoria encontrada.
      </p>

      <ul v-if="opcoes.length" :id="listId" ref="lista" role="listbox" :aria-label="ariaLabel" class="remote-category__list">
        <li
          v-for="(opcao, indice) in opcoes"
          :key="String(opcao.id)"
          role="option"
          tabindex="0"
          :aria-selected="String(opcao.id) === String(modelValue)"
          @click="escolher(opcao)"
          @keydown="tecladoOpcao($event, indice, opcao)"
        >
          {{ opcao.nome }}
          <Check v-if="String(opcao.id) === String(modelValue)" :size="15" aria-hidden="true" />
        </li>
      </ul>
      <button
        v-if="paginaDados.next && !erro"
        type="button"
        class="remote-category__more"
        :disabled="carregando"
        @click="carregar(true)"
      >{{ carregando ? "Carregando…" : "Mostrar mais categorias" }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { Check, ChevronDown, Search } from "lucide-vue-next";
import adminService from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  ariaLabel: { type: String, required: true },
  placeholder: { type: String, default: "Selecione uma categoria" },
  incluirTodas: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
const raiz = ref(null), campoBusca = ref(null), lista = ref(null);
const aberto = ref(false), busca = ref(""), carregando = ref(false), erro = ref("");
const paginaVazia = () => ({ page: 1, count: 0, next: null, results: [] });
const paginaDados = ref(paginaVazia());
const nomeSelecionado = ref("");
const listId = useId();
let sequencia = 0, nomeGeracao = 0, timerBusca = null;
let ativo = true;

const opcoes = computed(() => [
  ...(props.incluirTodas ? [{ id: "", nome: "Todas as categorias" }] : []),
  ...paginaDados.value.results,
]);
const textoSelecionado = computed(() =>
  String(props.modelValue) === ""
    ? (props.incluirTodas ? "Todas as categorias" : props.placeholder)
    : nomeSelecionado.value || `Categoria #${props.modelValue}`
);

async function obterRotulo(id) {
  const chamada = ++nomeGeracao;
  if (String(id) === "") { nomeSelecionado.value = ""; return; }
  const local = paginaDados.value.results.find(item => String(item.id) === String(id));
  if (local) { nomeSelecionado.value = local.nome; return; }
  try {
    const item = await adminService.obterCategoria(id);
    if (!ativo || chamada !== nomeGeracao || String(props.modelValue) !== String(id)) return;
    nomeSelecionado.value = item?.nome || `Categoria #${id}`;
  } catch {
    if (ativo && chamada === nomeGeracao && String(props.modelValue) === String(id)) {
      nomeSelecionado.value = `Categoria #${id}`;
    }
  }
}
watch(() => props.modelValue, id => { void obterRotulo(id); }, { immediate: true });

async function carregar(mais = false) {
  if (mais && (!paginaDados.value.next || carregando.value)) return;
  const chamada = ++sequencia, sessao = getSessionVersion();
  const pagina = mais ? paginaDados.value.page + 1 : 1;
  carregando.value = true;
  erro.value = "";
  try {
    const dados = await adminService.listarCategoriasAdminPagina({
      page: pagina, page_size: 25, busca: busca.value.trim(), situacao: "",
    });
    if (chamada !== sequencia || getSessionVersion() !== sessao || !ativo || !aberto.value) return;
    const anteriores = mais ? paginaDados.value.results : [];
    const ids = new Set(anteriores.map(item => String(item.id)));
    paginaDados.value = {
      ...dados,
      results: [...anteriores, ...dados.results.filter(item => !ids.has(String(item.id)))],
    };
    const selecionado = paginaDados.value.results.find(item => String(item.id) === String(props.modelValue));
    if (selecionado) nomeSelecionado.value = selecionado.nome;
  } catch {
    if (chamada === sequencia && getSessionVersion() === sessao && ativo && aberto.value) {
      erro.value = "Não foi possível buscar categorias.";
    }
  } finally {
    if (chamada === sequencia) carregando.value = false;
  }
}
function abrir() {
  if (aberto.value) return;
  aberto.value = true;
  busca.value = "";
  paginaDados.value = paginaVazia();
  void carregar(false);
  nextTick(() => campoBusca.value?.focus());
}
function fechar() {
  aberto.value = false;
  sequencia++;
  clearTimeout(timerBusca);
}
function alternar() { aberto.value ? fechar() : abrir(); }
function escolher(opcao) {
  nomeSelecionado.value = opcao.nome;
  emit("update:modelValue", String(opcao.id));
  fechar();
}
function focarPrimeira() { lista.value?.querySelector('[role="option"]')?.focus(); }
function tecladoOpcao(event, indice, opcao) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault(); escolher(opcao); return;
  }
  if (event.key === "Escape") {
    event.preventDefault(); fechar(); return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const itens = Array.from(lista.value?.querySelectorAll('[role="option"]') || []);
  const destino = Math.max(0, Math.min(itens.length - 1, indice + (event.key === "ArrowDown" ? 1 : -1)));
  itens[destino]?.focus();
}
watch(busca, () => {
  if (!aberto.value) return;
  clearTimeout(timerBusca);
  sequencia++;
  timerBusca = setTimeout(() => { void carregar(false); }, 280);
});
function fora(event) { if (!raiz.value?.contains(event.target)) fechar(); }
onMounted(() => { document.addEventListener("pointerdown", fora); });
onBeforeUnmount(() => {
  ativo = false; sequencia++; nomeGeracao++;
  clearTimeout(timerBusca);
  document.removeEventListener("pointerdown", fora);
});
</script>

<style scoped>
.remote-category{position:relative;min-width:0;width:100%}
.remote-category__trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:46px;padding:0 14px;border:1px solid var(--pp-admin-border);border-radius:11px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.remote-category__trigger:hover,.remote-category__trigger[aria-expanded="true"]{border-color:var(--pp-admin-accent)}
.remote-category__trigger:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:2px}
.remote-category__trigger span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.remote-category__trigger svg{flex:none;color:var(--pp-admin-accent);transition:transform 160ms ease}
.remote-category__trigger svg.is-open{transform:rotate(180deg)}
.remote-category__panel{position:absolute;top:calc(100% + 7px);left:0;z-index:80;width:max(100%,240px);max-width:min(350px,calc(100vw - 40px));padding:9px;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-admin-surface);box-shadow:0 18px 38px color-mix(in srgb,var(--pp-marrom) 16%,transparent)}
.remote-category__search{display:flex;align-items:center;gap:8px;min-height:41px;border:1px solid var(--pp-admin-border);border-radius:8px;padding:0 10px;color:var(--pp-admin-muted)}
.remote-category__search:focus-within{border-color:var(--pp-admin-accent)}
.remote-category__search input{min-width:0;flex:1;border:0;background:transparent;outline:none;font:inherit;font-size:13px;color:var(--pp-admin-text);height:40px;padding:0}
.remote-category__list{list-style:none;margin:8px 0 0;padding:0;max-height:280px;overflow-y:auto}
.remote-category__list li{display:flex;justify-content:space-between;align-items:center;min-height:40px;gap:9px;padding:8px 11px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--pp-admin-text)}
.remote-category__list li:hover,.remote-category__list li:focus-visible{outline:none;background:var(--pp-creme-2)}
.remote-category__list li[aria-selected="true"]{background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent);font-weight:650}
.remote-category__list li[aria-selected="true"]:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:-2px}
.remote-category__list svg{flex:none}
.remote-category__status,.remote-category__error{margin:10px 3px;font-size:12px;color:var(--pp-admin-muted);line-height:1.5}
.remote-category__error{color:var(--pp-admin-danger)}
.remote-category__error button{display:block;margin-top:8px;border:1px solid currentColor;border-radius:7px;padding:6px 9px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.remote-category__more{width:100%;min-height:38px;margin-top:5px;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-creme-2);color:var(--pp-admin-accent);font:inherit;font-size:12px;font-weight:650;cursor:pointer}
.remote-category__more:disabled{opacity:.6}
@media(max-width:680px){.remote-category__panel{width:100%;max-width:none}}
@media(prefers-reduced-motion:reduce){.remote-category__trigger svg{transition:none}}
</style>
