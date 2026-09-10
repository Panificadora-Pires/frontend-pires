<template>
  <div class="student-layout">
    <aside class="student-layout__sidebar">
      <RouterLink
        :to="{ name: 'home' }"
        class="student-layout__brand"
        aria-label="Pires Panificadora - Início"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>

      <nav class="student-layout__nav" aria-label="Navegação principal">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="student-layout__nav-item"
          exact-active-class="is-active"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="student-layout__badge">{{
            limitarBadge(item.badge)
          }}</span>
        </RouterLink>
      </nav>

      <div class="student-layout__user-card">
        <RouterLink :to="{ name: 'perfil' }" class="student-layout__user">
          <span class="student-layout__avatar">
            <img
              v-if="avatarDisponivel"
              :src="auth.usuario.avatar"
              :alt="`Foto de ${auth.usuario?.name || 'usuário'}`"
              @error="avatarComErro = true"
            />
            <template v-else>{{ iniciais }}</template>
          </span>
          <div class="student-layout__user-info">
            <strong>{{ auth.usuario?.name || "Aluno" }}</strong>
            <span>{{ auth.isAdmin ? "Administração" : "Cliente" }}</span>
          </div>
        </RouterLink>

        <button
          type="button"
          class="student-layout__logout"
          aria-label="Sair da conta"
          title="Sair da conta"
          @click="handleLogout"
        >
          <LogOut :size="18" />
        </button>
      </div>
    </aside>

    <header class="student-layout__mobile-header">
      <button
        type="button"
        class="student-layout__menu-btn"
        aria-label="Abrir menu"
        @click="menuAberto = true"
      >
        <Menu :size="22" />
      </button>

      <RouterLink
        :to="{ name: 'home' }"
        class="student-layout__mobile-brand"
        aria-label="Pires Panificadora - Início"
      >
        <img
          src="/logo.png"
          alt="Pires Panificadora"
          class="student-layout__mobile-logo"
        />
      </RouterLink>

      <div class="student-layout__mobile-actions">
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="student-layout__icon-btn"
          aria-label="Notificações"
        >
          <Bell :size="19" />
          <span
            v-if="notifications.naoLidas"
            class="student-layout__badge-dot"
            >{{ limitarBadge(notifications.naoLidas) }}</span
          >
        </RouterLink>
        <RouterLink
          :to="{ name: 'carrinho' }"
          class="student-layout__icon-btn"
          aria-label="Carrinho"
        >
          <ShoppingCart :size="19" />
          <span v-if="cart.totalItens" class="student-layout__badge-dot">{{
            limitarBadge(cart.totalItens)
          }}</span>
        </RouterLink>
      </div>
    </header>

    <Transition name="drawer-fade">
      <div
        v-if="menuAberto"
        class="student-layout__drawer-backdrop"
        @click="menuAberto = false"
      >
        <aside class="student-layout__drawer" @click.stop>
          <div class="student-layout__drawer-head">
            <img
              src="/logo.png"
              alt="Pires Panificadora"
              class="student-layout__drawer-logo"
            />
            <button
              type="button"
              aria-label="Fechar menu"
              @click="menuAberto = false"
            >
              <X :size="20" />
            </button>
          </div>

          <nav class="student-layout__nav" aria-label="Menu mobile">
            <RouterLink
              v-for="item in navItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="student-layout__nav-item"
              exact-active-class="is-active"
              @click="menuAberto = false"
            >
              <component :is="item.icon" :size="20" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="student-layout__badge">{{
                limitarBadge(item.badge)
              }}</span>
            </RouterLink>
          </nav>

          <button
            type="button"
            class="student-layout__drawer-logout"
            @click="handleLogout"
          >
            <LogOut :size="19" />
            <span>Sair da conta</span>
          </button>
        </aside>
      </div>
    </Transition>

    <main class="student-layout__main">
      <RouterView />
    </main>

    <nav class="student-layout__bottom-nav" aria-label="Navegação rápida">
      <RouterLink
        v-for="item in bottomNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="student-layout__bottom-item"
        exact-active-class="is-active"
      >
        <span class="student-layout__bottom-icon-wrap">
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span
            v-if="item.badge"
            class="student-layout__badge-dot student-layout__badge-dot--bottom"
          >
            {{ limitarBadge(item.badge) }}
          </span>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Tag,
  User,
  X,
} from "lucide-vue-next";

