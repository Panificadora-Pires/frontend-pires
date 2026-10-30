<script setup>
import { computed, onMounted } from "vue";
import { ArrowRight, ArrowUpRight } from "lucide-vue-next";
import { useNavigationCatalogStore } from "@/stores/navigationCatalog";
import salgados from "@/assets/images/categories/salgados.webp";
import doces from "@/assets/images/categories/doces.webp";
import bebidas from "@/assets/images/categories/bebidas.webp";
import combos from "@/assets/images/categories/combos.webp";

const catalogo = useNavigationCatalogStore();
const apresentacoes = [
  { slug: "salgados", nome: "Salgados", descricao: "Escolha seu salgado", imagem: salgados },
  { slug: "doces", nome: "Doces", descricao: "Uma pausa mais doce", imagem: doces },
  { slug: "bebidas", nome: "Bebidas", descricao: "Para acompanhar seu lanche", imagem: bebidas },
  { slug: "combos", nome: "Combos", descricao: "Seu intervalo completo", imagem: combos },
];

function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLocaleLowerCase("pt-BR");
}

// A apresentação é fixa; disponibilidade e destino pertencem ao catálogo real.
const categorias = computed(() => apresentacoes.map((apresentacao) => {
  const categoria = catalogo.categorias.find((item) => item.ativa &&
    (normalizar(item.slug) === apresentacao.slug || normalizar(item.nome) === apresentacao.slug));
  return { ...apresentacao, id: categoria?.id };
}));
const disponiveis = computed(() => categorias.value.filter((categoria) => categoria.id != null));
const ausentes = computed(() => categorias.value.filter((categoria) => categoria.id == null)
  .map((categoria) => categoria.nome).join(", "));

onMounted(() => catalogo.carregarCategorias());
</script>

<template>
  <section class="home-categories" aria-labelledby="titulo-categorias">
    <header class="home-categories__header">
      <div>
        <h2 id="titulo-categorias" class="home-categories__title">Seu intervalo, do seu jeito.</h2>
        <p class="home-categories__intro">Comece por uma categoria e encontre o seu favorito.</p>
      </div>
      <RouterLink :to="{ name: 'cardapio' }" class="home-categories__all">
        Ver cardápio <ArrowUpRight :size="18" aria-hidden="true" />
      </RouterLink>
    </header>

    <p v-if="!catalogo.categoriasInicializadas && !catalogo.erroCategorias" class="home-categories__state" role="status">
      Carregando categorias…
    </p>
    <div v-if="catalogo.erroCategorias" class="home-categories__state" role="status">
      <p>Não foi possível atualizar as categorias.</p>
      <button type="button" class="home-categories__retry" :disabled="catalogo.carregandoCategorias"
        @click="catalogo.carregarCategorias({ force: true })">
        {{ catalogo.carregandoCategorias ? 'Carregando…' : 'Tentar novamente' }}
      </button>
    </div>

    <div v-if="disponiveis.length" class="home-categories__grid">
      <RouterLink v-for="categoria in disponiveis" :key="categoria.slug"
        :to="{ name: 'cardapio', query: { categoria: String(categoria.id) } }"
        class="home-categories__card">
        <div class="home-categories__media">
          <img :src="categoria.imagem" alt="" width="800" height="800" loading="lazy" decoding="async"
            class="home-categories__image" />
        </div>
        <div class="home-categories__body">
          <h3 class="home-categories__name">{{ categoria.nome }}</h3>
          <p class="home-categories__description">{{ categoria.descricao }}</p>
          <span class="home-categories__cta">
            Ver {{ categoria.nome.toLocaleLowerCase('pt-BR') }}
            <span class="home-categories__arrow"><ArrowRight :size="22" aria-hidden="true" /></span>
          </span>
        </div>
      </RouterLink>
    </div>
    <p v-else-if="catalogo.categoriasInicializadas && !catalogo.erroCategorias" class="home-categories__state" role="status">
      Nenhuma dessas categorias está disponível no momento. Confira as opções em Ver cardápio.
    </p>
    <p v-if="disponiveis.length && ausentes" class="home-categories__availability" role="status">
      Categorias indisponíveis no momento: {{ ausentes }}.
    </p>
    <p v-if="disponiveis.length" class="home-categories__note" aria-hidden="true">
      escolha o que combina com a sua fome
      <svg viewBox="0 0 88 42" fill="none"><path d="M2 37C35 35 61 27 81 6M65 9l17-5-4 17" /></svg>
    </p>
  </section>
