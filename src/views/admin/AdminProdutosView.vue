<template>
  <section class="admin-page pp-catalog">
    <header class="catalog-header">
      <div>
        <span class="catalog-eyebrow">CATÁLOGO / GESTÃO</span>
        <h1>Produtos</h1>
        <p>Preços, estoque e disponibilidade do cardápio em um só lugar.</p>
      </div>
      <RouterLink :to="{ name: 'admin-produto-novo' }" class="catalog-create">
        <Plus :size="17" aria-hidden="true" /> Novo produto
      </RouterLink>
    </header>

    <section class="catalog-metrics" aria-label="Resumo do catálogo">
      <div v-for="metrica in metricas" :key="metrica.label" class="catalog-metric">
        <span>{{ metrica.label }}</span>
        <strong>{{ resumo ? resumo[metrica.campo] : '—' }}</strong>
        <small>{{ metrica.descricao }}</small>
      </div>
    </section>

    <section class="catalog-panel" aria-labelledby="catalog-list-title">
      <header class="catalog-panel-header">
        <div>
          <h2 id="catalog-list-title">Catálogo de produtos</h2>
          <p v-if="inicializado">
            {{ paginaDados.count }} {{ paginaDados.count === 1 ? 'produto encontrado' : 'produtos encontrados' }}
            <span v-if="filtrosAtivos">com os filtros selecionados</span>
          </p>
          <p v-else>Organize o cardápio e acompanhe a disponibilidade.</p>
        </div>
        <span class="catalog-panel-header__hint">Dados do estoque no Django</span>
      </header>

      <div class="catalog-toolbar">
        <div class="catalog-search" role="search">
          <Search :size="18" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            aria-label="Buscar produto por nome ou código"
            maxlength="100"
            autocomplete="off"
            placeholder="Buscar por nome ou código"
          />
          <button
            v-if="busca"
            type="button"
            aria-label="Limpar busca"
            class="catalog-search-clear"
            @click="busca = ''"
          ><X :size="16" aria-hidden="true" /></button>
        </div>
        <AdminCatalogSelect
          v-model="categoria"
          aria-label="Filtrar por categoria"
          :options="opcoesCategoria"
          class="catalog-filter"
        />
        <AdminCatalogSelect
          v-model="situacao"
          aria-label="Filtrar por situação do estoque e atividade"
          :options="opcoesSituacao"
          class="catalog-filter"
        />
      </div>

      <div v-if="erro || erroCategorias" class="catalog-error" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ erro || erroCategorias }}</span>
        <button type="button" @click="tentarNovamente">Tentar novamente</button>
      </div>

      <div v-if="!inicializado && !erro" class="catalog-state" role="status" aria-live="polite">
        <LoaderCircle :size="22" class="catalog-spin" aria-hidden="true" />
        Carregando catálogo…
      </div>
      <div v-else-if="inicializado && !paginaDados.results.length" class="catalog-state">
        <PackageOpen :size="30" aria-hidden="true" />
        <strong>Nenhum produto encontrado</strong>
        <span>{{ filtrosAtivos ? 'Experimente remover ou alterar os filtros.' : 'Cadastre o primeiro produto para começar.' }}</span>
        <button v-if="filtrosAtivos" type="button" class="catalog-reset" @click="limparFiltros">Limpar filtros</button>
        <RouterLink v-else :to="{ name: 'admin-produto-novo' }" class="catalog-reset">Cadastrar produto</RouterLink>
      </div>

      <template v-if="inicializado && paginaDados.results.length">
        <div class="catalog-columns" aria-hidden="true">
          <span>Produto</span>
          <span>Categoria</span>
          <span>Preço atual</span>
          <span>Estoque</span>
          <span>Situação</span>
          <span class="catalog-column-action">Ações</span>
        </div>

        <ul class="catalog-list">
          <li v-for="produto in paginaDados.results" :key="produto.id" class="catalog-row">
            <div class="catalog-product">
              <ProductImage :produto="produto" class="catalog-product__image" />
              <div>
                <strong>{{ produto.nome }}</strong>
                <small>{{ produto.codigo || 'Sem código' }}</small>
              </div>
            </div>

            <div class="catalog-cell catalog-cell--category">
              <span class="catalog-cell__label">Categoria</span>
              <span>{{ produto.categoria_nome || nomeCategoria(produto.categoria) }}</span>
            </div>

            <div class="catalog-cell catalog-cell--price">
              <span class="catalog-cell__label">Preço atual</span>
              <strong>{{ moeda(produto.preco_atual ?? produto.preco) }}</strong>
              <span v-if="produto.em_promocao" class="catalog-promo">
                <s>{{ moeda(produto.preco) }}</s> <em>Oferta</em>
              </span>
            </div>

            <div class="catalog-cell catalog-cell--stock">
              <span class="catalog-cell__label">Estoque</span>
              <strong :class="{ 'is-empty': Number(produto.estoque) === 0 }">
                {{ produto.estoque ?? '—' }}
                <small>{{ Number(produto.estoque) === 1 ? 'unidade' : 'unidades' }}</small>
              </strong>
              <span
                v-if="produto.estoque_baixo"
                class="catalog-stock-note"
                :class="{ 'is-empty': Number(produto.estoque) === 0 }"
              >{{ Number(produto.estoque) === 0 ? 'Sem estoque' : 'Repor estoque' }}</span>
            </div>

            <div class="catalog-cell catalog-cell--status">
              <span class="catalog-cell__label">Situação</span>
              <span class="catalog-status" :class="{ 'is-inactive': !produto.ativo }">
                <span class="catalog-status__dot" aria-hidden="true"></span>
                {{ produto.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </div>

            <div class="catalog-actions">
              <RouterLink
                class="catalog-action catalog-action--edit"
                :to="{ name: 'admin-produto-editar', params: { id: produto.id } }"
                :aria-label="`Editar ${produto.nome}`"
              >
                <Pencil :size="15" aria-hidden="true" /> Editar
              </RouterLink>
              <button
                type="button"
                class="catalog-action"
                :class="{ 'catalog-action--inactive': produto.ativo }"
                :disabled="alterando === produto.id"
                :aria-label="`${produto.ativo ? 'Desativar' : 'Ativar'} ${produto.nome}`"
                @click="alternarAtivo(produto)"
              >
                <LoaderCircle v-if="alterando === produto.id" :size="15" class="catalog-spin" aria-hidden="true" />
                <Power v-else :size="15" aria-hidden="true" />
                {{ alterando === produto.id ? 'Salvando…' : produto.ativo ? 'Desativar' : 'Ativar' }}
              </button>
            </div>
          </li>
        </ul>
      </template>

      <footer v-if="inicializado && paginaDados.count > 0" class="catalog-pagination">
        <span>Exibindo {{ inicioExibido }}–{{ fimExibido }} de {{ paginaDados.count }}</span>
        <div>
          <button type="button" :disabled="paginaAtual <= 1 || consultando" @click="mudarPagina(-1)">
            <ChevronLeft :size="16" aria-hidden="true" /> Anterior
          </button>
          <span>Página {{ paginaDados.page }} de {{ paginaDados.total_pages }}</span>
          <button type="button" :disabled="!paginaDados.next || consultando" @click="mudarPagina(1)">
            Próxima <ChevronRight :size="16" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, PackageOpen, Pencil, Plus, Power, Search, X } from "lucide-vue-next";

import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import ProductImage from "@/components/catalog/ProductImage.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import adminService, { mensagemErroApi } from "@/services/admin.service";
import { getSessionVersion } from "@/services/api";

const PAGE_SIZE = 18;
const categorias = ref([]);
const busca = ref("");
const buscaAplicada = ref("");
const categoria = ref("");
const situacao = ref("");
const paginaAtual = ref(1);
const paginaDados = ref({ count: 0, next: null, page: 1, total_pages: 1, results: [] });
const resumo = ref(null);
const inicializado = ref(false);
const consultando = ref(false);
const alterando = ref(null);
const erro = ref("");
const erroCategorias = ref("");
let sequencia = 0;
let timerBusca = null;

const opcoesCategoria = computed(() => [
  { label: "Todas as categorias", value: "" },
  ...categorias.value.map(item => ({ label: item.nome, value: String(item.id) })),
]);
const opcoesSituacao = [
  { label: "Todas as situações", value: "" },
  { label: "Ativos", value: "ativo" },
  { label: "Inativos", value: "inativo" },
  { label: "Sem estoque", value: "sem-estoque" },
  { label: "Para reposição", value: "reposicao" },
];
const metricas = [
  { label: "Total de produtos", campo: "total", descricao: "Cadastrados no sistema" },
  { label: "Ativos", campo: "ativos", descricao: "Disponíveis no cardápio" },
  { label: "Para reposição", campo: "reposicao", descricao: "Estoque no mínimo ou abaixo" },
  { label: "Em promoção", campo: "em_promocao", descricao: "Com oferta vigente" },
];
const filtrosAtivos = computed(() => Boolean(buscaAplicada.value || categoria.value || situacao.value));
const inicioExibido = computed(() => (paginaDados.value.page - 1) * PAGE_SIZE + 1);
const fimExibido = computed(() => (paginaDados.value.page - 1) * PAGE_SIZE + paginaDados.value.results.length);

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}
function nomeCategoria(id) {
  return categorias.value.find(c => String(c.id) === String(id))?.nome || "Sem categoria";
}
async function carregarCategorias() {
  try {
    categorias.value = await adminService.listarCategorias();
    erroCategorias.value = "";
  } catch {
    erroCategorias.value = "Não foi possível carregar as categorias.";
  }
}
async function carregar() {
  const chamada = ++sequencia;
  const sessao = getSessionVersion();
  consultando.value = true;
  try {
    const [pagina, totais] = await Promise.all([
      adminService.listarProdutosAdminPagina({
        page: paginaAtual.value, page_size: PAGE_SIZE, busca: buscaAplicada.value,
        categoria: categoria.value, situacao: situacao.value,
      }),
      adminService.resumoProdutosAdmin(),
    ]);
    if (chamada !== sequencia || getSessionVersion() !== sessao) return;
    paginaDados.value = pagina;
    resumo.value = totais;
    inicializado.value = true;
    erro.value = "";
  } catch (error) {
    if (chamada !== sequencia || getSessionVersion() !== sessao) return;
    if (error?.response?.status === 404 && paginaAtual.value > 1) {
      paginaAtual.value = 1;
      return carregar();
    }
    erro.value = mensagemErroApi(error, "Não foi possível consultar o catálogo.");
    throw error;
  } finally {
    if (chamada === sequencia) consultando.value = false;
  }
}
useAutoRefresh(carregar, { intervalo: 60_000 });

