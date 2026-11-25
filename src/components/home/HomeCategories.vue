<script setup>
import { computed, onMounted } from "vue";
import { ArrowRight } from "lucide-vue-next";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import HomeSectionHeader from "@/components/home/HomeSectionHeader.vue";
import { useNavigationCatalogStore } from "@/stores/navigationCatalog";
import salgados from "@/assets/images/categories/salgados.webp";
import doces from "@/assets/images/categories/doces.webp";
import bebidas from "@/assets/images/categories/bebidas.webp";
import combos from "@/assets/images/categories/combos.webp";

const catalogo = useNavigationCatalogStore();
const apresentacoes = [
  {
    slug: "salgados",
    nome: "Salgados",
    descricao: "Escolha seu salgado",
    imagem: salgados,
  },
  {
    slug: "doces",
    nome: "Doces",
    descricao: "Uma pausa mais doce",
    imagem: doces,
  },
  {
    slug: "bebidas",
    nome: "Bebidas",
    descricao: "Para acompanhar seu lanche",
    imagem: bebidas,
  },
  {
    slug: "combos",
    nome: "Combos",
    descricao: "Seu intervalo completo",
    imagem: combos,
  },
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

const categorias = computed(() =>
  apresentacoes.map((apresentacao) => {
    const categoria = catalogo.categorias.find(
      (item) =>
        item.ativa &&
        (normalizar(item.slug) === apresentacao.slug ||
          normalizar(item.nome) === apresentacao.slug),
    );
    return { ...apresentacao, id: categoria?.id };
  }),
);
const disponiveis = computed(() =>
  categorias.value.filter((categoria) => categoria.id != null),
);
const ausentes = computed(() =>
  categorias.value
    .filter((categoria) => categoria.id == null)
    .map((categoria) => categoria.nome)
    .join(", "),
);

onMounted(() => catalogo.carregarCategorias());
</script>

<template>
  <section class="home-categories" aria-labelledby="titulo-categorias">
    <HomeSectionHeader
      title-id="titulo-categorias"
      title="Seu intervalo, do seu jeito."
      intro="Comece por uma categoria e encontre o seu favorito."
      :action-to="{ name: 'cardapio' }"
      action-label="Ver cardápio"
    />

    <p
      v-if="!catalogo.categoriasInicializadas && !catalogo.erroCategorias"
      class="home-categories__state"
      role="status"
    >
      Carregando categorias…
    </p>
    <div
      v-if="catalogo.erroCategorias"
      class="home-categories__state"
      role="status"
    >
      <p>Não foi possível atualizar as categorias.</p>
      <button
        type="button"
        class="home-categories__retry"
        :disabled="catalogo.carregandoCategorias"
        @click="catalogo.carregarCategorias({ force: true })"
      >
        {{ catalogo.carregandoCategorias ? "Carregando…" : "Tentar novamente" }}
      </button>
    </div>

    <div v-if="disponiveis.length" class="home-categories__grid">
      <RouterLink
        v-for="categoria in disponiveis"
        :key="categoria.slug"
        :to="{ name: 'cardapio', query: { categoria: String(categoria.id) } }"
        class="home-categories__card pp-card-action-trigger"
      >
        <div class="home-categories__media">
          <img
            :src="categoria.imagem"
            alt=""
            width="800"
            height="800"
            loading="lazy"
            decoding="async"
            class="home-categories__image"
          />
        </div>
        <div class="home-categories__body">
          <h3 class="home-categories__name">{{ categoria.nome }}</h3>
          <p class="home-categories__description">{{ categoria.descricao }}</p>
          <span class="home-categories__cta">
            Ver {{ categoria.nome.toLocaleLowerCase("pt-BR") }}
            <span class="home-categories__arrow pp-card-action"
              ><CardActionContent
                ><ArrowRight :size="22" aria-hidden="true" /></CardActionContent
            ></span>
          </span>
        </div>
      </RouterLink>
    </div>
    <p
      v-else-if="catalogo.categoriasInicializadas && !catalogo.erroCategorias"
      class="home-categories__state"
      role="status"
    >
      Nenhuma dessas categorias está disponível no momento. Confira as opções em
      Ver cardápio.
    </p>
    <p
      v-if="disponiveis.length && ausentes"
      class="home-categories__availability"
      role="status"
    >
      Categorias indisponíveis no momento: {{ ausentes }}.
    </p>
    <p
      v-if="disponiveis.length"
      class="home-categories__note"
      aria-hidden="true"
    >
      escolha o que combina com a sua fome
      <svg viewBox="0 0 88 42" fill="none">
        <path d="M2 37C35 35 61 27 81 6M65 9l17-5-4 17" />
      </svg>
    </p>
  </section>
</template>

<style scoped src="./HomeCategories.css"></style>
