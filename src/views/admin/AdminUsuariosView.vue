<template>
  <section class="admin-page users-page">
    <header class="users-header">
      <h1>Usuários</h1>
      <p>Consulte as contas de clientes e da equipe cadastradas na Pires.</p>
    </header>

    <section class="users-metrics" aria-label="Resumo das contas">
      <article v-for="metrica in metricas" :key="metrica.chave" class="users-metric">
        <span>{{ metrica.titulo }}</span>
        <strong>{{ store.resumo ? numero(store.resumo[metrica.chave]) : "—" }}</strong>
        <small>{{ metrica.legenda }}</small>
      </article>
    </section>

    <section class="users-panel" aria-labelledby="users-list-title">
      <header class="users-panel-heading">
        <h2 id="users-list-title">Contas cadastradas</h2>
        <p v-if="store.inicializado">{{ numero(store.pagina.count) }} {{ store.pagina.count === 1 ? "conta encontrada" : "contas encontradas" }}</p>
        <p v-else>Encontre clientes e administradores por nome ou e-mail.</p>
      </header>

      <div class="users-filters">
        <div class="users-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input v-model="busca" type="search" maxlength="100" autocomplete="off"
            aria-label="Buscar usuários por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail" />
          <button v-if="busca" type="button" aria-label="Limpar busca" @click="busca = ''">
            <X :size="17" aria-hidden="true" />
          </button>
        </div>
        <AdminCatalogSelect v-model="perfil" aria-label="Filtrar por perfil" :options="perfis"/>
        <AdminCatalogSelect v-model="situacao" aria-label="Filtrar por situação" :options="situacoes"/>
        <AdminCatalogSelect v-model="verificacao" aria-label="Filtrar por e-mail verificado" :options="verificacoes"/>
      </div>

      <div v-if="store.erro" class="users-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ store.erro }}</span>
        <button type="button" class="users-retry pp-card-action pp-admin-action--secondary"
          data-card-action-radius @click="tentarNovamente">
          <CardActionContent>Tentar novamente</CardActionContent>
        </button>
      </div>

      <div v-if="!store.inicializado && !store.erro" class="users-empty" role="status">
        <LoaderCircle :size="21" aria-hidden="true" class="users-spinner" />
        Carregando contas…
      </div>
      <div v-else-if="store.inicializado && store.pagina.count === 0" class="users-empty">
        <UsersRound :size="29" aria-hidden="true" />
        <strong>{{ filtrosAtivos ? "Nenhuma conta encontrada" : "Nenhuma conta cadastrada" }}</strong>
        <p>{{ filtrosAtivos ? "Experimente outros filtros ou outra busca." : "As contas cadastradas aparecerão nesta lista." }}</p>
        <button v-if="filtrosAtivos" type="button" class="users-clear-filters" @click="limparFiltros">
          Limpar filtros
        </button>
      </div>
      <template v-if="store.inicializado && store.pagina.results.length">
        <div class="users-table-head" aria-hidden="true">
          <span>Usuário</span>
          <span>Perfil</span>
          <span>Situação</span>
          <span>E-mail</span>
          <span>Último acesso</span>
        </div>
        <ul class="users-list" aria-label="Contas cadastradas">
          <li v-for="usuario in store.pagina.results" :key="usuario.id" class="users-row">
            <div class="users-identity">
              <div class="users-avatar" aria-hidden="true">{{ iniciais(usuario) }}</div>
              <div class="users-name">
                <strong>{{ usuario.name || "Sem nome informado" }}</strong>
                <span>{{ usuario.email }}</span>
              </div>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">Perfil</span>
              <span class="users-tag" :class="{ 'users-tag--staff': usuario.is_staff }">
                <ShieldCheck v-if="usuario.is_staff" :size="14" aria-hidden="true" />
                {{ usuario.is_staff ? "Administrador" : "Cliente" }}
              </span>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">Situação</span>
              <span class="users-tag" :class="usuario.is_active ? 'users-tag--active' : 'users-tag--inactive'">
                <span class="users-dot" aria-hidden="true" />
                {{ usuario.is_active ? "Ativa" : "Inativa" }}
              </span>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">E-mail</span>
              <span class="users-confirmation" :class="{ 'is-pending': !usuario.email_verified }">
                <CheckCircle2 v-if="usuario.email_verified" :size="16" aria-hidden="true"/>
                <Clock3 v-else :size="16" aria-hidden="true" />
                {{ usuario.email_verified ? "Verificado" : "Pendente" }}
              </span>
            </div>
            <div class="users-cell users-last-access">
              <span class="users-cell-label">Último acesso</span>
              {{ ultimoAcesso(usuario.last_login) }}
            </div>
          </li>
        </ul>
      </template>
      <footer v-if="store.inicializado && store.pagina.count > 0" class="users-footer">
        <span>
          Exibindo {{ numero(inicioPagina) }}–{{ numero(fimPagina) }}
          de {{ numero(store.pagina.count) }}
        </span>
        <nav v-if="store.pagina.total_pages > 1" class="users-pagination" aria-label="Paginação dos usuários">
          <button type="button" :disabled="store.carregando || pagina <= 1" @click="irParaPagina(pagina - 1)">
            <ChevronLeft :size="16" aria-hidden="true" /> Anterior
          </button>
          <span>Página {{ numero(pagina) }} de {{ numero(store.pagina.total_pages) }}</span>
          <button type="button" :disabled="store.carregando || pagina >= store.pagina.total_pages" @click="irParaPagina(pagina + 1)">
            Próxima <ChevronRight :size="16" aria-hidden="true" />
          </button>
        </nav>
      </footer>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3,
  LoaderCircle, Search, ShieldCheck, UsersRound, X,
} from "lucide-vue-next";