function aplicarFiltros() {
  paginaAtual.value = 1;
  void carregar().catch(() => {});
}
watch(busca, value => {
  if (timerBusca) clearTimeout(timerBusca);
  timerBusca = setTimeout(() => {
    buscaAplicada.value = value.trim();
    aplicarFiltros();
  }, 350);
});
watch([categoria, situacao], aplicarFiltros);
function limparFiltros() {
  busca.value = "";
  buscaAplicada.value = "";
  categoria.value = "";
  situacao.value = "";
  aplicarFiltros();
}
function mudarPagina(delta) {
  const destino = paginaAtual.value + delta;
  if (destino < 1 || destino > paginaDados.value.total_pages) return;
  paginaAtual.value = destino;
  void carregar().catch(() => {});
}
async function alternarAtivo(produto) {
  if (alterando.value !== null) return;
  alterando.value = produto.id;
  erro.value = "";
  try {
    await adminService.atualizarProduto(produto.id, { ativo: !produto.ativo });
    await carregar();
  } catch (error) {
    erro.value = mensagemErroApi(error, "Não foi possível alterar a situação do produto.");
  } finally {
    alterando.value = null;
  }
}
function tentarNovamente() {
  void carregarCategorias();
  void carregar().catch(() => {});
}
onMounted(() => { void carregarCategorias(); });
onBeforeUnmount(() => {
  sequencia += 1;
  if (timerBusca) clearTimeout(timerBusca);
});
</script>

