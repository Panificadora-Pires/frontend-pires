<script setup>
import { computed } from "vue";
import { ArrowUpRight, Bell, CakeSlice, ClipboardList, Coffee, Croissant, Heart, LayoutGrid, LogOut, Tag, User, Wheat } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useNavigationCatalogStore } from "@/stores/navigationCatalog";

const props = defineProps({ tipo: { type: String, required: true } });
const emit = defineEmits(["navigate", "logout"]);
const catalogo = useNavigationCatalogStore();
const auth = useAuthStore();
const titulos = {
  cardapio: ["O que vai ser hoje?", "Escolha uma categoria e encontre seu próximo lanche."],
  promocoes: ["Um bom pedido.", "Confira o que está em promoção na Pires."],
  pedidos: ["Do pedido ao balcão.", "Acompanhe o preparo e tenha seu QR Code à mão na retirada."],
  conta: ["Sua conta", "Tudo o que é seu, bem aqui."],
};
const titulo = computed(() => props.tipo === "conta"
  ? [auth.usuario?.name || "Sua conta", titulos.conta[1]]
  : titulos[props.tipo] || titulos.cardapio);
function iconeCategoria(nome) {
  const texto = nome.toLocaleLowerCase("pt-BR");
  if (texto.includes("salgad")) return Croissant;
  if (texto.includes("doce")) return CakeSlice;
  if (texto.includes("bebida")) return Coffee;
  return LayoutGrid;
}
function aoClicar(event) {
  if (event.target.closest("a")) emit("navigate");
}
</script>

<template>
  <div class="header-panel" @click="aoClicar">
    <div class="header-panel__intro">
      <Wheat :size="36" :stroke-width="1.2" aria-hidden="true" />
      <h2>{{ titulo[0] }}</h2>
      <p>{{ titulo[1] }}</p>
      <RouterLink v-if="tipo === 'cardapio'" :to="{ name: 'cardapio' }" class="header-panel__all">
        Ver todo o cardápio <ArrowUpRight :size="16" aria-hidden="true" />
      </RouterLink>
      <RouterLink v-if="tipo === 'promocoes'" :to="{ name: 'promocoes' }" class="header-panel__all">
        Ver promoções <ArrowUpRight :size="16" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="header-panel__content">
      <template v-if="tipo === 'cardapio'">
        <p v-if="catalogo.carregandoCategorias && !catalogo.categoriasInicializadas" role="status">Carregando categorias…</p>
        <div v-if="catalogo.erroCategorias" class="header-panel__state" role="status">
          <p>{{ catalogo.erroCategorias }}</p>
          <button type="button" :disabled="catalogo.carregandoCategorias" @click="catalogo.carregarCategorias({ force: true })">Tentar novamente</button>
        </div>
        <div v-if="catalogo.categorias.length" class="header-panel__links header-panel__links--categories">
          <RouterLink v-for="categoria in catalogo.categorias" :key="categoria.id" :to="{ name: 'cardapio', query: { categoria: categoria.id } }" class="header-panel__link">
            <component :is="iconeCategoria(categoria.nome)" :size="24" :stroke-width="1.5" aria-hidden="true" />
            <span>{{ categoria.nome }}</span><ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </div>
        <p v-else-if="!catalogo.carregandoCategorias && !catalogo.erroCategorias">O cardápio está disponível no link ao lado.</p>
      </template>

      <template v-else-if="tipo === 'promocoes'">
        <p v-if="catalogo.carregandoPromocoes && !catalogo.promocoesInicializadas" role="status">Carregando promoções…</p>
        <div v-if="catalogo.erroPromocoes" class="header-panel__state" role="status">
          <p>{{ catalogo.erroPromocoes }}</p>
          <button type="button" :disabled="catalogo.carregandoPromocoes" @click="catalogo.carregarPromocoes({ force: true })">Tentar novamente</button>
        </div>
        <div v-if="catalogo.promocoesAtivas.length" class="header-panel__links">
          <RouterLink v-for="promocao in catalogo.promocoesAtivas" :key="promocao.id" :to="{ name: 'cardapio', query: { busca: promocao.produto_nome } }" class="header-panel__link">
            <Tag :size="22" aria-hidden="true" />
            <span>{{ promocao.produto_nome }}<small>Oferta no cardápio</small></span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </RouterLink>
        </div>
        <div v-else-if="!catalogo.carregandoPromocoes && !catalogo.erroPromocoes" class="header-panel__empty">
          <Tag :size="28" :stroke-width="1.4" aria-hidden="true" />
          <strong>Sem promoções ativas por enquanto.</strong>
          <p>O cardápio continua cheio de escolhas.</p>
          <RouterLink :to="{ name: 'cardapio' }" class="header-panel__all">Explorar o cardápio <ArrowUpRight :size="16" aria-hidden="true" /></RouterLink>
        </div>
      </template>

      <div v-else-if="tipo === 'pedidos'" class="header-panel__links">
        <RouterLink :to="{ name: auth.autenticado ? 'pedidos' : 'login' }" class="header-panel__link">
          <ClipboardList :size="24" aria-hidden="true" /><span>Meus pedidos<small>Preparo, histórico e QR Code de retirada</small></span><ArrowUpRight :size="16" aria-hidden="true" />
        </RouterLink>
        <RouterLink v-if="auth.autenticado" :to="{ name: 'notificacoes' }" class="header-panel__link">
          <Bell :size="24" aria-hidden="true" /><span>Notificações<small>As novidades dos seus pedidos</small></span><ArrowUpRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>

      <div v-else-if="tipo === 'conta'" class="header-panel__links">
        <RouterLink :to="{ name: 'perfil' }" class="header-panel__link"><User :size="22" aria-hidden="true" /><span>Meu perfil</span><ArrowUpRight :size="16" aria-hidden="true" /></RouterLink>
        <RouterLink :to="{ name: 'favoritos' }" class="header-panel__link"><Heart :size="22" aria-hidden="true" /><span>Favoritos</span><ArrowUpRight :size="16" aria-hidden="true" /></RouterLink>
        <button type="button" class="header-panel__link" @click="emit('logout')"><LogOut :size="22" aria-hidden="true" /><span>Sair da conta</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-panel {
  display: grid;
  grid-template-columns: minmax(220px, .85fr) 1.6fr;
  gap: 36px;
  padding: 32px;
  color: var(--pp-header-text);
}

