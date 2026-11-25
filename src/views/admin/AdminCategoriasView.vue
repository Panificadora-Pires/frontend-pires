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
        <CardActionContent
          ><Plus :size="17" aria-hidden="true" /> Nova
          categoria</CardActionContent
        >
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
          <p>
            {{
              inicializado
                ? dadosPagina.count +
                  (dadosPagina.count === 1
                    ? " categoria encontrada"
                    : " categorias encontradas")
                : "Organize a apresentação das categorias."
            }}
          </p>
        </div>
      </header>

      <div class="categories-toolbar">
        <div class="categories-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            maxlength="100"
            aria-label="Buscar categorias"
            placeholder="Buscar por nome, descrição ou identificador"
          />
          <button
            v-if="busca"
            type="button"
            class="categories-clear"
            aria-label="Limpar busca"
            @click="busca = ''"
          >
            <X :size="16" aria-hidden="true" />
          </button>
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

      <div
        v-if="!inicializado && !erroExibido"
        class="categories-state"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle :size="22" class="categories-spin" aria-hidden="true" />
        Carregando categorias…
      </div>
      <div
        v-else-if="inicializado && !indicadores.total"
        class="categories-state"
      >
        <Layers3 :size="28" aria-hidden="true" />
        <strong>Seu cardápio ainda não tem categorias</strong>
        <span>Crie uma categoria para começar a organizar os produtos.</span>
        <button
          type="button"
          class="categories-empty-action"
          @click="abrirNovaCategoria"
        >
          Criar categoria
        </button>
      </div>
      <div
        v-else-if="inicializado && !dadosPagina.count"
        class="categories-state"
      >
        <SearchX :size="28" aria-hidden="true" />
        <strong>Nenhuma categoria corresponde aos filtros</strong>
        <span>Experimente outra busca ou situação.</span>
        <button
          type="button"
          class="categories-empty-action"
          @click="limparFiltros"
        >
          Limpar filtros
        </button>
      </div>

      <template v-if="inicializado && visiveis.length">
        <div class="categories-columns" aria-hidden="true">
          <span>Categoria</span>
          <span>Ordem</span>
          <span>Situação</span>
          <span class="categories-actions-label">Ações</span>
        </div>
        <ul class="categories-list">
          <li
            v-for="categoriaItem in visiveis"
            :key="categoriaItem.id"
            class="categories-item"
          >
            <div class="categories-identity">
              <span class="categories-identity-icon" aria-hidden="true"
                ><Layers3 :size="20"
              /></span>
              <div>
                <strong>{{ categoriaItem.nome }}</strong>
                <p>
                  {{ categoriaItem.descricao || "Sem descrição cadastrada" }}
                </p>
                <small v-if="categoriaItem.slug">{{
                  categoriaItem.slug
                }}</small>
              </div>
            </div>
            <div class="categories-order">
              <span class="categories-mobile-label">Ordem</span>
              <strong>{{ categoriaItem.ordem }}</strong>
            </div>
            <div class="categories-state-cell">
              <span class="categories-mobile-label">Situação</span>
              <span
                class="categories-status"
                :class="{ 'is-inactive': !categoriaItem.ativa }"
              >
                <span class="categories-status-dot" aria-hidden="true"></span>
                {{ categoriaItem.ativa ? "Ativa" : "Inativa" }}
              </span>
            </div>
            <div class="categories-actions">
              <button
                type="button"
                class="categories-edit pp-card-action pp-admin-action--secondary"
                data-card-action-radius
                :aria-label="'Editar ' + categoriaItem.nome"
                @click="abrirEdicao(categoriaItem)"
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
        </ul>
      </template>
      <footer
        v-if="inicializado && indicadores.total"
        class="categories-panel-footer"
      >
        <span
          >Exibindo {{ (dadosPagina.page - 1) * dadosPagina.page_size + 1 }}–{{
            (dadosPagina.page - 1) * dadosPagina.page_size + visiveis.length
          }}
          de {{ dadosPagina.count }}. A ordem define a apresentação no
          cardápio.</span
        >
        <nav
          v-if="dadosPagina.total_pages > 1"
          class="categories-pagination"
          aria-label="Paginação de categorias"
        >
          <button
            type="button"
            :disabled="
              dadosPagina.page <= 1 || carregando || Boolean(erroLeitura)
            "
            @click="mudarPagina(-1)"
          >
            <ChevronLeft :size="16" aria-hidden="true" />Anterior
          </button>
          <span
            >Página {{ dadosPagina.page }} de
            {{ dadosPagina.total_pages }}</span
          >
          <button
            type="button"
            :disabled="
              dadosPagina.page >= dadosPagina.total_pages ||
              carregando ||
              Boolean(erroLeitura)
            "
            @click="mudarPagina(1)"
          >
            Próxima<ChevronRight :size="16" aria-hidden="true" />
          </button>
        </nav>
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
            <h2 id="categories-dialog-title">
              {{ form.id ? "Editar categoria" : "Nova categoria" }}
            </h2>
            <p>
              Configure como esta categoria aparece na organização do cardápio.
            </p>
          </div>
          <button
            type="button"
            class="categories-dialog-close"
            :disabled="salvando"
            aria-label="Fechar formulário"
            @click="fecharDialog"
          >
            <X :size="19" aria-hidden="true" />
          </button>
        </header>

        <div class="categories-dialog-body">
          <label class="categories-field">
            <span>Nome da categoria <em>*</em></span>
            <input
              ref="nomeRef"
              v-model.trim="form.nome"
              required
              maxlength="100"
              autocomplete="off"
              placeholder="Ex.: Salgados"
            />
          </label>
          <label class="categories-field">
            <span>Descrição</span>
            <textarea
              v-model.trim="form.descricao"
              maxlength="255"
              rows="3"
              placeholder="Descreva brevemente os produtos desta categoria."
            ></textarea>
            <small>Opcional. Até 255 caracteres.</small>
          </label>
          <label class="categories-field">
            <span>Ordem de exibição <em>*</em></span>
            <input
              v-model.number="form.ordem"
              type="number"
              required
              min="0"
              max="2147483647"
              step="1"
            />
            <small
              >Valores menores aparecem primeiro. Categorias com a mesma ordem
              são organizadas pelo nome.</small
            >
          </label>
          <label class="categories-visibility">
            <input v-model="form.ativa" type="checkbox" />
            <span
              ><strong>Categoria ativa</strong
              ><small
                >Controla a situação desta categoria no cardápio.</small
              ></span
            >
          </label>
          <p v-if="!form.ativa" class="categories-inactive-note">
            <Info :size="16" aria-hidden="true" />
            Você está marcando esta categoria como inativa. Os produtos
            vinculados continuam cadastrados.
          </p>
          <p v-if="erroSalvar" class="categories-form-error" role="alert">
            <CircleAlert :size="16" aria-hidden="true" /> {{ erroSalvar }}
          </p>
        </div>

        <footer class="categories-dialog-actions">
          <button
            type="button"
            class="categories-cancel pp-card-action pp-admin-action--cancel"
            data-card-action-radius
            :disabled="salvando"
            @click="fecharDialog"
          >
            <CardActionContent>Cancelar</CardActionContent>
          </button>
          <button
            type="submit"
            class="categories-save pp-card-action pp-admin-action--primary"
            data-card-action-radius
            :disabled="salvando"
          >
            <CardActionContent>
              <LoaderCircle
                v-if="salvando"
                :size="17"
                class="categories-spin"
                aria-hidden="true"
              />
              <Check v-else :size="17" aria-hidden="true" />
              {{
                salvando
                  ? "Salvando…"
                  : form.id
                    ? "Salvar alterações"
                    : "Criar categoria"
              }}
            </CardActionContent>
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Info,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  SearchX,
  X,
} from "lucide-vue-next";