import catalogService, { promocaoEstaAtiva } from "@/services/catalog.service";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useNotificationsStore } from "@/stores/notifications";

const auth = useAuthStore();
const cart = useCartStore();
const notifications = useNotificationsStore();
const router = useRouter();

const menuAberto = ref(false);
const promoCount = ref(0);
const avatarComErro = ref(false);

const avatarDisponivel = computed(
  () => Boolean(auth.usuario?.avatar) && !avatarComErro.value,
);

watch(
  () => auth.usuario?.avatar,
  () => {
    avatarComErro.value = false;
  },
);

const iniciais = computed(() => {
  const nome = auth.usuario?.name || "";
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "A"
  );
});

const navItems = computed(() => [
  { name: "home", label: "Início", icon: Home },
  { name: "cardapio", label: "Cardápio", icon: LayoutGrid },
  {
    name: "promocoes",
    label: "Promoções",
    icon: Tag,
    badge: promoCount.value || null,
  },
  {
    name: "carrinho",
    label: "Meu Carrinho",
    icon: ShoppingCart,
    badge: cart.totalItens || null,
  },
  { name: "pedidos", label: "Meus Pedidos", icon: ClipboardList },
  { name: "favoritos", label: "Favoritos", icon: Heart },
  {
    name: "notificacoes",
    label: "Notificações",
    icon: Bell,
    badge: notifications.naoLidas || null,
  },
  { name: "perfil", label: "Perfil", icon: User },
]);

const bottomNavItems = computed(() => [
  { name: "home", label: "Início", icon: Home },
  { name: "cardapio", label: "Cardápio", icon: LayoutGrid },
  {
    name: "carrinho",
    label: "Carrinho",
    icon: ShoppingCart,
    badge: cart.totalItens || null,
  },
  { name: "pedidos", label: "Pedidos", icon: ClipboardList },
  { name: "perfil", label: "Perfil", icon: User },
]);

function limitarBadge(valor) {
  const numero = Number(valor || 0);
  return numero > 99 ? "99+" : numero;
}

async function handleLogout() {
  menuAberto.value = false;
  await auth.logout();
  await router.replace({ name: "login" });
}

async function buscarPromocoesAtivas() {
  try {
    const lista = await catalogService.listarPromocoes();
    promoCount.value = lista.filter((promocao) =>
      promocaoEstaAtiva(promocao),
    ).length;
  } catch {
    promoCount.value = 0;
  }
}

onMounted(() => {
  notifications.iniciarPolling();
  buscarPromocoesAtivas();
});

onBeforeUnmount(() => {
  notifications.pararPolling();
});
</script>

<style scoped>
.student-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
}
.student-layout__sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px 14px 16px;
  background: var(--student-sidebar);
  border-right: 1px solid #38281e;
  color: #efe6dc;
  overflow-y: auto;
}
.student-layout__brand {
  height: 54px;
  display: flex;
  align-items: center;
  padding: 0 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 14px;
}
.student-layout__brand img {
  width: 150px;
  max-height: 40px;
  object-fit: contain;
  object-position: left center;
}
.student-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.student-layout__nav-item {
  min-height: 42px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border-radius: 7px;
  color: #c9beb4;
  font-size: 13px;
  font-weight: 600;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.student-layout__nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
  color: #fff;
}
.student-layout__nav-item.is-active {
  background: rgba(224, 168, 62, 0.13);
  color: #f6d79f;
}
.student-layout__nav-item.is-active::before {
  content: "";
  position: absolute;
  width: 3px;
  height: 20px;
  margin-left: -11px;
  border-radius: 0 3px 3px 0;
  background: #d99b35;
}
.student-layout__nav-item {
  position: relative;
}
.student-layout__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #d99b35;
  color: #24160c;
  font-size: 10px;
  font-weight: 800;
}
.student-layout__user-card {
  margin-top: auto;
  padding: 14px 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}
