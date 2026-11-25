<template>
  <section
    v-if="recomendacoes.length"
    class="cart-recommendations"
    aria-labelledby="cart-rec-title"
  >
    <div class="cart-recommendations__head">
      <div>
        <h2 id="cart-rec-title">{{ titulo }}</h2>
        <p>{{ subtitulo }}</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }">
        Ver cardápio
        <ArrowRight :size="14" />
      </RouterLink>
    </div>

    <div class="cart-recommendations__rail">
      <article
        v-for="produto in recomendacoes"
        :key="produto.id"
        class="cart-recommendation"
      >
        <ProductImage :produto="produto" variant="compact" />

        <div class="cart-recommendation__content">
          <div class="cart-recommendation__meta">
            <span>{{ produto.categoria_nome || "Produto" }}</span>
            <span v-if="produto.em_promocao" class="cart-recommendation__offer">
              Oferta
            </span>
          </div>

          <h3>{{ produto.nome }}</h3>

          <div class="cart-recommendation__bottom">
            <div class="cart-recommendation__price">
              <small v-if="produto.em_promocao">
                {{ formatarPreco(produto.preco) }}
              </small>
              <strong>{{
                formatarPreco(produto.preco_atual ?? produto.preco)
              }}</strong>
            </div>

            <button
              type="button"
              class="pp-card-action"
              :disabled="adicionandoId === produto.id"
              :aria-label="`Adicionar ${produto.nome} ao carrinho`"
              @click="adicionar(produto)"
            >
              <CardActionContent>
                <LoaderCircle
                  v-if="adicionandoId === produto.id"
                  :size="14"
                  class="cart-recommendation__spinner"
                />
                <Plus v-else :size="15" />
                {{ adicionandoId === produto.id ? "Adicionando" : "Adicionar" }}
              </CardActionContent>
            </button>
          </div>
        </div>
      </article>
    </div>

    <Transition name="recommendation-toast">
      <div v-if="toast" class="cart-recommendations__toast" role="status">
        <Check :size="15" />
        {{ toast }}
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowRight, Check, LoaderCircle, Plus } from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import CardActionContent from "@/components/ui/CardActionContent.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";

const cart = useCartStore();
const catalogo = ref([]);
const toast = ref("");
const adicionandoId = ref(null);
let toastTimer = null;
let montado = true;
watch(
  () => cart.geracao,
  () => {
    adicionandoId.value = null;
    toast.value = "";
    window.clearTimeout(toastTimer);
  },
  { flush: "sync" },
);

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function grupo(produto) {
  const categoria = normalizar(
    produto?.categoria_nome || produto?.categoria?.nome,
  );

  if (categoria.includes("bebid")) return "bebida";
  if (categoria.includes("doce") || categoria.includes("sobrem")) return "doce";
  if (
    categoria.includes("salgad") ||
    categoria.includes("lanche") ||
    categoria.includes("pao")
  )
    return "salgado";
  if (categoria.includes("combo")) return "combo";

  return "outro";
}

const gruposCarrinho = computed(
  () => new Set(cart.itens.map((item) => grupo(item.produto))),
);
const idsCarrinho = computed(
  () => new Set(cart.itens.map((item) => Number(item.produto.id))),
);

const prioridadeComplementar = computed(() => {
  const grupos = gruposCarrinho.value;

  if ((grupos.has("salgado") || grupos.has("combo")) && !grupos.has("bebida")) {
    return ["bebida", "doce", "salgado", "combo", "outro"];
  }

  if (grupos.has("bebida") && !grupos.has("salgado")) {
    return ["salgado", "doce", "combo", "bebida", "outro"];
  }

  if (grupos.has("doce") && !grupos.has("bebida")) {
    return ["bebida", "salgado", "combo", "doce", "outro"];
  }

  return ["bebida", "doce", "salgado", "combo", "outro"];
});

function pontuacao(produto) {
  const tipo = grupo(produto);
  const posicao = prioridadeComplementar.value.indexOf(tipo);
  let score = posicao >= 0 ? (5 - posicao) * 18 : 0;

  if (produto.em_promocao) score += 28;
  if (produto.destaque) score += 14;

  return score;
}

const recomendacoes = computed(() => {
  const candidatos = catalogo.value
    .filter((produto) => !idsCarrinho.value.has(Number(produto.id)))
    .sort((a, b) => pontuacao(b) - pontuacao(a));

  const selecionados = [];
  const usados = new Map();

  for (const produto of candidatos) {
    const tipo = grupo(produto);
    const quantidade = usados.get(tipo) || 0;

    if (quantidade >= 2 && candidatos.length > 4) continue;

    selecionados.push(produto);
    usados.set(tipo, quantidade + 1);

    if (selecionados.length === 4) break;
  }

  if (selecionados.length < 4) {
    for (const produto of candidatos) {
      if (selecionados.some((item) => item.id === produto.id)) continue;
      selecionados.push(produto);
      if (selecionados.length === 4) break;
    }
  }

  return selecionados;
});

const titulo = computed(() => {
  const grupos = gruposCarrinho.value;

  if ((grupos.has("salgado") || grupos.has("combo")) && !grupos.has("bebida")) {
    return "Que tal uma bebida para acompanhar?";
  }

  if (grupos.has("bebida") && !grupos.has("salgado")) {
    return "Algo para acompanhar sua bebida";
  }

  if (grupos.has("doce") && !grupos.has("bebida")) {
    return "Complete com uma bebida";
  }

  return "Complete seu pedido";
});

const subtitulo = computed(() => {
  if (gruposCarrinho.value.size === 0) {
    return "Sugestões selecionadas do cardápio.";
  }

  return "Sugestões do cardápio que combinam com os itens do seu carrinho.";
});

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

async function adicionar(produto) {
  if (adicionandoId.value) return;
  const contexto = cart.capturarContexto();
  if (!cart.contextoAtual(contexto)) return;

  adicionandoId.value = produto.id;

  try {
    let produtoCompleto = produto;

    try {
      produtoCompleto = await catalogService.obterProduto(produto.id);
    } catch {}

    if (!montado || !cart.contextoAtual(contexto)) return;
    if (!cart.adicionar(produtoCompleto, 1, contexto)) return;
    toast.value = `${produto.nome} foi adicionado ao carrinho.`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.value = "";
    }, 1800);
  } finally {
    if (montado && cart.contextoAtual(contexto)) adicionandoId.value = null;
  }
}

onMounted(async () => {
  try {
    catalogo.value = await catalogService.listarProdutosAtivos();
  } catch {
    catalogo.value = [];
  }
});

onBeforeUnmount(() => {
  montado = false;
  window.clearTimeout(toastTimer);
});
</script>

<style scoped src="./CartRecommendations.css"></style>