import AdminCatalogSelect from "@/components/admin/AdminCatalogSelect.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useAdminUsuariosStore } from "@/stores/adminUsuarios";
import { iniciaisUsuario, ultimoAcesso } from "@/utils/adminUsuarios";

const store = useAdminUsuariosStore();
const busca = ref("");
const perfil = ref("");
const situacao = ref("");
const verificacao = ref("");
const pagina = ref(1);
const POR_PAGINA = 18;

const metricas = [
  { chave: "total", titulo: "Total de contas", legenda: "Cadastradas no sistema" },
  { chave: "clientes", titulo: "Clientes", legenda: "Contas sem acesso ao painel" },
  { chave: "administradores", titulo: "Administradores", legenda: "Contas com acesso ao painel" },
  { chave: "ativas", titulo: "Contas ativas", legenda: "Com acesso permitido" },
];
const perfis = [
  { value: "", label: "Todos os perfis" },
  { value: "admin", label: "Administradores" },
  { value: "cliente", label: "Clientes" },
];
const situacoes = [
  { value: "", label: "Todas as situações" },
  { value: "ativa", label: "Ativas" },
  { value: "inativa", label: "Inativas" },
];
const verificacoes = [
  { value: "", label: "Todos os e-mails" },
  { value: "verificado", label: "Verificados" },
  { value: "pendente", label: "Pendentes" },
];
const filtrosAtivos = computed(() => Boolean(busca.value || perfil.value || situacao.value || verificacao.value));
const inicioPagina = computed(() => (store.pagina.page - 1) * store.pagina.page_size + 1);
const fimPagina = computed(() => (store.pagina.page - 1) * store.pagina.page_size + store.pagina.results.length);
let temporizador = null;

function numero(valor) { return new Intl.NumberFormat("pt-BR").format(valor ?? 0); }
function iniciais(usuario) { return iniciaisUsuario(usuario.name, usuario.email); }
function parametros() {
  return {
    page: pagina.value, page_size: POR_PAGINA,
    busca: busca.value.trim(), perfil: perfil.value,
    situacao: situacao.value, verificacao: verificacao.value,
  };
}
function carregar() { return store.carregar(parametros()); }
const { atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });
function tentarNovamente() { store.carregar(parametros()).catch(() => {}); }
function irParaPagina(numeroPagina) {
  if (numeroPagina < 1 || numeroPagina > store.pagina.total_pages) return;
  pagina.value = numeroPagina;
  store.carregar(parametros()).catch(() => {});
}
function limparFiltros() {
  busca.value = ""; perfil.value = ""; situacao.value = ""; verificacao.value = "";
}
watch([busca, perfil, situacao, verificacao], () => {
  pagina.value = 1;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => {
    store.carregar(parametros()).catch(() => {});
  }, 300);
});
watch(() => store.pagina.total_pages, total => {
  if (pagina.value > total && total > 0 && !store.carregando) {
    pagina.value = total;
    store.carregar(parametros()).catch(() => {});
  }
});
onBeforeUnmount(() => {
  window.clearTimeout(temporizador);
  store.resetar();
});
</script>

