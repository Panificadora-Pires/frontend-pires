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
              :disabled="adicionandoId === produto.id"
              :aria-label="`Adicionar ${produto.nome} ao carrinho`"
              @click="adicionar(produto)"
            >
              <LoaderCircle
                v-if="adicionandoId === produto.id"
                :size="14"
                class="cart-recommendation__spinner"
              />
              <Plus v-else :size="15" />
              {{ adicionandoId === produto.id ? "Adicionando" : "Adicionar" }}
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ArrowRight, Check, LoaderCircle, Plus } from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";

const cart = useCartStore();
const catalogo = ref([]);
const toast = ref("");
const adicionandoId = ref(null);
let toastTimer = null;

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

  adicionandoId.value = produto.id;

  try {
    let produtoCompleto = produto;

    try {
      produtoCompleto = await catalogService.obterProduto(produto.id);
    } catch {}

    cart.adicionar(produtoCompleto, 1);
    toast.value = `${produto.nome} foi adicionado ao carrinho.`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.value = "";
    }, 1800);
  } finally {
    adicionandoId.value = null;
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
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
.cart-recommendations {
  position: relative;
  margin-top: 34px;
  padding-top: 26px;
  border-top: 1px solid var(--student-border);
}

.cart-recommendations__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}

.cart-recommendations__head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 740;
  letter-spacing: -0.025em;
}

.cart-recommendations__head p {
  margin: 5px 0 0;
  color: var(--student-muted);
  font-size: 10.5px;
}

.cart-recommendations__head a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #7b541a;
  font-size: 10px;
  font-weight: 720;
  white-space: nowrap;
}

.cart-recommendations__rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cart-recommendation {
  min-width: 0;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 11px;
  padding: 10px;
  border: 1px solid var(--student-border);
  border-radius: 12px;
  background: #fff;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.cart-recommendation:hover {
  border-color: #d5c7b5;
  transform: translateY(-1px);
}

.cart-recommendation :deep(.catalog-product-image--compact) {
  width: 78px;
  height: 78px;
  flex-basis: 78px;
  border-radius: 8px;
}

.cart-recommendation__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cart-recommendation__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 16px;
}

.cart-recommendation__meta > span:first-child {
  overflow: hidden;
  color: #8c837b;
  font-size: 7.5px;
  font-weight: 650;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.04em;
}

.cart-recommendation__offer {
  padding: 2px 4px;
  border-radius: 4px;
  background: #fbf1df;
  color: #895b17;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}

.cart-recommendation h3 {
  overflow: hidden;
  margin: 3px 0 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-recommendation__bottom {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.cart-recommendation__price {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cart-recommendation__price small {
  color: #a29a92;
  font-size: 7.5px;
  text-decoration: line-through;
}

.cart-recommendation__price strong {
  font-size: 11px;
  white-space: nowrap;
}

.cart-recommendation__bottom button {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid #2a211b;
  border-radius: 7px;
  background: #fff;
  color: #2a211b;
  font-size: 8px;
  font-weight: 750;
  cursor: pointer;
}

.cart-recommendation__bottom button:hover:not(:disabled) {
  background: #2a211b;
  color: #fff;
}

.cart-recommendation__bottom button:disabled {
  opacity: 0.62;
  cursor: wait;
}

.cart-recommendation__spinner {
  animation: recommendation-spin 0.7s linear infinite;
}

.cart-recommendations__toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 110;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 13px;
  border: 1px solid #cadbcd;
  border-radius: 8px;
  background: #f4faf5;
  color: #33583a;
  font-size: 10px;
  font-weight: 650;
}

.recommendation-toast-enter-active,
.recommendation-toast-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.recommendation-toast-enter-from,
.recommendation-toast-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@keyframes recommendation-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .cart-recommendations__rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .cart-recommendations {
    margin-top: 26px;
  }

  .cart-recommendations__head {
    align-items: flex-start;
  }

  .cart-recommendations__head h2 {
    font-size: 16px;
  }

  .cart-recommendations__rail {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    scroll-snap-type: x proximity;
  }

  .cart-recommendation {
    width: 260px;
    flex: 0 0 260px;
    scroll-snap-align: start;
  }

  .cart-recommendations__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
    justify-content: center;
  }
}
</style>