import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

const dadosPagina = ref({
  count: 0,
  page: 1,
  page_size: 18,
  total_pages: 1,
  results: [],
});
const resumo = ref(null);
const inicializado = ref(false);
const pagina = ref(1);
const carregando = ref(false);
const PAGE_SIZE = 18;
let timerFiltros = null;
const erroLeitura = ref("");
const mensagemSucesso = ref("");
const busca = ref("");
const situacao = ref("");
const salvando = ref(false);
const erroSalvar = ref("");
const dialogRef = ref(null);
const nomeRef = ref(null);
const form = reactive({
  id: null,
  nome: "",
  descricao: "",
  ordem: 0,
  ativa: true,
});
let sequencia = 0;
let focoAnterior = null;

const opcoesSituacao = [
  { label: "Todas as situações", value: "" },
  { label: "Ativas", value: "ativa" },
  { label: "Inativas", value: "inativa" },
];
const indicadores = computed(
  () => resumo.value || { total: 0, ativas: 0, inativas: 0 },
);
const visiveis = computed(() => dadosPagina.value.results);
const erroExibido = computed(() => erroLeitura.value);

function parametros() {
  return {
    page: pagina.value,
    page_size: PAGE_SIZE,
    busca: busca.value.trim(),
    situacao: situacao.value,
  };
}
async function carregar() {
  const chamada = ++sequencia;
  const sessao = getSessionVersion();
  carregando.value = true;
  try {
    const [dados, totais] = await Promise.all([
      adminService.listarCategoriasAdminPagina(parametros()),
      adminService.resumoCategoriasAdmin(),
    ]);
    if (chamada !== sequencia || sessao !== getSessionVersion()) return;
    dadosPagina.value = dados;
    resumo.value = totais;
    inicializado.value = true;
    erroLeitura.value = "";
  } catch (error) {
    if (chamada !== sequencia || sessao !== getSessionVersion()) return;
    if (pagina.value > 1 && error?.response?.status === 404) {
      pagina.value = 1;
      return carregar();
    }
    erroLeitura.value = inicializado.value
      ? "Não foi possível atualizar as categorias. A última consulta válida foi preservada."
      : "Não foi possível carregar as categorias.";
    throw error;
  } finally {
    if (chamada === sequencia && sessao === getSessionVersion())
      carregando.value = false;
  }
}
function mudarPagina(deslocamento) {
  if (carregando.value) return;
  const proxima = dadosPagina.value.page + deslocamento;
  if (proxima < 1 || proxima > dadosPagina.value.total_pages) return;
  pagina.value = proxima;
  void carregar().catch(() => {});
}
watch([busca, situacao], () => {
  pagina.value = 1;
  clearTimeout(timerFiltros);
  timerFiltros = setTimeout(() => {
    void carregar().catch(() => {});
  }, 300);
});
const { atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });

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
function abrirNovaCategoria() {
  abrirFormulario(null);
}
function abrirEdicao(item) {
  abrirFormulario(item);
}
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
    if (!editando) pagina.value = 1;
    dialogRef.value?.close();
    mensagemSucesso.value = editando
      ? "Categoria atualizada com sucesso."
      : "Categoria criada com sucesso.";
    await carregar().catch(() => {});
  } catch (error) {
    erroSalvar.value = mensagemErroApi(
      error,
      "Não foi possível salvar a categoria.",
    );
  } finally {
    salvando.value = false;
  }
}
onBeforeUnmount(() => {
  sequencia++;
  clearTimeout(timerFiltros);
  focoAnterior = null;
  dialogRef.value?.close();
});
</script>

<style scoped src="./AdminCategoriasView.css"></style>