<style scoped>
.users-page{color:var(--pp-admin-text)}
.users-header{margin-bottom:23px}
.users-header h1{margin:0 0 7px;font-size:30px;font-weight:650;letter-spacing:-.03em;line-height:1.2}
.users-header p{margin:0;font-size:14px;color:var(--pp-admin-muted);line-height:1.5}
.users-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}
.users-metric{min-width:0;display:flex;flex-direction:column;gap:5px;padding:18px 20px;border:1px solid var(--pp-admin-border);border-radius:12px;background:var(--pp-creme-2)}
.users-metric>span{font-size:13px;color:var(--pp-admin-muted)}
.users-metric strong{font-size:27px;line-height:1.25;font-weight:650;font-variant-numeric:tabular-nums}
.users-metric small{font-size:12px;color:var(--pp-admin-muted);line-height:1.5}
.users-panel{border:1px solid var(--pp-admin-border);border-radius:15px;background:var(--pp-admin-surface);min-width:0}
.users-panel-heading{padding:20px 22px 17px}
.users-panel-heading h2{font-size:18px;font-weight:650;margin:0 0 5px;letter-spacing:-.015em}
.users-panel-heading p{margin:0;font-size:13px;color:var(--pp-admin-muted)}
.users-filters{display:grid;grid-template-columns:minmax(240px,1.4fr) repeat(3,minmax(175px,.65fr));gap:10px;padding:0 22px 18px}
.users-search{display:flex;align-items:center;gap:9px;min-height:46px;padding:0 12px;border:1px solid var(--pp-admin-border);border-radius:11px;color:var(--pp-admin-muted);transition:border-color 160ms ease,box-shadow 160ms ease}
.users-search:hover,.users-search:focus-within{border-color:var(--pp-admin-accent)}
.users-search:focus-within{box-shadow:0 0 0 3px color-mix(in srgb,var(--pp-admin-accent) 12%,transparent)}
.users-search input{flex:1;width:100%;min-width:0;min-height:44px;border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:var(--pp-admin-text)}
.users-search input:focus-visible{outline:0}
.users-search button{display:grid;place-items:center;flex:none;width:30px;height:30px;border:0;border-radius:7px;background:var(--pp-creme-2);color:var(--pp-admin-muted);cursor:pointer}
.users-search button:hover{color:var(--pp-admin-text);background:var(--pp-admin-warning-bg)}
.users-alert{display:flex;gap:10px;align-items:center;padding:13px 20px;background:var(--pp-admin-danger-bg);border-top:1px solid var(--pp-admin-border);font-size:13px;color:var(--pp-admin-danger)}
.users-alert span{flex:1}
.users-retry{min-height:38px;padding:7px 11px;border:1px solid currentColor;border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-size:12px;font-weight:650;cursor:pointer}
.users-empty{min-height:235px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;text-align:center;color:var(--pp-admin-muted);font-size:13px}
.users-empty strong{color:var(--pp-admin-text);font-size:15px}
.users-empty p{margin:0;line-height:1.5}
.users-clear-filters{min-height:38px;padding:8px 12px;margin-top:5px;border:1px solid var(--pp-admin-accent);border-radius:9px;background:var(--pp-admin-surface);color:var(--pp-admin-accent);font-size:12px;font-weight:650;cursor:pointer}
.users-clear-filters:hover{background:var(--pp-creme-2)}
.users-table-head,.users-row{display:grid;grid-template-columns:minmax(230px,2fr) minmax(130px,1fr) 105px 120px minmax(150px,.85fr);align-items:center;gap:12px}
.users-table-head{padding:13px 22px;background:var(--pp-creme-2);border-top:1px solid var(--pp-admin-border);border-bottom:1px solid var(--pp-admin-border);font-size:12px;font-weight:650;color:var(--pp-admin-muted)}
.users-list{list-style:none;padding:0;margin:0}
.users-row{padding:16px 22px;border-bottom:1px solid var(--pp-admin-border);transition:background-color 180ms ease}
.users-row:last-child{border-bottom:0}
.users-row:hover{background:color-mix(in srgb,var(--pp-creme-2) 42%,var(--pp-admin-surface))}
.users-identity{display:flex;align-items:center;gap:12px;min-width:0}
.users-avatar{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:12px;background:var(--pp-creme-2);color:var(--pp-admin-accent);font-size:14px;font-weight:700;letter-spacing:.02em}
.users-name{min-width:0}
.users-name strong{display:block;font-size:13px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
.users-name>span{display:block;font-size:12px;color:var(--pp-admin-muted);margin-top:3px;overflow-wrap:anywhere}
.users-tag{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:7px 9px;border-radius:8px;background:var(--pp-creme-2);color:var(--pp-admin-text);font-size:12px;font-weight:650;white-space:nowrap}
.users-tag--staff{background:var(--pp-admin-warning-bg);color:var(--pp-admin-accent)}
.users-tag--active{background:var(--pp-admin-success-bg)}
.users-tag--inactive{background:var(--pp-admin-danger-bg);color:var(--pp-admin-danger)}
.users-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--pp-admin-success)}
.users-tag--inactive .users-dot{background:var(--pp-admin-danger)}
.users-confirmation{display:inline-flex;align-items:center;gap:7px;color:var(--pp-admin-success);font-size:12px;font-weight:600}
.users-confirmation.is-pending{color:var(--pp-admin-muted)}
.users-last-access{font-size:12px;color:var(--pp-admin-muted);line-height:1.5;font-variant-numeric:tabular-nums}
.users-cell-label{display:none}
.users-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 22px;border-top:1px solid var(--pp-admin-border);font-size:13px;color:var(--pp-admin-muted)}
.users-pagination{display:flex;align-items:center;gap:10px}
.users-pagination button{display:inline-flex;gap:4px;align-items:center;justify-content:center;min-height:38px;padding:8px 11px;border:1px solid var(--pp-admin-border);border-radius:8px;background:var(--pp-admin-surface);color:var(--pp-admin-text);font:inherit;font-weight:600;cursor:pointer}
.users-pagination button:hover:not(:disabled){border-color:var(--pp-admin-accent);background:var(--pp-creme-2)}
.users-pagination button:disabled{opacity:.5;cursor:not-allowed}
.users-spinner{animation:users-spin .85s linear infinite}
@keyframes users-spin{to{transform:rotate(360deg)}}
@media(max-width:1200px){.users-table-head,.users-row{grid-template-columns:minmax(220px,2fr) minmax(120px,1fr) 105px 110px minmax(130px,.75fr);gap:10px}.users-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.users-search{grid-column:1/-1}}
@media(max-width:960px){.users-table-head{display:none}.users-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 15px 17px}.users-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;border:1px solid var(--pp-admin-border);border-radius:12px;padding:16px}.users-identity{grid-column:1/-1}.users-cell-label{display:block;font-size:12px;color:var(--pp-admin-muted);margin-bottom:5px}.users-last-access{grid-column:1/-1}.users-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:660px){.users-header h1{font-size:27px}.users-filters{grid-template-columns:1fr;padding:0 15px 17px}.users-search{grid-column:auto}.users-panel-heading{padding:18px 16px 15px}.users-metric{padding:15px}.users-metric strong{font-size:24px}.users-list{grid-template-columns:1fr;padding:0 12px 15px}.users-footer{padding:14px 16px;flex-wrap:wrap}.users-pagination{width:100%;justify-content:space-between}.users-pagination span{font-size:12px}}
@media(prefers-reduced-motion:reduce){.users-page *{transition:none!important;animation:none!important}}
</style>
