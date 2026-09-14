<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <RouterLink
        :to="{ name: 'admin-dashboard' }"
        class="admin-brand"
        aria-label="Pires Panificadora - Administração"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
        <div>
          <strong>Pires Panificadora</strong>
          <span>Administração</span>
        </div>
      </RouterLink>

      <nav class="admin-nav" aria-label="Navegação administrativa">
        <div
          v-for="grupo in navGroups"
          :key="grupo.label"
          class="admin-nav__group"
        >
          <span class="admin-nav__group-label">{{ grupo.label }}</span>
          <RouterLink
            v-for="item in grupo.items"
            :key="item.name"
            :to="{ name: item.name }"
            class="admin-nav__item"
            exact-active-class="is-active"
          >
            <component :is="item.icon" :size="18" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="admin-nav__badge">{{
              limitarBadge(item.badge)
            }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="admin-sidebar__footer">
        <div class="admin-user">
          <span class="admin-user__avatar">{{ iniciais }}</span>
          <div class="admin-user__copy">
            <strong>{{ auth.usuario?.name || "Administrador" }}</strong>
            <span>{{ auth.usuario?.email || "Conta administrativa" }}</span>
          </div>
          <button
            type="button"
            class="admin-user__logout"
            title="Sair"
            aria-label="Sair da conta"
            @click="handleLogout"
          >
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </aside>

    <header class="admin-mobile-header">
      <button
        type="button"
        class="admin-mobile-header__button"
        aria-label="Abrir menu"
        @click="menuAberto = true"
      >
        <Menu :size="21" />
      </button>
      <RouterLink
        :to="{ name: 'admin-dashboard' }"
        class="admin-mobile-header__brand"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
        <strong>Administração</strong>
      </RouterLink>
      <span class="admin-user__avatar admin-user__avatar--mobile">{{
        iniciais
      }}</span>
    </header>

    <Transition name="admin-drawer">
      <div
        v-if="menuAberto"
        class="admin-drawer-backdrop"
        @click="menuAberto = false"
      >
        <aside class="admin-drawer" @click.stop>
          <div class="admin-drawer__header">
            <RouterLink
              :to="{ name: 'admin-dashboard' }"
              class="admin-brand"
              @click="menuAberto = false"
            >
              <img src="/logo.png" alt="Pires Panificadora" />
              <div>
                <strong>Pires Panificadora</strong><span>Administração</span>
              </div>
            </RouterLink>
            <button
              type="button"
              class="admin-mobile-header__button"
              aria-label="Fechar menu"
              @click="menuAberto = false"
            >
              <X :size="20" />
            </button>
          </div>

          <nav class="admin-nav">
            <div
              v-for="grupo in navGroups"
              :key="grupo.label"
              class="admin-nav__group"
            >
              <span class="admin-nav__group-label">{{ grupo.label }}</span>
              <RouterLink
                v-for="item in grupo.items"
                :key="item.name"
                :to="{ name: item.name }"
                class="admin-nav__item"
                exact-active-class="is-active"
                @click="menuAberto = false"
              >
                <component :is="item.icon" :size="18" />
                <span>{{ item.label }}</span>
                <span v-if="item.badge" class="admin-nav__badge">{{
                  limitarBadge(item.badge)
                }}</span>
              </RouterLink>
            </div>
          </nav>

          <button
            type="button"
            class="admin-drawer__logout"
            @click="handleLogout"
          >
            <LogOut :size="18" />
            Sair da conta
          </button>
        </aside>
      </div>
    </Transition>

    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Tags,
  Users,
  X,
} from "lucide-vue-next";

import "@/assets/styles/admin.css";
import adminService from "@/services/admin.service";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const menuAberto = ref(false);
const pendentes = ref(0);
const prontos = ref(0);
let timer = null;

const iniciais = computed(() => {
  const nome = auth.usuario?.name || auth.usuario?.email || "Admin";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "AD"
  );
});

