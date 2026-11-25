<script setup>
import {
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-vue-next";
import StudentHeaderPanel from "@/components/layout/StudentHeaderPanel.vue";
import { useCabecalhoAluno } from "@/composables/useCabecalhoAluno";

defineProps({ carrinhoPulando: { type: Boolean, default: false } });
const emit = defineEmits(["logout"]);
const {
  abrirComTeclado,
  agendarFechamento,
  alternar,
  alternarMobile,
  aoEntrar,
  aoEscape,
  ativarPainel,
  auth,
  avatarComErro,
  badge,
  botaoMobile,
  buscar,
  cancelarFechamento,
  carrinho,
  cart,
  desativarPainel,
  fechar,
  indicador,
  iniciais,
  itens,
  mobileAberto,
  mostrarBusca,
  navegacao,
  notifications,
  painel,
  raiz,
  registrarGatilho,
  rotuloCarrinho,
  rotuloNotificacoes,
  route,
  sair,
  sairFoco,
  termoBusca,
} = useCabecalhoAluno(emit);

defineExpose({ elementoCarrinho: () => carrinho.value?.$el || null });
</script>

<template>
  <header
    ref="raiz"
    class="student-header"
    :class="{
      'is-expanded': painel || mobileAberto,
      'student-header--without-search': !mostrarBusca,
    }"
    @keydown.esc="aoEscape"
    @focusout="sairFoco"
    @pointerleave="agendarFechamento"
    @pointerenter="cancelarFechamento"
  >
    <div class="student-header__bar">
      <button
        ref="botaoMobile"
        type="button"
        class="student-header__icon student-header__mobile-toggle"
        :aria-label="mobileAberto ? 'Fechar menu' : 'Abrir menu'"
        :aria-expanded="mobileAberto"
        aria-controls="navegacao-mobile"
        @click="alternarMobile"
      >
        <X v-if="mobileAberto" :size="22" aria-hidden="true" /><Menu
          v-else
          :size="22"
          aria-hidden="true"
        />
      </button>
      <RouterLink
        :to="{ name: 'home' }"
        class="student-header__brand"
        aria-label="Pires Panificadora - Início"
        @click="fechar()"
      >
        <img src="/logo.png" alt="Pires Panificadora" />
      </RouterLink>
      <nav
        ref="navegacao"
        class="student-header__nav"
        aria-label="Navegação principal"
      >
        <span
          class="student-header__nav-indicator"
          :style="indicador"
          aria-hidden="true"
        />
        <RouterLink
          :to="{ name: 'home' }"
          class="student-header__nav-link"
          exact-active-class="is-active"
          @click="fechar()"
          @pointerenter="painel = null"
          >Início</RouterLink
        >
        <button
          v-for="item in itens"
          :key="item.tipo"
          :ref="(el) => registrarGatilho(item.tipo, el)"
          type="button"
          class="student-header__nav-link"
          :class="{
            'is-active': route.name === item.tipo,
            'is-open': painel === item.tipo,
          }"
          :aria-expanded="painel === item.tipo"
          :aria-current="route.name === item.tipo ? 'page' : undefined"
          :aria-controls="`painel-${item.tipo}`"
          @pointerenter="aoEntrar(item.tipo, $event)"
          @click="alternar(item.tipo, $event)"
          @keydown.down="abrirComTeclado(item.tipo, $event)"
        >
          {{ item.rotulo }}
          <ChevronDown :size="13" aria-hidden="true" />
        </button>
      </nav>
      <form
        v-if="mostrarBusca"
        class="student-header__search student-header__search--desktop"
        role="search"
        @submit.prevent="buscar"
      >
        <Search :size="17" aria-hidden="true" />
        <label for="busca-topo" class="student-header__sr"
          >Buscar no cardápio</label
        >
        <input
          id="busca-topo"
          v-model.trim="termoBusca"
          type="search"
          placeholder="Qual vai ser o seu pedido?"
          autocomplete="off"
        />
      </form>
      <div class="student-header__actions">
        <RouterLink
          :to="{ name: 'favoritos' }"
          class="student-header__icon student-header__desktop-action"
          aria-label="Favoritos"
          title="Favoritos"
          @click="fechar()"
          ><Heart :size="19" aria-hidden="true"
        /></RouterLink>
        <RouterLink
          :to="{ name: 'notificacoes' }"
          class="student-header__icon"
          :aria-label="rotuloNotificacoes"
          title="Notificações"
          @click="fechar()"
        >
          <Bell :size="19" aria-hidden="true" /><span
            v-if="notifications.naoLidas"
            class="student-header__badge"
            aria-hidden="true"
            >{{ badge(notifications.naoLidas) }}</span
          >
        </RouterLink>
        <button
          :ref="(el) => registrarGatilho('conta', el)"
          type="button"
          class="student-header__icon student-header__avatar student-header__desktop-action"
          :aria-label="`Conta de ${auth.usuario?.name || 'cliente'}`"
          :aria-expanded="painel === 'conta'"
          aria-controls="painel-conta"
          @click="alternar('conta', $event)"
          @keydown.down="abrirComTeclado('conta', $event)"
        >
          <img
            v-if="auth.usuario?.avatar && !avatarComErro"
            :src="auth.usuario.avatar"
            alt=""
            referrerpolicy="no-referrer"
            @error="avatarComErro = true"
          /><span v-else>{{ iniciais }}</span>
        </button>
        <RouterLink
          ref="carrinho"
          :to="{ name: 'carrinho' }"
          class="student-header__cart"
          :class="{ 'is-added': carrinhoPulando }"
          :aria-label="rotuloCarrinho"
          @click="fechar()"
        >
          <ShoppingBag :size="19" aria-hidden="true" /><span
            class="student-header__cart-label"
            >Carrinho</span
          ><span class="student-header__cart-count" aria-hidden="true">{{
            badge(cart.totalItens)
          }}</span>
        </RouterLink>
      </div>
    </div>

    <Transition
      name="header-panel"
      @before-enter="ativarPainel"
      @before-leave="desativarPainel"
    >
      <div
        v-if="painel && !mobileAberto"
        :id="`painel-${painel}`"
        :key="painel"
        class="student-header__dropdown"
        :class="{ 'student-header__dropdown--account': painel === 'conta' }"
        @pointerenter="cancelarFechamento"
      >
        <div class="student-header__glass student-header__desktop-panel">
          <StudentHeaderPanel
            :tipo="painel"
            @navigate="fechar()"
            @logout="sair"
          />
        </div>
      </div>
    </Transition>

    <Transition
      name="header-panel"
      @before-enter="ativarPainel"
      @before-leave="desativarPainel"
    >
      <div
        v-if="mobileAberto"
        id="navegacao-mobile"
        class="student-header__mobile-panel student-header__glass"
      >
        <form
          v-if="mostrarBusca"
          class="student-header__search"
          role="search"
          @submit.prevent="buscar"
        >
          <Search :size="18" aria-hidden="true" /><label
            for="busca-mobile"
            class="student-header__sr"
            >Buscar no cardápio</label
          >
          <input
            id="busca-mobile"
            v-model.trim="termoBusca"
            type="search"
            placeholder="Buscar coxinha, suco, bolo…"
            autocomplete="off"
          /><button type="submit" aria-label="Buscar">
            <Search :size="19" aria-hidden="true" />
          </button>
        </form>
        <nav aria-label="Menu mobile">
          <RouterLink
            :to="{ name: 'home' }"
            class="student-header__mobile-link"
            exact-active-class="is-active"
            @click="fechar()"
            >Início</RouterLink
          >
          <div
            v-for="item in itens"
            :key="item.tipo"
            class="student-header__mobile-group"
          >
            <button
              type="button"
              class="student-header__mobile-link"
              :class="{ 'is-active': route.name === item.tipo }"
              :aria-current="route.name === item.tipo ? 'page' : undefined"
              :aria-expanded="painel === item.tipo"
              :aria-controls="`mobile-${item.tipo}`"
              @click="alternar(item.tipo, $event)"
            >
              {{ item.rotulo }}<ChevronDown :size="18" aria-hidden="true" />
            </button>
            <div v-if="painel === item.tipo" :id="`mobile-${item.tipo}`">
              <StudentHeaderPanel :tipo="item.tipo" @navigate="fechar()" />
            </div>
          </div>
        </nav>
        <div class="student-header__mobile-account">
          <span>{{ auth.usuario?.name || "Sua conta" }}</span>
          <RouterLink :to="{ name: 'favoritos' }" @click="fechar()"
            ><Heart :size="18" aria-hidden="true" />Favoritos</RouterLink
          >
          <RouterLink :to="{ name: 'perfil' }" @click="fechar()"
            ><User :size="18" aria-hidden="true" />Meu perfil</RouterLink
          >
          <button type="button" @click="sair">
            <LogOut :size="18" aria-hidden="true" />Sair da conta
          </button>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped src="./StudentHeader.css"></style>