</template>

<style scoped>
.home-categories {
  margin-top: var(--pp-space-6);
  padding-bottom: var(--pp-space-3);
  border-bottom: 1px solid var(--pp-creme-3);
  color: var(--pp-marrom);
}
.home-categories__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--pp-space-4);
  margin-bottom: var(--pp-space-4);
}
.home-categories .home-categories__title {
  margin: 0 0 8px;
  font-family: var(--pp-font-titulo);
  font-size: clamp(30px, 3.4vw, 48px);
  font-weight: 400;
  line-height: 1.18;
  letter-spacing: -.025em;
}
.home-categories__intro {
  margin: 0;
  color: var(--pp-texto-2);
  font-size: 17px;
  line-height: 1.5;
}
.home-categories__all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  flex: none;
  color: var(--pp-dourado-escuro);
  font-size: 14px;
  font-weight: 700;
}
.home-categories__all:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.home-categories__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--pp-space-3);
}
.home-categories__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pp-creme-3);
  border-radius: var(--pp-radius-card-lg);
  background: var(--pp-surface-card);
  transition: border-color .2s var(--pp-ease), box-shadow .2s var(--pp-ease);
}
.home-categories__card:focus-visible {
  border-color: var(--pp-dourado-escuro);
  box-shadow: var(--pp-sombra-card);
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
@media (hover: hover) {
  .home-categories__card:hover {
    border-color: var(--pp-dourado-escuro);
    box-shadow: var(--pp-sombra-card);
  }
}
.home-categories__media {
  flex: none;
  overflow: hidden;
  aspect-ratio: 1;
}
.home-categories__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
  transition: transform .45s var(--pp-ease);
}
@media (prefers-reduced-motion: no-preference) {
  .home-categories__card:focus-visible .home-categories__image {
    transform: scale(1.06);
  }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .home-categories__card:hover .home-categories__image {
    transform: scale(1.06);
  }
}
.home-categories__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 12px 20px 20px;
}
.home-categories .home-categories__name {
  margin: 0 0 6px;
  font-family: var(--pp-font-titulo);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.2;
}
.home-categories__description {
  margin: 0 0 18px;
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.5;
}
.home-categories__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  color: var(--pp-marrom-2);
  font-size: 14px;
  font-weight: 700;
}
.home-categories__arrow {
  display: grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: var(--pp-radius-full);
  background: var(--pp-marrom);
  color: var(--pp-surface-card);
}
.home-categories__note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0 0;
  color: var(--pp-dourado-escuro);
  font-family: var(--pp-font-nota);
  font-size: 26px;
  font-weight: 700;
}
.home-categories__note svg {
  width: 80px;
  height: 40px;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.home-categories__state {
  margin: 0 0 16px;
  padding: 24px;
  border: 1px solid var(--pp-creme-3);
  border-radius: var(--pp-radius-card-lg);
  background: var(--pp-surface-card);
  color: var(--pp-texto-2);
  line-height: 1.5;
}
.home-categories__state p { margin: 0 0 12px; }
.home-categories__retry {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--pp-creme-borda);
  border-radius: var(--pp-radius-btn);
  background: var(--pp-surface-card);
  color: var(--pp-marrom);
  font-weight: 600;
  cursor: pointer;
}
.home-categories__retry:disabled { cursor: wait; }
.home-categories__availability {
  color: var(--pp-texto-2);
  font-size: 14px;
  line-height: 1.5;
  margin: 16px 0 0;
}
@media (max-width: 980px) {
  .home-categories__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .home-categories { margin-top: var(--pp-space-5); }
  .home-categories__header { align-items: flex-start; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .home-categories__intro { font-size: 14px; }
  .home-categories__grid { gap: 12px; }
  .home-categories__body { padding: 12px; }
  .home-categories .home-categories__name { font-size: 24px; }
  .home-categories__description { font-size: 13px; margin-bottom: 12px; }
  .home-categories__cta { font-size: 12px; gap: 4px; }
  .home-categories__arrow { width: 32px; height: 32px; }
  .home-categories__arrow svg { width: 18px; height: 18px; }
  .home-categories__note { font-size: 21px; gap: 6px; }
  .home-categories__note svg { width: 40px; flex: none; }
}
@media (prefers-reduced-motion: reduce) {
  .home-categories__card,
  .home-categories__image { transition: none; }
}
</style>
