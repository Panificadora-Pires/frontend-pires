<template>
  <section class="admin-page users-page">
    <header class="users-header">
      <h1>Usuários</h1>
      <p>Consulte as contas de clientes e da equipe cadastradas na Pires.</p>
    </header>

    <section class="users-metrics" aria-label="Resumo das contas">
      <article
        v-for="metrica in metricas"
        :key="metrica.chave"
        class="users-metric"
      >
        <span>{{ metrica.titulo }}</span>
        <strong>{{
          store.resumo ? numero(store.resumo[metrica.chave]) : "—"
        }}</strong>
        <small>{{ metrica.legenda }}</small>
      </article>
    </section>

    <section class="users-panel" aria-labelledby="users-list-title">
      <header class="users-panel-heading">
        <h2 id="users-list-title">Contas cadastradas</h2>
        <p v-if="store.inicializado">
          {{ numero(store.pagina.count) }}
          {{
            store.pagina.count === 1 ? "conta encontrada" : "contas encontradas"
          }}
        </p>
        <p v-else>Encontre clientes e administradores por nome ou e-mail.</p>
      </header>

      <div class="users-filters">
        <div class="users-search" role="search">
          <Search :size="17" aria-hidden="true" />
          <input
            v-model="busca"
            type="search"
            maxlength="100"
            autocomplete="off"
            aria-label="Buscar usuários por nome ou e-mail"
            placeholder="Buscar por nome ou e-mail"
          />
          <button
            v-if="busca"
            type="button"
            aria-label="Limpar busca"
            @click="busca = ''"
          >
            <X :size="17" aria-hidden="true" />
          </button>
        </div>
        <AdminCatalogSelect
          v-model="perfil"
          aria-label="Filtrar por perfil"
          :options="perfis"
        />
        <AdminCatalogSelect
          v-model="situacao"
          aria-label="Filtrar por situação"
          :options="situacoes"
        />
        <AdminCatalogSelect
          v-model="verificacao"
          aria-label="Filtrar por e-mail verificado"
          :options="verificacoes"
        />
      </div>

      <div v-if="store.erro" class="users-alert" role="alert">
        <CircleAlert :size="18" aria-hidden="true" />
        <span>{{ store.erro }}</span>
        <button
          type="button"
          class="users-retry pp-card-action pp-admin-action--secondary"
          data-card-action-radius
          @click="tentarNovamente"
        >
          <CardActionContent>Tentar novamente</CardActionContent>
        </button>
      </div>

      <div
        v-if="!store.inicializado && !store.erro"
        class="users-empty"
        role="status"
      >
        <LoaderCircle :size="21" aria-hidden="true" class="users-spinner" />
        Carregando contas…
      </div>
      <div
        v-else-if="store.inicializado && store.pagina.count === 0"
        class="users-empty"
      >
        <UsersRound :size="29" aria-hidden="true" />
        <strong>{{
          filtrosAtivos
            ? "Nenhuma conta encontrada"
            : "Nenhuma conta cadastrada"
        }}</strong>
        <p>
          {{
            filtrosAtivos
              ? "Experimente outros filtros ou outra busca."
              : "As contas cadastradas aparecerão nesta lista."
          }}
        </p>
        <button
          v-if="filtrosAtivos"
          type="button"
          class="users-clear-filters"
          @click="limparFiltros"
        >
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
          <li
            v-for="usuario in store.pagina.results"
            :key="usuario.id"
            class="users-row"
          >
            <div class="users-identity">
              <div class="users-avatar" aria-hidden="true">
                {{ iniciais(usuario) }}
              </div>
              <div class="users-name">
                <strong>{{ usuario.name || "Sem nome informado" }}</strong>
                <span>{{ usuario.email }}</span>
              </div>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">Perfil</span>
              <span
                class="users-tag"
                :class="{ 'users-tag--staff': usuario.is_staff }"
              >
                <ShieldCheck
                  v-if="usuario.is_staff"
                  :size="14"
                  aria-hidden="true"
                />
                {{ usuario.is_staff ? "Administrador" : "Cliente" }}
              </span>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">Situação</span>
              <span
                class="users-tag"
                :class="
                  usuario.is_active
                    ? 'users-tag--active'
                    : 'users-tag--inactive'
                "
              >
                <span class="users-dot" aria-hidden="true" />
                {{ usuario.is_active ? "Ativa" : "Inativa" }}
              </span>
            </div>
            <div class="users-cell">
              <span class="users-cell-label">E-mail</span>
              <span
                class="users-confirmation"
                :class="{ 'is-pending': !usuario.email_verified }"
              >
                <CheckCircle2
                  v-if="usuario.email_verified"
                  :size="16"
                  aria-hidden="true"
                />
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
      <footer
        v-if="store.inicializado && store.pagina.count > 0"
        class="users-footer"
      >
        <span>
          Exibindo {{ numero(inicioPagina) }}–{{ numero(fimPagina) }} de
          {{ numero(store.pagina.count) }}
        </span>
        <nav
          v-if="store.pagina.total_pages > 1"
          class="users-pagination"
          aria-label="Paginação dos usuários"
        >
          <button
            type="button"
            :disabled="store.carregando || pagina <= 1"
            @click="irParaPagina(pagina - 1)"
          >
            <ChevronLeft :size="16" aria-hidden="true" /> Anterior
          </button>
          <span
            >Página {{ numero(pagina) }} de
            {{ numero(store.pagina.total_pages) }}</span
          >
          <button
            type="button"
            :disabled="store.carregando || pagina >= store.pagina.total_pages"
            @click="irParaPagina(pagina + 1)"
          >
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Search,
  ShieldCheck,
  UsersRound,
  X,
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
  {
    chave: "total",
    titulo: "Total de contas",
    legenda: "Cadastradas no sistema",
  },
  {
    chave: "clientes",
    titulo: "Clientes",
    legenda: "Contas sem acesso ao painel",
  },
  {
    chave: "administradores",
    titulo: "Administradores",
    legenda: "Contas com acesso ao painel",
  },
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
const filtrosAtivos = computed(() =>
  Boolean(busca.value || perfil.value || situacao.value || verificacao.value),
);
const inicioPagina = computed(
  () => (store.pagina.page - 1) * store.pagina.page_size + 1,
);
const fimPagina = computed(
  () =>
    (store.pagina.page - 1) * store.pagina.page_size +
    store.pagina.results.length,
);
let temporizador = null;

