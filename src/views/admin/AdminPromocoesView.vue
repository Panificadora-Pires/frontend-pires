<template>
  <section class="admin-page promotions-page">
    <header class="promotions-header">
      <div>
        <h1>Promoções</h1>
        <p>Organize ofertas e períodos especiais do cardápio em um só lugar.</p>
      </div>
      <button ref="novaRef" type="button" class="promotions-create pp-card-action pp-admin-action--primary"
        data-card-action-radius @click="abrirNovo">
        <CardActionContent><Plus :size="17" aria-hidden="true" /> Nova promoção</CardActionContent>
      </button>
    </header>

    <section class="promotions-metrics" aria-label="Resumo das promoções">
      <div v-for="metrica in metricas" :key="metrica.campo" class="promotions-metric">
        <span>{{ metrica.label }}</span>
        <strong>{{ store.resumo ? indicadores[metrica.campo] : "—" }}</strong>
        <small>{{ metrica.descricao }}</small>
      </div>
    </section>

    <section class="promotions-panel" aria-labelledby="promotions-list-title">
      <header class="promotions-panel-header">
        <h2 id="promotions-list-title">Ofertas cadastradas</h2>
        <p>{{ store.inicializado ? store.pagina.count + (store.pagina.count === 1 ? " promoção encontrada" : " promoções encontradas") : "Acompanhe ofertas em andamento, futuras e encerradas." }}</p>
      </header>
      <div class="promotions-toolbar">
        <div class="promotions-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input v-model="busca" type="search" maxlength="100" autocomplete="off"
            placeholder="Buscar promoção pelo produto" aria-label="Buscar promoção pelo nome do produto" />
          <button v-if="busca" type="button" class="promotions-clear" aria-label="Limpar busca" @click="busca = ''">
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <AdminCatalogSelect v-model="situacao" class="promotions-filter"
          aria-label="Filtrar promoções por situação" :options="opcoesSituacao" />
      </div>

      <div v-if="store.erro" class="promotions-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ store.erro }}</span>
        <button type="button" @click="atualizarAgora">Tentar novamente</button>
      </div>
      <div v-if="sucesso" class="promotions-success" role="status">
        <CheckCircle2 :size="17" aria-hidden="true" />{{ sucesso }}
      </div>

      <div v-if="!store.inicializado && !store.erro" class="promotions-empty" role="status">
        <LoaderCircle :size="22" class="promotions-spin" aria-hidden="true" /> Carregando promoções…
      </div>
      <div v-else-if="store.inicializado && !store.resumo?.total" class="promotions-empty">
        <Tags :size="30" aria-hidden="true" />
        <strong>Nenhuma promoção cadastrada</strong>
        <span>Crie uma oferta para destacar um produto por um período.</span>
        <button type="button" @click="abrirNovo">Criar promoção</button>
      </div>
      <div v-else-if="store.inicializado && !store.pagina.count" class="promotions-empty">
        <SearchX :size="29" aria-hidden="true" />
        <strong>Nenhuma promoção encontrada</strong>
        <span>Experimente buscar outro produto ou mudar o filtro.</span>
        <button type="button" @click="limparFiltros">Limpar filtros</button>
      </div>

      <template v-if="store.inicializado && visiveis.length">
        <div class="promotions-columns" aria-hidden="true">
          <span>Produto</span><span>Preço especial</span><span>Vigência</span><span>Situação</span>
          <span class="promotions-actions-head">Ações</span>
        </div>
        <ul class="promotions-list">
          <li v-for="promocao in visiveis" :key="promocao.id" class="promotions-row">
            <div class="promotions-product">
              <span class="promotions-product-icon" aria-hidden="true"><Tag :size="20" /></span>
              <div>
                <strong>{{ promocao.produto_nome || "Produto não identificado" }}</strong>
              </div>
            </div>
            <div class="promotions-price">
              <span class="promotions-mobile-label">Preço especial</span>
              <strong>{{ moeda(promocao.preco_promocional) }}</strong>
            </div>
            <div class="promotions-period">
              <span class="promotions-mobile-label">Vigência</span>
              <span><CalendarDays :size="14" aria-hidden="true" /> {{ dataCivil(promocao.data_inicio) }} até {{ dataCivil(promocao.data_fim) }}</span>
            </div>
            <div class="promotions-situation">
              <span class="promotions-mobile-label">Situação</span>
              <span class="promotions-badge" :class="'promotions-badge--' + estadoPromocao(promocao, hoje)">
                <span aria-hidden="true" class="promotions-dot"></span>
                {{ rotuloEstado(estadoPromocao(promocao, hoje)) }}
              </span>
            </div>
            <div class="promotions-actions">
              <button type="button" class="promotions-action pp-card-action pp-admin-action--secondary"
                data-card-action-radius :aria-label="'Editar promoção de ' + promocao.produto_nome"
                @click="abrirEdicao(promocao, $event)">
                <CardActionContent><Pencil :size="15" aria-hidden="true" />Editar</CardActionContent>
              </button>
              <button type="button" class="promotions-action promotions-action--danger pp-card-action pp-admin-action--danger"
                data-card-action-radius :aria-label="'Excluir promoção de ' + promocao.produto_nome"
                @click="abrirExclusao(promocao, $event)">
                <CardActionContent><Trash2 :size="15" aria-hidden="true" />Excluir</CardActionContent>
              </button>
            </div>
          </li>
        </ul>
      </template>
      <footer v-if="store.inicializado && store.pagina.count" class="promotions-footer">
        <span>Exibindo {{ primeiraExibida }}–{{ ultimaExibida }} de {{ store.pagina.count }}</span>
        <div v-if="totalPaginas > 1" class="promotions-pagination">
          <button type="button" :disabled="store.pagina.page <= 1 || store.carregando || Boolean(store.erro)" @click="mudarPagina(-1)"><ChevronLeft :size="16" aria-hidden="true" /> Anterior</button>
          <span>Página {{ store.pagina.page }} de {{ totalPaginas }}</span>
          <button type="button" :disabled="store.pagina.page >= totalPaginas || store.carregando || Boolean(store.erro)" @click="mudarPagina(1)">Próxima <ChevronRight :size="16" aria-hidden="true" /></button>
        </div>
      </footer>
    </section>

    <dialog ref="formDialog" class="promotions-dialog" aria-labelledby="promotions-dialog-title"
      @cancel="aoCancelarFormulario" @close="aoFecharFormulario" @click="aoClicarForaFormulario">
      <form class="promotions-dialog-panel" @submit.prevent="salvar">
        <header class="promotions-dialog-header">
          <div>
            <span>OFERTAS DO CARDÁPIO</span>
            <h2 id="promotions-dialog-title">{{ form.id ? "Editar promoção" : "Nova promoção" }}</h2>
            <p>Escolha um produto, o preço especial e o período da oferta.</p>
          </div>
          <button type="button" class="promotions-close" :disabled="salvando"
            aria-label="Fechar formulário" @click="fecharFormulario"><X :size="19" aria-hidden="true" /></button>
        </header>
        <div class="promotions-form-body">
          <div class="promotions-field">
            <label for="promotion-product-search">Produto da promoção <em>*</em></label>
            <div v-if="produtoSelecionado" class="promotions-selected" role="status">
              <div>
                <strong>{{ produtoSelecionado.nome }}</strong>
                <small>
                  {{ produtoSelecionado.preco != null ? "Preço normal: " + moeda(produtoSelecionado.preco) : "Produto selecionado" }}
                  <span v-if="produtoSelecionado.ativo === false"> · Inativo</span>
                </small>
              </div>
              <CheckCircle2 :size="20" aria-hidden="true" />
            </div>
            <div class="promotions-product-search">
              <Search :size="16" aria-hidden="true" />
              <input id="promotion-product-search" ref="buscaProdutoRef" v-model="buscaProduto"
                type="search" maxlength="100" autocomplete="off"
                placeholder="Buscar produto pelo nome ou código"
                @input="agendarBuscaProduto" @keydown.enter.prevent="buscarProdutoAoEnter" />
            </div>
            <div v-if="erroProdutos" class="promotions-product-error" role="alert">
              {{ erroProdutos }}
              <button type="button" @click="buscarProdutos(false)">Tentar novamente</button>
            </div>
            <div v-else-if="carregandoProdutos" class="promotions-product-loading" role="status">
              <LoaderCircle :size="16" class="promotions-spin" aria-hidden="true" /> Buscando produtos…
            </div>
            <div v-else-if="!paginaProdutos.results.length" class="promotions-product-loading">
              Nenhum produto encontrado. Experimente outro termo.
            </div>
            <div v-else class="promotions-product-results" role="group" aria-label="Produtos encontrados">
              <button v-for="produto in paginaProdutos.results" :key="produto.id" type="button"
                :aria-pressed="Number(form.produto) === Number(produto.id)"
                @click="escolherProduto(produto)">
                <span><strong>{{ produto.nome }}</strong><small>{{ moeda(produto.preco) }}<span v-if="!produto.ativo"> · Inativo</span></small></span>
                <Check v-if="Number(form.produto) === Number(produto.id)" :size="17" aria-hidden="true" />
              </button>
            </div>
            <button v-if="paginaProdutos.next && !carregandoProdutos && !erroProdutos" type="button"
              class="promotions-more" @click="buscarProdutos(true)">Mostrar mais produtos</button>
            <small>Não encontrou o produto? Busque pelo nome ou código.</small>
          </div>

          <label class="promotions-field">
            <span>Preço promocional (R$) <em>*</em></span>
            <input v-model="form.preco_promocional" type="number" inputmode="decimal"
              min="0.01" step="0.01" required placeholder="0,00" />
            <small>O valor deve ser menor que o preço normal do produto.</small>
          </label>
          <div class="promotions-date-grid">
            <label class="promotions-field">
              <span>Data inicial <em>*</em></span>
              <input v-model="form.data_inicio" type="date" required />
            </label>
            <label class="promotions-field">
              <span>Data final <em>*</em></span>
              <input v-model="form.data_fim" type="date" required :min="form.data_inicio || undefined" />
            </label>
          </div>
          <div class="promotions-date-note"><Info :size="16" aria-hidden="true" />
            A promoção inclui as datas de início e fim.
          </div>
          <p v-if="erroFormulario" class="promotions-form-error" role="alert"><CircleAlert :size="16" aria-hidden="true" />{{ erroFormulario }}</p>
        </div>
        <footer class="promotions-dialog-actions">
          <button type="button" class="promotions-cancel pp-card-action pp-admin-action--cancel"
            data-card-action-radius :disabled="salvando" @click="fecharFormulario"><CardActionContent>Cancelar</CardActionContent></button>
          <button type="submit" class="promotions-save pp-card-action pp-admin-action--primary"
            data-card-action-radius :disabled="salvando">
            <CardActionContent>
              <LoaderCircle v-if="salvando" :size="16" class="promotions-spin" aria-hidden="true" />
              <Check v-else :size="16" aria-hidden="true" />
              {{ salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Criar promoção" }}
            </CardActionContent>
          </button>
        </footer>
      </form>
    </dialog>

    <dialog ref="exclusaoDialog" class="promotions-dialog promotions-delete-dialog" aria-labelledby="promotions-delete-title"
      @cancel="aoCancelarExclusao" @close="aoFecharExclusao" @click="aoClicarForaExclusao">
      <div class="promotions-dialog-panel">
        <header class="promotions-dialog-header">
          <div>
            <span>CONFIRMAÇÃO</span>
            <h2 id="promotions-delete-title">Excluir promoção</h2>
            <p>Esta ação não exclui o produto do catálogo.</p>
          </div>
          <button type="button" class="promotions-close" :disabled="excluindo"
            aria-label="Fechar confirmação" @click="fecharExclusao"><X :size="19" aria-hidden="true" /></button>
        </header>
        <div class="promotions-delete-body">
          <div class="promotions-delete-icon"><TriangleAlert :size="24" aria-hidden="true" /></div>
          <div>
            <strong>Excluir a oferta de {{ promocaoParaExcluir?.produto_nome }}?</strong>
            <p>O preço especial deixará de valer. O produto continuará cadastrado normalmente.</p>
          </div>
          <p v-if="erroExclusao" class="promotions-form-error" role="alert"><CircleAlert :size="16" aria-hidden="true" />{{ erroExclusao }}</p>
        </div>
        <footer class="promotions-dialog-actions">
          <button type="button" class="promotions-cancel pp-card-action pp-admin-action--secondary"
            data-card-action-radius :disabled="excluindo" @click="fecharExclusao"><CardActionContent>Voltar</CardActionContent></button>
          <button type="button" class="promotions-delete-confirm pp-card-action pp-admin-action--danger"
            data-card-action-radius :disabled="excluindo || !promocaoParaExcluir" @click="confirmarExclusao">
            <CardActionContent>
              <LoaderCircle v-if="excluindo" :size="16" class="promotions-spin" aria-hidden="true" />
              <Trash2 v-else :size="16" aria-hidden="true" />
              {{ excluindo ? "Excluindo…" : "Excluir promoção" }}
            </CardActionContent>
          </button>
        </footer>
      </div>
    </dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import {
  CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert,
  Info, LoaderCircle, Pencil, Plus, Search, SearchX, Tag, Tags, Trash2, TriangleAlert, X,
} from "lucide-vue-next";

import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { getSessionVersion } from "@/services/api";
import { useAdminPromocoesStore } from "@/stores/adminPromocoes";
import { mensagemErroApi } from "@/services/admin.service";
import { diaEmSaoPaulo, estadoPromocao, validarPromocao } from "@/utils/adminPromocoes";

const store = useAdminPromocoesStore();
const hoje = ref(diaEmSaoPaulo());
const busca = ref("");
const situacao = ref("");
const pagina = ref(1);
const PAGE_SIZE = 12;
const opcoesSituacao = [
  { label: "Todas as situações", value: "" },
  { label: "Ativas", value: "ativa" },
  { label: "Agendadas", value: "agendada" },
  { label: "Encerradas", value: "encerrada" },
];
const metricas = [
  { label: "Total de promoções", campo: "total", descricao: "Ofertas cadastradas" },
  { label: "Ativas", campo: "ativas", descricao: "Com preço especial vigente" },
  { label: "Agendadas", campo: "agendadas", descricao: "Programadas para começar" },
  { label: "Encerradas", campo: "encerradas", descricao: "Com período finalizado" },
];
const indicadores = computed(() => store.resumo || {});
const totalPaginas = computed(() => store.pagina.total_pages);
const visiveis = computed(() => store.pagina.results);
const primeiraExibida = computed(() => (store.pagina.page - 1) * store.pagina.page_size + 1);
const ultimaExibida = computed(() => primeiraExibida.value + visiveis.value.length - 1);
let timerFiltros = null;

function parametros() {
  return { page: pagina.value, page_size: PAGE_SIZE, busca: busca.value.trim(), situacao: situacao.value };
}
async function carregar() {
  hoje.value = diaEmSaoPaulo();
  try {
    await store.carregar(parametros());
  } catch (error) {
    if (pagina.value > 1 && error?.response?.status === 404) {
      pagina.value = 1;
      await store.carregar(parametros());
      return;
    }
    throw error;
  }
}
function mudarPagina(deslocamento) {
  if (store.carregando) return;
  const destino = pagina.value + deslocamento;
  if (destino < 1 || destino > totalPaginas.value) return;
  pagina.value = destino;
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

const formDialog = ref(null);
const exclusaoDialog = ref(null);
const novaRef = ref(null);
const buscaProdutoRef = ref(null);
const form = reactive({ id: null, produto: "", preco_promocional: "", data_inicio: "", data_fim: "" });
const produtoSelecionado = ref(null);
const buscaProduto = ref("");
const paginaProdutos = ref({ page: 1, count: 0, next: null, results: [] });
const carregandoProdutos = ref(false);
const erroProdutos = ref("");
const salvando = ref(false);
const erroFormulario = ref("");
const excluindo = ref(false);
const erroExclusao = ref("");
const promocaoParaExcluir = ref(null);
const sucesso = ref("");
let focoFormulario = null;
let focoExclusao = null;
let timerBusca = null;
let sequenciaBusca = 0;
let sequenciaDetalhe = 0;
let montado = true;

function moeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor || 0));
}
function dataCivil(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor)) ? valor.split("-").reverse().join("/") : "—";
}
function rotuloEstado(estado) {
  return { ativa: "Ativa", agendada: "Agendada", encerrada: "Encerrada" }[estado] || "—";
}
function limparFiltros() { busca.value = ""; situacao.value = ""; }