<style scoped>
.pp-catalog{color:var(--pp-admin-text)}
.catalog-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}
.catalog-eyebrow{font-size:11px;font-weight:700;letter-spacing:.11em;color:var(--pp-admin-accent)}
.catalog-header h1{margin:7px 0 6px;font-size:30px;font-weight:650;letter-spacing:-.03em;line-height:1.2}
.catalog-header p{margin:0;color:var(--pp-admin-muted);font-size:14px;line-height:1.5}
.catalog-create{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:11px 17px;border-radius:10px;background:var(--pp-admin-text);color:var(--pp-admin-bg);font-size:13px;font-weight:650;white-space:nowrap;text-decoration:none;transition:transform 220ms ease,background-color 220ms ease,box-shadow 220ms ease}
.catalog-create:hover{transform:translateY(-2px);background:var(--pp-marrom-2);box-shadow:0 8px 20px color-mix(in srgb,var(--pp-marrom) 13%,transparent)}
.catalog-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}
.catalog-metric{display:flex;flex-direction:column;gap:4px;min-width:0;padding:18px 20px;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-creme-2)}
.catalog-metric span{font-size:12px;color:var(--pp-admin-muted)}.catalog-metric strong{font-size:27px;font-weight:650;line-height:1.2;font-variant-numeric:tabular-nums}.catalog-metric small{color:var(--pp-admin-muted);font-size:12px;line-height:1.45}
.catalog-panel{min-width:0;border:1px solid var(--pp-admin-border);border-radius:15px;background:var(--pp-admin-surface);overflow:visible}
.catalog-panel-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:21px 22px 17px}
.catalog-panel-header h2{margin:0;font-size:17px;font-weight:650;letter-spacing:-.015em}.catalog-panel-header p{margin:5px 0 0;color:var(--pp-admin-muted);font-size:12px}.catalog-panel-header__hint{font-size:11px;color:var(--pp-admin-muted)}
.catalog-toolbar{display:grid;grid-template-columns:minmax(200px,1fr) minmax(190px,230px) minmax(190px,230px);gap:10px;padding:0 22px 20px}
.catalog-search{display:flex;align-items:center;gap:10px;min-width:0;min-height:46px;padding:0 13px;border:1px solid var(--pp-admin-border);border-radius:11px;background:var(--pp-admin-surface);color:var(--pp-admin-muted);transition:border-color 200ms ease,box-shadow 200ms ease}
.catalog-search:hover,.catalog-search:focus-within{border-color:var(--pp-admin-accent)}
.catalog-search:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--pp-admin-accent) 12%,transparent)}
.catalog-search input{flex:1;min-width:0;width:100%;height:44px;border:0;outline:none;background:transparent;color:var(--pp-admin-text);font-size:13px}
.catalog-search input:focus-visible{outline:none;box-shadow:none}
.catalog-search-clear{display:grid;place-items:center;flex:none;width:30px;height:30px;border:0;border-radius:7px;background:var(--pp-creme-2);color:var(--pp-admin-muted);cursor:pointer}
.catalog-search-clear:hover{background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent)}
.catalog-columns,.catalog-row{display:grid;grid-template-columns:minmax(210px,2fr) minmax(100px,1fr) minmax(110px,.95fr) minmax(120px,.85fr) minmax(75px,.65fr) minmax(170px,1.3fr);gap:14px;align-items:center}
.catalog-columns{padding:12px 22px;border-top:1px solid var(--pp-admin-border);border-bottom:1px solid var(--pp-admin-border);background:var(--pp-creme-2);font-size:11px;color:var(--pp-admin-muted);font-weight:650}
.catalog-column-action{text-align:right}
.catalog-list{padding:0;margin:0;list-style:none}
.catalog-row{padding:14px 22px;border-bottom:1px solid var(--pp-admin-border);transition:background-color 200ms ease}
.catalog-row:last-child{border-bottom:0}
.catalog-row:hover{background:color-mix(in srgb,var(--pp-creme-2) 45%,var(--pp-admin-surface))}
.catalog-product{display:flex;align-items:center;gap:12px;min-width:0}
.catalog-product__image{flex:none;width:52px!important;height:52px!important;min-width:52px;border-radius:10px!important;overflow:hidden}
.catalog-product>div:last-child{min-width:0}
.catalog-product strong{display:block;overflow-wrap:anywhere;font-size:13px;font-weight:650;line-height:1.45}
.catalog-product small{display:block;margin-top:3px;font-size:11px;color:var(--pp-admin-muted)}
.catalog-cell{min-width:0;font-size:12px;color:var(--pp-admin-text);line-height:1.45}
.catalog-cell__label{display:none}
.catalog-cell--price>strong,.catalog-cell--stock>strong{display:block;font-size:13px;font-weight:650;font-variant-numeric:tabular-nums}
.catalog-cell--stock>strong small{font-size:11px;font-weight:400;color:var(--pp-admin-muted)}
.catalog-cell--stock>strong.is-empty{color:var(--pp-admin-danger)}
.catalog-stock-note{display:inline-flex;margin-top:5px;font-size:11px;font-weight:600;color:var(--pp-admin-accent)}
.catalog-stock-note.is-empty{color:var(--pp-admin-danger)}
.catalog-promo{display:flex;gap:7px;align-items:center;margin-top:5px;font-size:11px;color:var(--pp-admin-muted)}
.catalog-promo em{font-style:normal;color:var(--pp-admin-accent);font-weight:650}
.catalog-status{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;background:var(--pp-admin-success-bg);font-size:11px;font-weight:600;white-space:nowrap}
.catalog-status.is-inactive{background:var(--pp-creme-2);color:var(--pp-admin-muted)}
.catalog-status__dot{width:7px;height:7px;border-radius:50%;background:var(--pp-admin-success)}
.catalog-status.is-inactive .catalog-status__dot{background:var(--pp-admin-muted)}
.catalog-actions{display:flex;justify-content:flex-end;gap:7px;align-items:center}
.catalog-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:8px 10px;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:11px;font-weight:650;white-space:nowrap;cursor:pointer;text-decoration:none;transition:border-color 220ms ease,transform 220ms ease,box-shadow 220ms ease,background-color 220ms ease}
.catalog-action--edit{background:var(--pp-admin-text);border-color:var(--pp-admin-text);color:var(--pp-admin-bg)}
.catalog-action:hover:not(:disabled){transform:translateY(-2px);border-color:var(--pp-admin-accent);box-shadow:0 6px 14px color-mix(in srgb,var(--pp-marrom) 10%,transparent)}
.catalog-action--edit:hover{background:var(--pp-marrom-2);color:var(--pp-admin-bg)}
.catalog-action:disabled{opacity:.6;cursor:wait}
.catalog-action--inactive:hover{color:var(--pp-admin-danger)}
.catalog-error{display:flex;gap:10px;align-items:center;padding:14px 22px;border-top:1px solid var(--pp-admin-border);color:var(--pp-admin-danger);font-size:12px}
.catalog-error span{flex:1}.catalog-error button,.catalog-reset{padding:9px 13px;border:1px solid var(--pp-admin-accent);border-radius:8px;background:transparent;color:var(--pp-admin-accent);font-size:12px;font-weight:650;cursor:pointer;text-decoration:none}
.catalog-state{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;min-height:220px;padding:32px 20px;text-align:center;color:var(--pp-admin-muted);font-size:13px}
.catalog-state strong{font-size:15px;color:var(--pp-admin-text)}
.catalog-spin{animation:catalog-spin 950ms linear infinite}
@keyframes catalog-spin{to{transform:rotate(360deg)}}
.catalog-pagination{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 22px;border-top:1px solid var(--pp-admin-border);font-size:12px;color:var(--pp-admin-muted)}
.catalog-pagination>div{display:flex;align-items:center;gap:12px;font-variant-numeric:tabular-nums}
.catalog-pagination button{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:7px 11px;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:12px;cursor:pointer}
.catalog-pagination button:hover:not(:disabled){border-color:var(--pp-admin-accent);background:var(--pp-creme-2)}
.catalog-pagination button:disabled{opacity:.4;cursor:default}
@media(max-width:1250px){
  .catalog-columns{display:none}
  .catalog-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 16px 18px}
  .catalog-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;border:1px solid var(--pp-admin-border);border-radius:12px;align-content:start}
  .catalog-product{grid-column:1/-1}
  .catalog-cell__label{display:block;margin-bottom:5px;color:var(--pp-admin-muted);font-size:11px}
  .catalog-actions{grid-column:1/-1;justify-content:stretch}
  .catalog-actions>*{flex:1}
}
@media(max-width:860px){
  .catalog-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .catalog-toolbar{grid-template-columns:1fr 1fr}
  .catalog-search{grid-column:1/-1}
  .catalog-panel-header__hint{display:none}
}
@media(max-width:680px){
  .catalog-header{align-items:flex-start;flex-direction:column}
  .catalog-create{align-self:stretch}
  .catalog-metric{padding:14px}
  .catalog-metric strong{font-size:24px}
  .catalog-panel-header{padding:18px 16px 15px}
  .catalog-toolbar{grid-template-columns:1fr;padding:0 16px 18px}
  .catalog-search{grid-column:auto}
  .catalog-list{grid-template-columns:1fr;padding:0 12px 16px}
  .catalog-row{padding:15px}
  .catalog-pagination{flex-direction:column;align-items:flex-start;padding:14px 16px}
  .catalog-pagination>div{flex-wrap:wrap;gap:8px}
}
@media(prefers-reduced-motion:reduce){.pp-catalog *{transition:none!important;animation:none!important}.catalog-create:hover,.catalog-action:hover:not(:disabled){transform:none}}
</style>