function numero(valor) {
  return new Intl.NumberFormat("pt-BR").format(valor ?? 0);
}
function iniciais(usuario) {
  return iniciaisUsuario(usuario.name, usuario.email);
}
function parametros() {
  return {
    page: pagina.value,
    page_size: POR_PAGINA,
    busca: busca.value.trim(),
    perfil: perfil.value,
    situacao: situacao.value,
    verificacao: verificacao.value,
  };
}
function carregar() {
  return store.carregar(parametros());
}
const { atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });
function tentarNovamente() {
  store.carregar(parametros()).catch(() => {});
}
function irParaPagina(numeroPagina) {
  if (numeroPagina < 1 || numeroPagina > store.pagina.total_pages) return;
  pagina.value = numeroPagina;
  store.carregar(parametros()).catch(() => {});
}
function limparFiltros() {
  busca.value = "";
  perfil.value = "";
  situacao.value = "";
  verificacao.value = "";
}
watch([busca, perfil, situacao, verificacao], () => {
  pagina.value = 1;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => {
    store.carregar(parametros()).catch(() => {});
  }, 300);
});
watch(
  () => store.pagina.total_pages,
  (total) => {
    if (pagina.value > total && total > 0 && !store.carregando) {
      pagina.value = total;
      store.carregar(parametros()).catch(() => {});
    }
  },
);
onBeforeUnmount(() => {
  window.clearTimeout(temporizador);
  store.resetar();
});
</script>

<style scoped src="./AdminUsuariosView.css"></style>