async function buscarProdutos(mais = false) {
  if (mais && (!paginaProdutos.value.next || carregandoProdutos.value)) return;
  const chamada = ++sequenciaBusca;
  const sessao = getSessionVersion();
  const buscaAtual = buscaProduto.value.trim();
  const numeroPagina = mais ? paginaProdutos.value.page + 1 : 1;
  carregandoProdutos.value = true;
  erroProdutos.value = "";
  try {
    const dados = await store.pesquisarProdutos({
      page: numeroPagina, page_size: 20, busca: buscaAtual,
    });
    if (chamada !== sequenciaBusca || sessao !== getSessionVersion() || !montado || !formDialog.value?.open) return;
    paginaProdutos.value = {
      ...dados,
      results: mais ? [...paginaProdutos.value.results, ...dados.results] : dados.results,
    };
  } catch {
    if (chamada !== sequenciaBusca || sessao !== getSessionVersion() || !montado || !formDialog.value?.open) return;
    erroProdutos.value = "Não foi possível buscar produtos.";
  } finally {
    if (chamada === sequenciaBusca) carregandoProdutos.value = false;
  }
}
function buscarProdutoAoEnter() {
  clearTimeout(timerBusca);
  buscarProdutos(false);
}
function agendarBuscaProduto() {
  clearTimeout(timerBusca);
  sequenciaBusca++;
  paginaProdutos.value = { page: 1, count: 0, next: null, results: [] };
  carregandoProdutos.value = true;
  timerBusca = window.setTimeout(() => buscarProdutos(false), 270);
}
function escolherProduto(produto) {
  produtoSelecionado.value = { ...produto };
  form.produto = Number(produto.id);
  erroFormulario.value = "";
}
async function carregarProdutoExistente(id) {
  const chamada = ++sequenciaDetalhe, sessao = getSessionVersion();
  try {
    const produto = await store.obterProdutoAdmin(id);
    if (chamada !== sequenciaDetalhe || sessao !== getSessionVersion() || !formDialog.value?.open || !montado) return;
    if (Number(form.produto) !== Number(produto.id)) return;
    produtoSelecionado.value = produto;
  } catch {
  }
}
function preencherFormulario(promocao = null) {
  Object.assign(form, {
    id: promocao?.id ?? null,
    produto: promocao?.produto ?? "",
    preco_promocional: promocao?.preco_promocional ?? "",
    data_inicio: promocao?.data_inicio ?? diaEmSaoPaulo(),
    data_fim: promocao?.data_fim ?? diaEmSaoPaulo(),
  });
  buscaProduto.value = "";
  paginaProdutos.value = { page: 1, count: 0, next: null, results: [] };
  produtoSelecionado.value = promocao
    ? { id: promocao.produto, nome: promocao.produto_nome }
    : null;
  erroProdutos.value = "";
  erroFormulario.value = "";
  sucesso.value = "";
}
function abrirFormulario(promocao, event) {
  if (formDialog.value?.open || exclusaoDialog.value?.open) return;
  preencherFormulario(promocao);
  focoFormulario = event?.currentTarget || document.activeElement;
  formDialog.value?.showModal();
  nextTick(() => buscaProdutoRef.value?.focus());
  buscarProdutos(false);
  if (promocao) carregarProdutoExistente(promocao.produto);
}
function abrirNovo(event) { abrirFormulario(null, event); }
function abrirEdicao(promocao, event) { abrirFormulario(promocao, event); }
function fecharFormulario() { if (!salvando.value) formDialog.value?.close(); }
function aoCancelarFormulario(event) { if (salvando.value) event.preventDefault(); }
function aoClicarForaFormulario(event) { if (event.target === formDialog.value) fecharFormulario(); }
function aoFecharFormulario() {
  sequenciaBusca++;
  sequenciaDetalhe++;
  clearTimeout(timerBusca);
  carregandoProdutos.value = false;
  erroFormulario.value = "";
  if (focoFormulario?.isConnected) focoFormulario.focus();
  else novaRef.value?.focus();
  focoFormulario = null;
}