.student-layout__user {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.student-layout__avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #4a3425;
  color: #f5e6d5;
  font-size: 11px;
  font-weight: 700;
}
.student-layout__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.student-layout__user-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.student-layout__user-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f7f1ea;
  font-size: 12px;
  font-weight: 650;
}
.student-layout__user-info span {
  color: #998b7f;
  font-size: 10px;
}
.student-layout__logout,
.student-layout__icon-btn,
.student-layout__menu-btn {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.student-layout__logout {
  width: 34px;
  height: 34px;
  color: #a99c91;
  border-radius: 7px;
}
.student-layout__logout:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.student-layout__main {
  min-width: 0;
  padding: 32px 34px 46px;
}
.student-layout__mobile-header,
.student-layout__bottom-nav {
  display: none;
}
.student-layout__drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(20, 14, 10, 0.45);
}
.student-layout__drawer {
  width: min(310px, 86vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 14px;
  background: var(--student-sidebar);
  color: #efe6dc;
}
.student-layout__drawer-head {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.student-layout__drawer-logo {
  width: 145px;
  max-height: 34px;
  object-fit: contain;
  object-position: left center;
}
.student-layout__drawer-head button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #c9beb4;
}
.student-layout__drawer-logout {
  margin-top: auto;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 7px;
  background: transparent;
  color: #c9beb4;
}
.student-layout__mobile-brand img {
  display: block;
}
.student-layout__badge-dot {
  position: absolute;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #b8791f;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
}
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.16s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
@media (max-width: 980px) {
  .student-layout {
    display: block;
    padding-top: 58px;
    padding-bottom: 66px;
  }
  .student-layout__sidebar {
    display: none;
  }
  .student-layout__mobile-header {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    height: 58px;
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    background: #fff;
    border-bottom: 1px solid var(--student-border);
  }
  .student-layout__menu-btn {
    width: 38px;
    height: 38px;
    color: var(--student-text);
    border-radius: 7px;
  }
  .student-layout__mobile-brand {
    justify-self: center;
  }
  .student-layout__mobile-logo {
    height: 32px;
    width: auto;
    max-width: 145px;
    object-fit: contain;
  }
  .student-layout__mobile-actions {
    display: flex;
    gap: 4px;
  }
  .student-layout__icon-btn {
    position: relative;
    width: 38px;
    height: 38px;
    color: var(--student-text);
    border-radius: 7px;
  }
  .student-layout__icon-btn .student-layout__badge-dot {
    top: 1px;
    right: 0;
  }
  .student-layout__main {
    padding: 22px 18px 34px;
  }
  .student-layout__bottom-nav {
    position: fixed;
    inset: auto 0 0;
    z-index: 50;
    height: 64px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 5px max(4px, env(safe-area-inset-right))
      max(5px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));
    background: #fff;
    border-top: 1px solid var(--student-border);
  }
  .student-layout__bottom-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: #817971;
    font-size: 9px;
    font-weight: 600;
  }
  .student-layout__bottom-item.is-active {
    color: var(--student-accent-hover);
  }
  .student-layout__bottom-icon-wrap {
    position: relative;
    display: grid;
    place-items: center;
    width: 28px;
    height: 24px;
  }
  .student-layout__badge-dot--bottom {
    top: -5px;
    right: -6px;
  }
}
@media (max-width: 520px) {
  .student-layout__main {
    padding: 18px 13px 28px;
  }
}
</style>