.header-panel__intro {
  padding: 4px 32px 4px 4px;
  border-right: 1px solid var(--pp-header-line);
}

.header-panel__intro > svg {
  color: var(--pp-header-accent);
  margin-bottom: 16px;
}

.header-panel .header-panel__intro h2 {
  margin: 0 0 12px;
  color: var(--pp-header-text);
  font-size: clamp(22px, 2vw, 28px);
  font-weight: 600;
  letter-spacing: -.04em;
}

.header-panel p {
  margin: 0 0 18px;
  line-height: 1.65;
  font-size: 14px;
  color: var(--pp-header-muted);
  max-width: 36ch;
}

.header-panel__all {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--pp-header-accent);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 0;
}

.header-panel__all:hover {
  text-decoration: underline;
  text-underline-offset: 5px;
}

.header-panel__links {
  display: grid;
  gap: 6px;
}

.header-panel__links--categories {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 20px;
}

.header-panel__link {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--pp-header-text);
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;
}

.header-panel__link > svg:first-child {
  flex: none;
  color: var(--pp-header-accent);
}

.header-panel__link > svg:last-child:not(:first-child) {
  margin-left: auto;
  flex: none;
  opacity: .65;
}

.header-panel__link span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.header-panel__link small {
  display: block;
  color: var(--pp-header-muted);
  font-size: 12px;
  line-height: 1.6;
  margin-top: 4px;
}

.header-panel__link:hover, .header-panel__link:focus-visible {
  background: var(--pp-header-hover);
  border-color: var(--pp-header-line);
}

.header-panel__state {
  margin-bottom: 12px;
}

.header-panel__state button {
  border: 1px solid var(--pp-header-line);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--pp-header-hover);
  color: var(--pp-header-text);
  cursor: pointer;
}

.header-panel__state button:disabled {
  opacity: .6;
  cursor: wait;
}

.header-panel__empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 12px 16px;
}

.header-panel__empty > svg {
  color: var(--pp-header-accent);
}

.header-panel__empty p {
  margin: 0;
}

@media (max-width: 1179px) {
  .header-panel {
    display: block;
    padding: 16px 4px 20px;
  }

  .header-panel__intro {
    padding: 0 12px 12px;
    border: 0;
  }

  .header-panel__intro > svg {
    display: none;
  }

  .header-panel .header-panel__intro h2 {
    font-size: 22px;
  }

  .header-panel__intro p {
    margin-bottom: 6px;
    max-width: none;
  }

  .header-panel__links--categories {
    gap: 4px;
  }

  .header-panel__link {
    min-height: 54px;
    padding: 12px;
    gap: 10px;
    font-size: 14px;
  }

  .header-panel__link > svg:last-child {
    display: none;
  }
}
</style>