async function salvar() {
  if (salvando.value) return;
  erroFormulario.value = validarPromocao(form, produtoSelecionado.value?.preco);
  if (erroFormulario.value) return;
  const edicao = Boolean(form.id);
  const payload = {
    produto: Number(form.produto),
    preco_promocional: String(form.preco_promocional).replace(",", "."),
    data_inicio: form.data_inicio,
    data_fim: form.data_fim,
  };
  salvando.value = true;
  try {
    await store.salvar({ id: form.id, payload });
    if (!montado) return;
    formDialog.value?.close();
    sucesso.value = edicao ? "Promoção atualizada com sucesso." : "Promoção criada com sucesso.";
    await carregar().catch(() => {});
  } catch (error) {
    if (montado) erroFormulario.value = mensagemErroApi(error, "Não foi possível salvar a promoção.");
  } finally {
    if (montado) salvando.value = false;
  }
}

function abrirExclusao(promocao, event) {
  if (formDialog.value?.open || exclusaoDialog.value?.open) return;
  promocaoParaExcluir.value = promocao;
  erroExclusao.value = "";
  sucesso.value = "";
  focoExclusao = event?.currentTarget || document.activeElement;
  exclusaoDialog.value?.showModal();
}
function fecharExclusao() { if (!excluindo.value) exclusaoDialog.value?.close(); }
function aoCancelarExclusao(event) { if (excluindo.value) event.preventDefault(); }
function aoClicarForaExclusao(event) { if (event.target === exclusaoDialog.value) fecharExclusao(); }
function aoFecharExclusao() {
  promocaoParaExcluir.value = null;
  erroExclusao.value = "";
  if (focoExclusao?.isConnected) focoExclusao.focus();
  else novaRef.value?.focus();
  focoExclusao = null;
}
async function confirmarExclusao() {
  if (!promocaoParaExcluir.value || excluindo.value) return;
  excluindo.value = true;
  erroExclusao.value = "";
  try {
    await store.excluir(promocaoParaExcluir.value.id);
    if (!montado) return;
    exclusaoDialog.value?.close();
    sucesso.value = "Promoção excluída. O produto continua no catálogo.";
    await carregar().catch(() => {});
  } catch (error) {
    if (montado) erroExclusao.value = mensagemErroApi(error, "Não foi possível excluir esta promoção.");
  } finally {
    if (montado) excluindo.value = false;
  }
}
onBeforeUnmount(() => {
  montado = false;
  sequenciaBusca++;
  sequenciaDetalhe++;
  clearTimeout(timerBusca);
  clearTimeout(timerFiltros);
  formDialog.value?.close();
  exclusaoDialog.value?.close();
  store.resetar();
});
</script>

