<template>
  <section class="admin-page categories-page">
    <header class="categories-header">
      <div>
        <h1>Categorias</h1>
        <p>Organize os grupos do cardápio e defina a ordem de exibição.</p>
      </div>
      <button
        type="button"
        class="categories-create pp-card-action pp-admin-action--primary"
        data-card-action-radius
        @click="abrirNovaCategoria"
      >
        <CardActionContent><Plus :size="17" aria-hidden="true" /> Nova categoria</CardActionContent>
      </button>
    </header>

    <section class="categories-metrics" aria-label="Resumo das categorias">
      <div class="categories-metric">
        <span>Total de categorias</span>
        <strong>{{ inicializado ? indicadores.total : "—" }}</strong>
        <small>Grupos cadastrados</small>
      </div>
      <div class="categories-metric">
        <span>Ativas</span>
        <strong>{{ inicializado ? indicadores.ativas : "—" }}</strong>
        <small>Marcadas como disponíveis</small>
      </div>
      <div class="categories-metric">
        <span>Inativas</span>
        <strong>{{ inicializado ? indicadores.inativas : "—" }}</strong>
        <small>Desativadas no cadastro</small>
      </div>
    </section>

    <section class="categories-panel" aria-labelledby="categories-title">
      <header class="categories-panel-header">
        <div>
          <h2 id="categories-title">Estrutura do cardápio</h2>
          <p>{{ inicializado ? visiveis.length + (visiveis.length === 1 ? " categoria encontrada" : " categorias encontradas") : "Organize a apresentação das categorias." }}</p>
        </div>
      </header>

      <div class="categories-toolbar">
        <div class="categories-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input v-model="busca" type="search" maxlength="100"
            aria-label="Buscar categorias" placeholder="Buscar por nome, descrição ou identificador" />
          <button v-if="busca" type="button" class="categories-clear"
            aria-label="Limpar busca" @click="busca = ''"><X :size="16" aria-hidden="true" /></button>
        </div>
        <AdminCatalogSelect
          v-model="situacao"
          class="categories-filter"
          aria-label="Filtrar situação das categorias"
          :options="opcoesSituacao"
        />
      </div>

      <div v-if="erroExibido" class="categories-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ erroExibido }}</span>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-if="mensagemSucesso" class="categories-success" role="status">
        <CheckCircle2 :size="17" aria-hidden="true" />{{ mensagemSucesso }}
      </div>

      <div v-if="!inicializado && !erroExibido" class="categories-state" role="status" aria-live="polite">
        <LoaderCircle :size="22" class="categories-spin" aria-hidden="true" />
        Carregando categorias…
      </div>
      <div v-else-if="inicializado && !categorias.length" class="categories-state">
        <Layers3 :size="28" aria-hidden="true" />
        <strong>Seu cardápio ainda não tem categorias</strong>
        <span>Crie uma categoria para começar a organizar os produtos.</span>
        <button type="button" class="categories-empty-action" @click="abrirNovaCategoria">Criar categoria</button>
      </div>
      <div v-else-if="inicializado && !visiveis.length" class="categories-state">
        <SearchX :size="28" aria-hidden="true" />
        <strong>Nenhuma categoria corresponde aos filtros</strong>
        <span>Experimente outra busca ou situação.</span>
        <button type="button" class="categories-empty-action" @click="limparFiltros">Limpar filtros</button>
      </div>

      <template v-if="inicializado && visiveis.length">
        <div class="categories-columns" aria-hidden="true">
          <span>Categoria</span>
          <span>Ordem</span>
          <span>Situação</span>
          <span class="categories-actions-label">Ações</span>
        </div>
        <ul class="categories-list">
          <li v-for="categoriaItem in visiveis" :key="categoriaItem.id" class="categories-item">
            <div class="categories-identity">
              <span class="categories-identity-icon" aria-hidden="true"><Layers3 :size="20" /></span>
              <div>
                <strong>{{ categoriaItem.nome }}</strong>
                <p>{{ categoriaItem.descricao || "Sem descrição cadastrada" }}</p>
                <small v-if="categoriaItem.slug">{{ categoriaItem.slug }}</small>
              </div>
            </div>
            <div class="categories-order">
              <span class="categories-mobile-label">Ordem</span>
              <strong>{{ categoriaItem.ordem }}</strong>
            </div>
            <div class="categories-state-cell">
              <span class="categories-mobile-label">Situação</span>
              <span class="categories-status" :class="{ 'is-inactive': !categoriaItem.ativa }">
                <span class="categories-status-dot" aria-hidden="true"></span>
                {{ categoriaItem.ativa ? "Ativa" : "Inativa" }}
              </span>
            </div>
            <div class="categories-actions">
              <button type="button"
                class="categories-edit pp-card-action pp-admin-action--secondary"
                data-card-action-radius
                :aria-label="'Editar ' + categoriaItem.nome"
                @click="abrirEdicao(categoriaItem)">
                <CardActionContent><Pencil :size="15" aria-hidden="true" />Editar</CardActionContent>
              </button>
            </div>
          </li>
        </ul>
      </template>
      <footer v-if="inicializado && categorias.length" class="categories-panel-footer">
        A ordem define como as categorias são organizadas no cardápio.
      </footer>
    </section>

    <dialog
      ref="dialogRef"
      class="categories-dialog"
      aria-labelledby="categories-dialog-title"
      @cancel="aoCancelarDialog"
      @close="aoFecharDialog"
    >
      <form class="categories-dialog-panel" @submit.prevent="salvar">
        <header class="categories-dialog-header">
          <div>
            <span>ORGANIZAÇÃO DO CARDÁPIO</span>
            <h2 id="categories-dialog-title">{{ form.id ? "Editar categoria" : "Nova categoria" }}</h2>
            <p>Configure como esta categoria aparece na organização do cardápio.</p>
          </div>
          <button type="button" class="categories-dialog-close"
            :disabled="salvando" aria-label="Fechar formulário"
            @click="fecharDialog"><X :size="19" aria-hidden="true" /></button>
        </header>

        <div class="categories-dialog-body">
          <label class="categories-field">
            <span>Nome da categoria <em>*</em></span>
            <input ref="nomeRef" v-model.trim="form.nome" required maxlength="100" autocomplete="off"
              placeholder="Ex.: Salgados" />
          </label>
          <label class="categories-field">
            <span>Descrição</span>
            <textarea v-model.trim="form.descricao" maxlength="255" rows="3"
              placeholder="Descreva brevemente os produtos desta categoria."></textarea>
            <small>Opcional. Até 255 caracteres.</small>
          </label>
          <label class="categories-field">
            <span>Ordem de exibição <em>*</em></span>
            <input v-model.number="form.ordem" type="number" required min="0" max="2147483647" step="1" />
            <small>Valores menores aparecem primeiro. Categorias com a mesma ordem são organizadas pelo nome.</small>
          </label>
          <label class="categories-visibility">
            <input v-model="form.ativa" type="checkbox" />
            <span><strong>Categoria ativa</strong><small>Controla a situação desta categoria no cardápio.</small></span>
          </label>
          <p v-if="!form.ativa" class="categories-inactive-note">
            <Info :size="16" aria-hidden="true" />
            Você está marcando esta categoria como inativa. Os produtos vinculados continuam cadastrados.
          </p>
          <p v-if="erroSalvar" class="categories-form-error" role="alert">
            <CircleAlert :size="16" aria-hidden="true" /> {{ erroSalvar }}
          </p>
        </div>

        <footer class="categories-dialog-actions">
          <button type="button"
            class="categories-cancel pp-card-action pp-admin-action--cancel"
            data-card-action-radius :disabled="salvando" @click="fecharDialog">
            <CardActionContent>Cancelar</CardActionContent>
          </button>
          <button type="submit"
            class="categories-save pp-card-action pp-admin-action--primary"
            data-card-action-radius :disabled="salvando">
            <CardActionContent>
              <LoaderCircle v-if="salvando" :size="17" class="categories-spin" aria-hidden="true" />
              <Check v-else :size="17" aria-hidden="true" />
              {{ salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Criar categoria" }}
            </CardActionContent>
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from "vue";
import { Check, CheckCircle2, CircleAlert, Info, Layers3, LoaderCircle, Pencil, Plus, Search, SearchX, X } from "lucide-vue-next";

import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";
import { filtrarCategoriasAdmin, indicadoresCategorias } from "@/utils/adminCategorias";

const categorias = ref([]);
const inicializado = ref(false);
const erroLeitura = ref("");
const mensagemSucesso = ref("");
const busca = ref("");
const situacao = ref("");
const salvando = ref(false);
const erroSalvar = ref("");
const dialogRef = ref(null);
const nomeRef = ref(null);
const form = reactive({ id: null, nome: "", descricao: "", ordem: 0, ativa: true });
let sequencia = 0;
let focoAnterior = null;

const opcoesSituacao = [
  { label: "Todas as situações", value: "" },
  { label: "Ativas", value: "ativa" },
  { label: "Inativas", value: "inativa" },
];
const indicadores = computed(() => indicadoresCategorias(categorias.value));
const visiveis = computed(() => filtrarCategoriasAdmin(categorias.value, {
  busca: busca.value, situacao: situacao.value,
}));
const erroExibido = computed(() => erroLeitura.value || (erroAtualizacao.value
  ? "Não foi possível sincronizar as categorias. Os dados podem estar desatualizados."
  : ""));

async function carregar() {
  const chamada = ++sequencia;
  const sessao = getSessionVersion();
  try {
    const dados = await adminService.listarCategorias();
    if (chamada !== sequencia || sessao !== getSessionVersion()) return;
    if (!Array.isArray(dados)) throw new Error("Resposta inválida para categorias.");
    categorias.value = dados;
    inicializado.value = true;
    erroLeitura.value = "";
  } catch (error) {
    if (chamada !== sequencia || sessao !== getSessionVersion()) return;
    erroLeitura.value = inicializado.value
      ? "Não foi possível atualizar as categorias. A última lista foi preservada."
      : "Não foi possível carregar as categorias.";
    throw error;
  }
}
const { erro: erroAtualizacao, atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });

function limparFiltros() {
  busca.value = "";
  situacao.value = "";
}
function preencherFormulario(item = null) {
  Object.assign(form, {
    id: item?.id ?? null,
    nome: item?.nome ?? "",
    descricao: item?.descricao ?? "",
    ordem: Number(item?.ordem) || 0,
    ativa: item?.ativa ?? true,
  });
  erroSalvar.value = "";
  mensagemSucesso.value = "";
}
function abrirFormulario(item) {
  if (dialogRef.value?.open) return;
  preencherFormulario(item);
  focoAnterior = document.activeElement;
  dialogRef.value?.showModal();
  nextTick(() => nomeRef.value?.focus());
}
function abrirNovaCategoria() { abrirFormulario(null); }
function abrirEdicao(item) { abrirFormulario(item); }
function fecharDialog() {
  if (salvando.value) return;
  dialogRef.value?.close();
}
function aoCancelarDialog(event) {
  if (salvando.value) event.preventDefault();
}
function aoFecharDialog() {
  erroSalvar.value = "";
  if (focoAnterior?.isConnected && typeof focoAnterior.focus === "function") {
    focoAnterior.focus();
  }
  focoAnterior = null;
}
async function salvar() {
  if (salvando.value) return;
  erroSalvar.value = "";
  salvando.value = true;
  const editando = Boolean(form.id);
  const payload = {
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    ordem: Number(form.ordem),
    ativa: Boolean(form.ativa),
  };
  try {
    if (editando) await adminService.atualizarCategoria(form.id, payload);
    else await adminService.criarCategoria(payload);
    dialogRef.value?.close();
    mensagemSucesso.value = editando ? "Categoria atualizada com sucesso." : "Categoria criada com sucesso.";
    // O envio já foi concluído; uma eventual falha ao reler não repete o cadastro.
    await carregar().catch(() => {});
  } catch (error) {
    erroSalvar.value = mensagemErroApi(error, "Não foi possível salvar a categoria.");
  } finally {
    salvando.value = false;
  }
}
onBeforeUnmount(() => {
  sequencia++;
  focoAnterior = null;
  dialogRef.value?.close();
});
</script>

<style scoped>
.categories-page{color:var(--pp-admin-text)}
.categories-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:23px}
.categories-header h1{font-size:30px;font-weight:650;letter-spacing:-.03em;margin:0 0 6px}
.categories-header p{margin:0;color:var(--pp-admin-muted);font-size:14px;line-height:1.5}
.categories-create,.categories-empty-action,.categories-edit,.categories-save,.categories-cancel{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font:inherit;font-weight:650;text-decoration:none;transition:border-color 200ms ease,box-shadow 200ms ease}
.categories-create{min-height:44px;padding:10px 17px;border:1px solid var(--pp-admin-text);border-radius:10px;background:var(--pp-admin-text);color:var(--pp-admin-bg);white-space:nowrap;font-size:13px}
.categories-create:hover{box-shadow:0 8px 20px color-mix(in srgb,var(--pp-marrom) 14%,transparent)}
.categories-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}
.categories-metric{display:flex;flex-direction:column;gap:4px;padding:18px 20px;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-creme-2);min-width:0}
.categories-metric>span{font-size:12px;color:var(--pp-admin-muted)}
.categories-metric strong{font-size:27px;font-weight:650;line-height:1.2;font-variant-numeric:tabular-nums}
.categories-metric small{color:var(--pp-admin-muted);font-size:12px;line-height:1.5}
.categories-panel{min-width:0;border:1px solid var(--pp-admin-border);border-radius:15px;background:var(--pp-admin-surface);overflow:visible}
.categories-panel-header{padding:20px 22px 16px}
.categories-panel-header h2{font-size:17px;font-weight:650;letter-spacing:-.015em;margin:0}
.categories-panel-header p{font-size:12px;color:var(--pp-admin-muted);margin:5px 0 0}
.categories-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,230px);gap:10px;padding:0 22px 19px}
.categories-search{display:flex;align-items:center;gap:10px;min-width:0;min-height:46px;padding:0 12px;border:1px solid var(--pp-admin-border);border-radius:11px;color:var(--pp-admin-muted);transition:border-color 180ms ease,box-shadow 180ms ease}
.categories-search:hover,.categories-search:focus-within{border-color:var(--pp-admin-accent)}
.categories-search:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--pp-admin-accent) 12%,transparent)}
.categories-search input{flex:1;min-width:0;width:100%;border:0;background:transparent;color:var(--pp-admin-text);min-height:44px;font:inherit;font-size:13px;outline:none}
.categories-search input:focus-visible{outline:none;box-shadow:none}
.categories-clear{display:grid;place-items:center;flex:none;width:30px;height:30px;border:0;border-radius:7px;background:var(--pp-creme-2);color:var(--pp-admin-muted);cursor:pointer}
.categories-clear:hover{background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent)}
.categories-alert,.categories-success{display:flex;align-items:center;gap:10px;padding:13px 22px;border-top:1px solid var(--pp-admin-border);font-size:12px;line-height:1.5}
.categories-alert{color:var(--pp-admin-danger);background:var(--pp-admin-danger-bg)}
.categories-alert span{flex:1}
.categories-alert button{min-height:38px;padding:7px 11px;border:1px solid currentColor;border-radius:7px;background:transparent;color:inherit;font-weight:650;cursor:pointer}
.categories-success{color:var(--pp-admin-success);background:var(--pp-admin-success-bg)}
.categories-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;min-height:205px;padding:25px;text-align:center;font-size:13px;color:var(--pp-admin-muted)}
.categories-state strong{color:var(--pp-admin-text);font-size:14px}
.categories-empty-action{border:1px solid var(--pp-admin-accent);color:var(--pp-admin-accent);border-radius:8px;background:transparent;padding:9px 12px;font-size:12px;margin-top:5px}
.categories-empty-action:hover{background:var(--pp-admin-warning-bg)}
.categories-columns,.categories-item{display:grid;grid-template-columns:minmax(250px,2fr) 95px 125px 120px;gap:16px;align-items:center}
.categories-columns{padding:12px 22px;background:var(--pp-creme-2);border-top:1px solid var(--pp-admin-border);border-bottom:1px solid var(--pp-admin-border);font-size:11px;font-weight:650;color:var(--pp-admin-muted)}
.categories-actions-label{text-align:right}
.categories-list{list-style:none;margin:0;padding:0}
.categories-item{padding:17px 22px;border-bottom:1px solid var(--pp-admin-border);transition:background-color 200ms ease}
.categories-item:last-child{border-bottom:0}
.categories-item:hover{background:color-mix(in srgb,var(--pp-creme-2) 45%,var(--pp-admin-surface))}
.categories-identity{display:flex;align-items:center;gap:12px;min-width:0}
.categories-identity-icon{display:grid;place-items:center;flex:none;width:46px;height:46px;border-radius:11px;background:var(--pp-creme-2);color:var(--pp-admin-accent)}
.categories-identity>div{min-width:0}
.categories-identity strong{display:block;font-size:14px;font-weight:650;line-height:1.4;overflow-wrap:anywhere}
.categories-identity p{font-size:12px;color:var(--pp-admin-muted);margin:3px 0;line-height:1.5;overflow-wrap:anywhere}
.categories-identity small{font-size:11px;color:var(--pp-admin-muted);overflow-wrap:anywhere}
.categories-order strong{display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:7px 8px;background:var(--pp-creme-2);border-radius:8px;font-size:13px;font-weight:650;font-variant-numeric:tabular-nums}
.categories-status{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;border-radius:8px;background:var(--pp-admin-success-bg);font-size:11px;font-weight:650;white-space:nowrap}
.categories-status.is-inactive{background:var(--pp-creme-2);color:var(--pp-admin-muted)}
.categories-status-dot{width:7px;height:7px;border-radius:50%;background:var(--pp-admin-success)}
.categories-status.is-inactive .categories-status-dot{background:var(--pp-admin-muted)}
.categories-actions{display:flex;justify-content:flex-end}
.categories-edit{min-height:39px;padding:9px 13px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:12px}
.categories-edit:hover{border-color:var(--pp-admin-accent)}
.categories-mobile-label{display:none}
.categories-panel-footer{padding:14px 22px;border-top:1px solid var(--pp-admin-border);font-size:12px;color:var(--pp-admin-muted)}
.categories-spin{animation:categories-spin 900ms linear infinite}
@keyframes categories-spin{to{transform:rotate(360deg)}}
.categories-dialog{position:fixed;inset:0;width:min(540px,calc(100vw - 28px));max-width:540px;max-height:min(90dvh,780px);margin:auto;padding:0;border:0;border-radius:16px;background:var(--pp-admin-surface);color:var(--pp-admin-text);box-shadow:0 24px 80px color-mix(in srgb,var(--pp-marrom) 26%,transparent);overflow:auto}
.categories-dialog::backdrop{background:var(--pp-admin-backdrop)}
.categories-dialog[open] .categories-dialog-panel{animation:categories-enter 250ms cubic-bezier(.22,1,.36,1)}
@keyframes categories-enter{from{opacity:0;transform:translateY(12px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
.categories-dialog-panel{margin:0}
.categories-dialog-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:24px 25px 19px;border-bottom:1px solid var(--pp-admin-border)}
.categories-dialog-header>div>span{font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--pp-admin-accent)}
.categories-dialog-header h2{font-size:23px;letter-spacing:-.025em;margin:6px 0}
.categories-dialog-header p{margin:0;font-size:12px;color:var(--pp-admin-muted);line-height:1.5}
.categories-dialog-close{display:grid;place-items:center;flex:none;width:38px;height:38px;background:var(--pp-creme-2);color:var(--pp-admin-muted);border:0;border-radius:9px;cursor:pointer}
.categories-dialog-close:hover{color:var(--pp-admin-text)}
.categories-dialog-body{display:flex;flex-direction:column;gap:17px;padding:21px 25px}
.categories-field{display:flex;flex-direction:column;gap:7px}
.categories-field>span{font-size:12px;font-weight:650}
.categories-field em{font-style:normal;color:var(--pp-admin-accent)}
.categories-field input,.categories-field textarea{width:100%;padding:11px 13px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:13px}
.categories-field input{min-height:44px}
.categories-field textarea{min-height:90px;resize:vertical;line-height:1.55}
.categories-field input:hover,.categories-field textarea:hover{border-color:var(--pp-admin-accent)}
.categories-field input:focus-visible,.categories-field textarea:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:2px}
.categories-field small{font-size:11px;color:var(--pp-admin-muted);line-height:1.5}
.categories-visibility{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid var(--pp-admin-border);border-radius:10px;cursor:pointer}
.categories-visibility input{flex:none;width:17px;height:17px;accent-color:var(--pp-admin-accent)}
.categories-visibility strong,.categories-visibility small{display:block}
.categories-visibility strong{font-size:13px;font-weight:650}
.categories-visibility small{font-size:11px;color:var(--pp-admin-muted);margin-top:3px;line-height:1.5}
.categories-inactive-note,.categories-form-error{display:flex;align-items:flex-start;gap:9px;border-radius:9px;padding:12px;font-size:12px;line-height:1.55;margin:0}
.categories-inactive-note{background:var(--pp-admin-warning-bg);color:var(--pp-admin-text)}
.categories-form-error{background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger)}
.categories-inactive-note svg,.categories-form-error svg{flex:none;margin-top:1px}
.categories-dialog-actions{display:flex;justify-content:flex-end;gap:9px;padding:17px 25px 22px;border-top:1px solid var(--pp-admin-border)}
.categories-cancel,.categories-save{min-height:43px;padding:10px 16px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:12px}
.categories-save{background:var(--pp-admin-text);color:var(--pp-admin-bg);border-color:var(--pp-admin-text)}
.categories-cancel:disabled,.categories-save:disabled{opacity:.55;cursor:wait}
@media(max-width:920px){
  .categories-columns{display:none}
  .categories-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 15px 18px}
  .categories-item{display:grid;grid-template-columns:1fr 1fr;gap:15px;border:1px solid var(--pp-admin-border);border-radius:12px;padding:16px}
  .categories-identity,.categories-actions{grid-column:1/-1}
  .categories-mobile-label{display:block;margin-bottom:5px;color:var(--pp-admin-muted);font-size:11px}
  .categories-actions{justify-content:stretch}
  .categories-edit{width:100%}
}
@media(max-width:680px){
  .categories-header{align-items:stretch;flex-direction:column}
  .categories-create{width:100%}
  .categories-header h1{font-size:27px}
  .categories-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .categories-metric{padding:15px}
  .categories-metric strong{font-size:24px}
  .categories-metric:last-child{grid-column:1/-1}
  .categories-panel-header{padding:18px 16px 14px}
  .categories-toolbar{grid-template-columns:1fr;padding:0 16px 18px}
  .categories-list{grid-template-columns:1fr;padding:0 12px 16px}
  .categories-panel-footer{padding:14px 16px}
  .categories-dialog-header,.categories-dialog-body{padding-left:18px;padding-right:18px}
  .categories-dialog-actions{padding:16px 18px 20px}
  .categories-dialog-actions>button{flex:1;padding:9px}
}
@media(prefers-reduced-motion:reduce){
  .categories-page *{transition:none!important;animation:none!important}
  .categories-dialog[open] .categories-dialog-panel{animation:none}
}
</style>
