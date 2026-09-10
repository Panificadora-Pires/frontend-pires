<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <h1 class="admin-page-title">Usuários</h1>
        <p class="admin-page-subtitle">
          Consulte clientes e administradores cadastrados no sistema.
        </p>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" @click="carregar">
          <RefreshCw :size="16" />Atualizar
        </button>
      </div>
    </header>

    <div class="admin-kpis users-kpis">
      <article class="admin-kpi">
        <span class="admin-kpi-label">Total</span
        ><strong class="admin-kpi-value">{{ usuarios.length }}</strong
        ><span class="admin-kpi-caption">Contas cadastradas</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Administradores</span
        ><strong class="admin-kpi-value">{{ admins }}</strong
        ><span class="admin-kpi-caption">Contas com acesso ao painel</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Contas ativas</span
        ><strong class="admin-kpi-value">{{ ativos }}</strong
        ><span class="admin-kpi-caption">Usuários com acesso permitido</span>
      </article>
      <article class="admin-kpi">
        <span class="admin-kpi-label">Clientes</span
        ><strong class="admin-kpi-value">{{ clientes }}</strong
        ><span class="admin-kpi-caption">Contas sem perfil administrativo</span>
      </article>
    </div>

    <div class="admin-toolbar">
      <label class="admin-search"
        ><Search :size="16" /><input
          v-model="busca"
          placeholder="Buscar por nome ou e-mail"
      /></label>
      <select v-model="tipo" class="admin-select">
        <option value="">Todos os perfis</option>
        <option value="admin">Administradores</option>
        <option value="cliente">Clientes</option>
      </select>
    </div>

    <div v-if="erro" class="admin-alert admin-alert--error">
      <CircleAlert :size="17" />{{ erro }}
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table users-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Situação</th>
            <th>E-mail verificado</th>
            <th>Último login</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtrados" :key="u.id">
            <td>
              <strong>{{ u.name || "Sem nome" }}</strong
              ><small>{{ u.email }}</small>
            </td>
            <td>
              <span
                class="admin-badge"
                :class="
                  u.is_staff ? 'admin-badge--info' : 'admin-badge--neutral'
                "
                >{{ u.is_staff ? "Administrador" : "Cliente" }}</span
              >
            </td>
            <td>
              <span
                class="admin-badge"
                :class="
                  u.is_active ? 'admin-badge--success' : 'admin-badge--danger'
                "
                >{{ u.is_active ? "Ativa" : "Inativa" }}</span
              >
            </td>
            <td>{{ u.email_verified ? "Sim" : "Não" }}</td>
            <td>{{ data(u.last_login) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="users-note">
      A API atual disponibiliza consulta de usuários para administradores.
      Alterações de conta continuam restritas ao backend/Django Admin.
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { CircleAlert, RefreshCw, Search } from "lucide-vue-next";
import adminService from "@/services/admin.service";

const usuarios = ref([]);
const busca = ref("");
const tipo = ref("");
const erro = ref("");
const admins = computed(() => usuarios.value.filter((u) => u.is_staff).length);
const ativos = computed(() => usuarios.value.filter((u) => u.is_active).length);
const clientes = computed(
  () => usuarios.value.filter((u) => !u.is_staff).length,
);
const filtrados = computed(() => {
  const q = busca.value.toLowerCase().trim();
  return usuarios.value.filter(
    (u) =>
      (!tipo.value || (tipo.value === "admin" ? u.is_staff : !u.is_staff)) &&
      (!q ||
        String(u.name || "")
          .toLowerCase()
          .includes(q) ||
        String(u.email || "")
          .toLowerCase()
          .includes(q)),
  );
});
function data(v) {
  return v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(v))
    : "Nunca";
}
async function carregar() {
  try {
    usuarios.value = await adminService.listarUsuarios();
  } catch {
    erro.value = "Não foi possível carregar os usuários.";
  }
}
onMounted(carregar);
</script>

<style scoped>
.users-kpis {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.users-table {
  min-width: 850px;
}
.users-note {
  margin: 10px 2px 0;
  color: var(--admin-muted);
  font-size: 11px;
  line-height: 1.45;
}
@media (max-width: 1050px) {
  .users-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