<style scoped>
.promotions-page{color:var(--pp-admin-text)}
.promotions-header{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-bottom:24px}
.promotions-header h1{font-size:30px;line-height:1.2;letter-spacing:-.03em;margin:0 0 7px;font-weight:650}
.promotions-header p{font-size:14px;color:var(--pp-admin-muted);margin:0;line-height:1.5}
.promotions-create{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid var(--pp-admin-text);background:var(--pp-admin-text);color:var(--pp-admin-bg);padding:10px 17px;border-radius:10px;font:inherit;font-size:13px;font-weight:650;white-space:nowrap;cursor:pointer}
.promotions-create:hover{box-shadow:0 8px 20px color-mix(in srgb,var(--pp-marrom) 14%,transparent)}
.promotions-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}
.promotions-metric{display:flex;flex-direction:column;gap:5px;min-width:0;padding:18px 20px;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-creme-2)}
.promotions-metric>span{font-size:12px;color:var(--pp-admin-muted)}
.promotions-metric strong{font-size:27px;line-height:1.25;font-weight:650;font-variant-numeric:tabular-nums}
.promotions-metric small{font-size:12px;color:var(--pp-admin-muted);line-height:1.5}
.promotions-panel{min-width:0;border:1px solid var(--pp-admin-border);border-radius:15px;background:var(--pp-admin-surface)}
.promotions-panel-header{padding:20px 22px 17px}
.promotions-panel-header h2{font-size:17px;letter-spacing:-.015em;margin:0;font-weight:650}
.promotions-panel-header p{font-size:12px;color:var(--pp-admin-muted);margin:5px 0 0}
.promotions-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:10px;padding:0 22px 19px}
.promotions-search,.promotions-product-search{display:flex;align-items:center;gap:9px;min-height:46px;padding:0 12px;border:1px solid var(--pp-admin-border);border-radius:11px;color:var(--pp-admin-muted);transition:border-color 180ms ease,box-shadow 180ms ease}
.promotions-search:hover,.promotions-search:focus-within,.promotions-product-search:hover,.promotions-product-search:focus-within{border-color:var(--pp-admin-accent)}
.promotions-search:focus-within,.promotions-product-search:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--pp-admin-accent) 12%,transparent)}
.promotions-search input,.promotions-product-search input{flex:1;width:100%;min-width:0;min-height:44px;border:0;background:transparent;color:var(--pp-admin-text);outline:none;font:inherit;font-size:13px}
.promotions-search input:focus-visible,.promotions-product-search input:focus-visible{outline:none}
.promotions-clear{display:grid;place-items:center;flex:none;width:29px;height:29px;border:0;border-radius:7px;background:var(--pp-creme-2);color:var(--pp-admin-muted);cursor:pointer}
.promotions-clear:hover{background:var(--pp-admin-warning-bg)}
.promotions-alert,.promotions-success{display:flex;align-items:center;gap:10px;padding:14px 22px;border-top:1px solid var(--pp-admin-border);font-size:12px;line-height:1.5}
.promotions-alert{color:var(--pp-admin-danger);background:var(--pp-admin-danger-bg)}
.promotions-alert span{flex:1}
.promotions-alert button{min-height:38px;border:1px solid currentColor;background:transparent;color:inherit;padding:7px 11px;border-radius:8px;cursor:pointer;font-weight:650}
.promotions-success{color:var(--pp-admin-success);background:var(--pp-admin-success-bg)}
.promotions-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;min-height:205px;padding:30px;text-align:center;font-size:13px;color:var(--pp-admin-muted)}
.promotions-empty strong{font-size:14px;color:var(--pp-admin-text)}
.promotions-empty button{border:1px solid var(--pp-admin-accent);background:transparent;color:var(--pp-admin-accent);min-height:38px;padding:8px 12px;border-radius:8px;font-weight:650;cursor:pointer}
.promotions-columns,.promotions-row{display:grid;grid-template-columns:minmax(180px,1.5fr) minmax(120px,.85fr) minmax(190px,1.3fr) 110px minmax(170px,.9fr);gap:13px;align-items:center}
.promotions-columns{padding:13px 20px;font-size:12px;font-weight:650;color:var(--pp-admin-muted);border-top:1px solid var(--pp-admin-border);border-bottom:1px solid var(--pp-admin-border);background:var(--pp-creme-2)}
.promotions-actions-head{text-align:right}
.promotions-list{padding:0;margin:0;list-style:none}
.promotions-row{padding:16px 20px;border-bottom:1px solid var(--pp-admin-border);transition:background-color 200ms ease}
.promotions-row:last-child{border-bottom:0}
.promotions-row:hover{background:color-mix(in srgb,var(--pp-creme-2) 43%,var(--pp-admin-surface))}
.promotions-product{display:flex;gap:12px;align-items:center;min-width:0}
.promotions-product-icon{display:grid;place-items:center;flex:none;width:46px;height:46px;background:var(--pp-creme-2);border-radius:11px;color:var(--pp-admin-accent)}
.promotions-product>div{min-width:0}
.promotions-product strong{display:block;font-size:14px;line-height:1.45;overflow-wrap:anywhere}
.promotions-product small{display:block;color:var(--pp-admin-muted);font-size:12px;margin-top:3px}
.promotions-price strong{font-size:15px;white-space:nowrap;font-variant-numeric:tabular-nums}
.promotions-period>span:last-child{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--pp-admin-muted);line-height:1.5}
.promotions-period svg{flex:none}
.promotions-badge{display:inline-flex;align-items:center;gap:7px;border-radius:8px;padding:7px 9px;white-space:nowrap;font-size:12px;font-weight:650}
.promotions-badge--ativa{background:var(--pp-admin-success-bg);color:var(--pp-admin-text)}
.promotions-badge--agendada{background:var(--pp-admin-warning-bg);color:var(--pp-admin-text)}
.promotions-badge--encerrada{background:var(--pp-creme-2);color:var(--pp-admin-muted)}
.promotions-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--pp-admin-success)}
.promotions-badge--agendada .promotions-dot{background:var(--pp-admin-accent)}
.promotions-badge--encerrada .promotions-dot{background:var(--pp-admin-muted)}
.promotions-actions{display:flex;justify-content:flex-end;gap:8px}
.promotions-action{display:inline-flex;justify-content:center;align-items:center;gap:6px;min-height:40px;padding:9px 11px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:13px;font-weight:650;cursor:pointer}
.promotions-action--danger{color:var(--pp-admin-danger)}
.promotions-action:hover{border-color:var(--pp-admin-accent)}
.promotions-action--danger:hover{border-color:var(--pp-admin-danger)}
.promotions-mobile-label{display:none}
.promotions-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 22px;color:var(--pp-admin-muted);font-size:13px;border-top:1px solid var(--pp-admin-border)}
.promotions-pagination{display:flex;align-items:center;gap:10px}
.promotions-pagination button{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:7px 9px;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);cursor:pointer}
.promotions-pagination button:disabled{opacity:.5;cursor:not-allowed}
.promotions-spin{animation:promotions-spin .9s linear infinite}
@keyframes promotions-spin{to{transform:rotate(360deg)}}
.promotions-dialog{position:fixed;inset:0;margin:auto;width:min(610px,calc(100vw - 28px));max-width:610px;max-height:min(90dvh,900px);padding:0;border:0;border-radius:16px;background:var(--pp-admin-surface);color:var(--pp-admin-text);box-shadow:0 24px 80px color-mix(in srgb,var(--pp-marrom) 25%,transparent);overflow:auto}
.promotions-dialog::backdrop{background:var(--pp-admin-backdrop)}
.promotions-dialog[open] .promotions-dialog-panel{animation:promotions-enter 250ms cubic-bezier(.22,1,.36,1)}
@keyframes promotions-enter{from{opacity:0;transform:translateY(12px) scale(.99)}to{opacity:1;transform:none}}
.promotions-dialog-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:23px 25px 19px;border-bottom:1px solid var(--pp-admin-border)}
.promotions-dialog-header>div>span{font-size:11px;letter-spacing:.1em;color:var(--pp-admin-accent);font-weight:700}
.promotions-dialog-header h2{font-size:23px;margin:6px 0;letter-spacing:-.025em}
.promotions-dialog-header p{font-size:12px;line-height:1.5;color:var(--pp-admin-muted);margin:0}
.promotions-close{display:grid;place-items:center;flex:none;width:38px;height:38px;border:0;border-radius:9px;background:var(--pp-creme-2);color:var(--pp-admin-muted);cursor:pointer}
.promotions-close:hover{color:var(--pp-admin-text)}
.promotions-form-body{display:flex;flex-direction:column;gap:18px;padding:21px 25px}
.promotions-field{display:flex;flex-direction:column;gap:8px;min-width:0}
.promotions-field>span,.promotions-field>label{font-size:13px;font-weight:650}
.promotions-field em{font-style:normal;color:var(--pp-admin-accent)}
.promotions-field>input{min-height:44px;width:100%;padding:10px 12px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:13px}
.promotions-field>input:focus-visible{outline:2px solid var(--pp-admin-accent);outline-offset:2px}
.promotions-field small{font-size:12px;line-height:1.5;color:var(--pp-admin-muted)}
.promotions-selected{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--pp-admin-border);border-radius:10px;background:var(--pp-creme-2);padding:11px 13px}
.promotions-selected strong,.promotions-selected small{display:block}
.promotions-selected strong{font-size:12px}
.promotions-selected small{margin-top:3px}
.promotions-selected svg{flex:none;color:var(--pp-admin-success)}
.promotions-product-results{max-height:160px;overflow-y:auto;scrollbar-color:var(--pp-admin-border) transparent;border:1px solid var(--pp-admin-border);border-radius:10px}
.promotions-product-results button{display:flex;justify-content:space-between;gap:10px;align-items:center;width:100%;text-align:left;min-height:49px;border:0;border-bottom:1px solid var(--pp-admin-border);background:var(--pp-admin-surface);color:var(--pp-admin-text);padding:8px 12px;cursor:pointer}
.promotions-product-results button:last-child{border-bottom:0}
.promotions-product-results button:hover,.promotions-product-results button[aria-pressed="true"]{background:var(--pp-creme-2)}
.promotions-product-results button strong,.promotions-product-results button small{display:block}
.promotions-product-results button strong{font-size:13px;font-weight:650}
.promotions-product-results button small{margin-top:2px}
.promotions-product-results button svg{flex:none;color:var(--pp-admin-success)}
.promotions-product-error,.promotions-product-loading{font-size:12px;color:var(--pp-admin-muted);padding:10px 12px;border-radius:8px;background:var(--pp-creme-2)}
.promotions-product-loading{display:flex;align-items:center;gap:8px}
.promotions-product-error{color:var(--pp-admin-danger)}
.promotions-product-error button,.promotions-more{display:block;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);padding:8px 11px;font-size:12px;cursor:pointer}
.promotions-product-error button{margin-top:6px}
.promotions-more{align-self:flex-start;font-weight:650}
.promotions-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.promotions-date-note,.promotions-form-error{display:flex;align-items:flex-start;gap:9px;padding:12px;border-radius:9px;font-size:12px;line-height:1.5}
.promotions-date-note{background:var(--pp-creme-2);color:var(--pp-admin-muted)}
.promotions-form-error{background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger);margin:0}
.promotions-date-note svg,.promotions-form-error svg{flex:none}
.promotions-dialog-actions{display:flex;justify-content:flex-end;gap:9px;padding:17px 25px 22px;border-top:1px solid var(--pp-admin-border)}
.promotions-cancel,.promotions-save,.promotions-delete-confirm{display:inline-flex;justify-content:center;align-items:center;gap:8px;min-height:43px;padding:10px 16px;border:1px solid var(--pp-admin-border);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font-size:12px;font-weight:650;cursor:pointer}
.promotions-save{background:var(--pp-admin-text);color:var(--pp-admin-bg);border-color:var(--pp-admin-text)}
.promotions-delete-confirm{color:var(--pp-admin-danger);border-color:var(--pp-admin-border)}
.promotions-cancel:disabled,.promotions-save:disabled,.promotions-delete-confirm:disabled{opacity:.55;cursor:wait}
.promotions-delete-dialog{max-width:510px}
.promotions-delete-body{display:flex;flex-wrap:wrap;gap:13px;padding:25px}
.promotions-delete-icon{display:grid;place-items:center;flex:none;width:45px;height:45px;border-radius:10px;background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger)}
.promotions-delete-body>div:nth-child(2){flex:1;min-width:0}
.promotions-delete-body strong{font-size:14px;line-height:1.5}
.promotions-delete-body p{font-size:12px;color:var(--pp-admin-muted);margin:7px 0 0;line-height:1.55}
.promotions-delete-body .promotions-form-error{flex-basis:100%}
@media(max-width:1160px){
  .promotions-columns{display:none}
  .promotions-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 14px 18px}
  .promotions-row{display:grid;grid-template-columns:1fr 1fr;gap:13px;border:1px solid var(--pp-admin-border);border-radius:12px;padding:16px}
  .promotions-product,.promotions-actions{grid-column:1/-1}
  .promotions-situation{grid-column:1/-1}
  .promotions-actions{justify-content:stretch}
  .promotions-action{flex:1}
  .promotions-mobile-label{display:block;margin-bottom:5px;font-size:11px;color:var(--pp-admin-muted)}
}
@media(max-width:720px){
  .promotions-header{align-items:stretch;flex-direction:column}
  .promotions-header h1{font-size:27px}
  .promotions-create{width:100%}
  .promotions-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .promotions-metric{padding:15px}
  .promotions-metric strong{font-size:24px}
  .promotions-panel-header{padding:18px 16px 14px}
  .promotions-toolbar{grid-template-columns:1fr;padding:0 16px 18px}
  .promotions-list{grid-template-columns:1fr;padding:0 12px 16px}
  .promotions-footer{flex-wrap:wrap;padding:14px 16px}
  .promotions-pagination{width:100%;justify-content:space-between}
  .promotions-dialog-header,.promotions-form-body{padding-left:18px;padding-right:18px}
  .promotions-dialog-actions{padding:16px 18px 20px}
  .promotions-dialog-actions>button{flex:1;padding:9px}
  .promotions-date-grid{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){.promotions-page *{transition:none!important;animation:none!important}.promotions-dialog[open] .promotions-dialog-panel{animation:none}}
</style>