const navGroups = computed(() => [
  {
    label: "Visão geral",
    items: [
      { name: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operação",
    items: [
      {
        name: "admin-pedidos",
        label: "Pedidos",
        icon: ClipboardList,
        badge: pendentes.value + prontos.value || null,
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { name: "admin-produtos", label: "Produtos", icon: Boxes },
      { name: "admin-categorias", label: "Categorias", icon: Layers3 },
      { name: "admin-promocoes", label: "Promoções", icon: Tags },
    ],
  },
  {
    label: "Gestão",
    items: [
      { name: "admin-relatorios", label: "Relatórios", icon: BarChart3 },
      { name: "admin-usuarios", label: "Usuários", icon: Users },
    ],
  },
]);

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
}

async function atualizarContadores() {
  try {
    const [listaPendentes, listaProntos] = await Promise.all([
      adminService.listarPedidos({ status: "pendente" }),
      adminService.listarPedidos({ status: "pronto" }),
    ]);
    pendentes.value = listaPendentes.length;
    prontos.value = listaProntos.length;
  } catch {
    pendentes.value = 0;
    prontos.value = 0;
  }
}

async function handleLogout() {
  menuAberto.value = false;
  await auth.logout();
  await router.replace({ name: "login" });
}

onMounted(() => {
  atualizarContadores();
  timer = window.setInterval(atualizarContadores, 30_000);
});

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  background: var(--admin-bg);
  color: var(--admin-text);
}

.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 18px 14px 14px;
  border-right: 1px solid #292524;
  background: #1c1917;
  color: #e7e5e4;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 18px;
  color: inherit;
}

.admin-brand img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}
.admin-brand strong,
.admin-brand span {
  display: block;
}
.admin-brand strong {
  color: #fafaf9;
  font-size: 13px;
  font-weight: 700;
}
.admin-brand span {
  margin-top: 2px;
  color: #a8a29e;
  font-size: 11px;
}

.admin-nav {
  display: grid;
  gap: 20px;
  padding-top: 8px;
}
.admin-nav__group {
  display: grid;
  gap: 4px;
}
.admin-nav__group-label {
  padding: 0 10px 5px;
  color: #78716c;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.admin-nav__item {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #c7c3bf;
  font-size: 13px;
  font-weight: 600;
  transition:
    background 140ms ease,
    color 140ms ease;
}
.admin-nav__item:hover {
  background: #292524;
  color: #fafaf9;
}
.admin-nav__item.is-active {
  background: #34302d;
  color: #fff;
}
.admin-nav__item.is-active svg {
  color: #d6a13c;
}
.admin-nav__badge {
  margin-left: auto;
  min-width: 22px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  padding: 0 6px;
  border-radius: 999px;
  background: #44403c;
  color: #f5deb1;
  font-size: 10px;
  font-weight: 700;
}

.admin-sidebar__footer {
  margin-top: auto;
  padding-top: 18px;
}
.admin-user {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;
  padding: 10px 8px 0;
  border-top: 1px solid #292524;
}
.admin-user__avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #44403c;
  color: #f5deb1;
  font-size: 11px;
  font-weight: 750;
}
.admin-user__copy {
  min-width: 0;
}
.admin-user__copy strong,
.admin-user__copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-user__copy strong {
  color: #f5f5f4;
  font-size: 12px;
}
.admin-user__copy span {
  margin-top: 2px;
  color: #78716c;
  font-size: 10px;
}
.admin-user__logout {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #a8a29e;
  cursor: pointer;
}
.admin-user__logout:hover {
  background: #292524;
  color: #fff;
}

.admin-main {
  min-width: 0;
  padding: 30px 34px 48px;
}
.admin-mobile-header {
  display: none;
}
.admin-drawer-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .admin-layout {
    display: block;
  }
  .admin-sidebar {
    display: none;
  }
  .admin-mobile-header {
    position: sticky;
    top: 0;
    z-index: 70;
    height: 58px;
    display: grid;
    grid-template-columns: 40px 1fr 34px;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    border-bottom: 1px solid var(--admin-border);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  }
  .admin-mobile-header__button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--admin-border);
    border-radius: 8px;
    background: #fff;
    color: var(--admin-text-soft);
  }
  .admin-mobile-header__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--admin-text);
  }
  .admin-mobile-header__brand img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }
  .admin-mobile-header__brand strong {
    font-size: 13px;
  }
  .admin-user__avatar--mobile {
    justify-self: end;
    background: #292524;
    color: #f5deb1;
  }
  .admin-main {
    padding: 22px 16px 36px;
  }
  .admin-drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: block;
    background: rgba(28, 25, 23, 0.42);
  }
  .admin-drawer {
    width: min(310px, 88vw);
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 14px;
    background: #1c1917;
    color: #e7e5e4;
    box-shadow: 20px 0 50px rgba(28, 25, 23, 0.18);
  }
  .admin-drawer__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .admin-drawer .admin-brand {
    padding-left: 4px;
  }
  .admin-drawer .admin-mobile-header__button {
    border-color: #34302d;
    background: #292524;
    color: #d6d3d1;
  }
  .admin-drawer__logout {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: auto;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: #292524;
    color: #d6d3d1;
    font-size: 13px;
    font-weight: 600;
  }
  .admin-drawer-enter-active,
  .admin-drawer-leave-active {
    transition: opacity 150ms ease;
  }
  .admin-drawer-enter-from,
  .admin-drawer-leave-to {
    opacity: 0;
  }
}
</style>
