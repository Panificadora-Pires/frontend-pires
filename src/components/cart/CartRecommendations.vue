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

<style scoped>
.cart-recommendations {
  position: relative;
  margin-top: 56px;
  padding-top: 32px;
  border-top: 1px solid var(--pp-creme-borda);
}
.cart-recommendations__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.cart-recommendations__head h2 {
  font: 400 clamp(28px, 3vw, 40px)/1.2 var(--pp-font-titulo);
  margin: 0;
}
.cart-recommendations__head p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--pp-texto-2);
  margin: 8px 0 0;
}
.cart-recommendations__head a {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--pp-dourado-profundo);
  font-size: 14px;
  white-space: nowrap;
}
.cart-recommendations__rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}
.cart-recommendation {
  min-width: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--pp-creme-borda);
}
.cart-recommendation :deep(.catalog-product-image--compact) {
  width: 100%;
  height: 170px;
  border-radius: 48% 48% 4px 4px;
  margin-bottom: 16px;
}
.cart-recommendation__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--pp-texto-2);
  font-size: 12px;
}
.cart-recommendation__offer {
  background: var(--pp-gold);
  color: var(--pp-marrom);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.cart-recommendation h3 {
  font-size: 18px;
  line-height: 1.35;
  margin: 8px 0 16px;
  overflow-wrap: anywhere;
}
.cart-recommendation__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.cart-recommendation__price {
  display: grid;
  gap: 4px;
}
.cart-recommendation__price small {
  color: var(--pp-texto-2);
  text-decoration: line-through;
  font-size: 14px;
}
.cart-recommendation__price strong {
  font-size: 18px;
}
.cart-recommendation__bottom button {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--pp-marrom);
  border-radius: 999px;
  color: var(--pp-marrom);
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}
.cart-recommendation__bottom button:hover:not(:disabled) {
  background: var(--pp-creme-3);
}
.cart-recommendation__bottom button:active {
  transform: translateY(1px);
}
.cart-recommendations :is(a, button):focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.cart-recommendation__bottom button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.cart-recommendations__toast {
  position: fixed;
  left: 16px;
  bottom: 100px;
  z-index: 110;
  max-width: calc(100vw - 32px);
  padding: 16px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  font-size: 14px;
  border-radius: 8px;
}
.cart-recommendation__spinner {
  animation: rec-spin 0.8s linear infinite;
}
@keyframes rec-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1000px) {
  .cart-recommendations__rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .cart-recommendations__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .cart-recommendations__rail {
    grid-template-columns: 1fr;
  }
  .cart-recommendation {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 16px;
  }
  .cart-recommendation :deep(.catalog-product-image--compact) {
    height: 100px;
    margin: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cart-recommendations * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
