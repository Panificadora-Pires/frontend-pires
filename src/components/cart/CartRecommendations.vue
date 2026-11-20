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
        </div>

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
      </article>
    </div>

    <Transition name="recommendation-toast">
      <div v-if="toast" class="cart-recommendations__toast" role="status" aria-live="polite">
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
watch(() => cart.geracao, () => {
  adicionandoId.value = null;
  toast.value = "";
  window.clearTimeout(toastTimer);
}, { flush: "sync" });

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
  margin-top: 30px;
  padding-top: 24px;
  border-top: 1px solid var(--student-border);
}

.cart-recommendations__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.cart-recommendations__head h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.25;
  font-weight: 740;
  letter-spacing: -0.025em;
}

.cart-recommendations__head p {
  margin: 7px 0 0;
  color: var(--student-muted);
  font-size: 14px;
  line-height: 1.45;
}

.cart-recommendations__head a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #7b541a;
  font-size: 13px;
  font-weight: 720;
  white-space: nowrap;
}

.cart-recommendations__rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.cart-recommendation {
  min-width: 0;
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  grid-template-rows: minmax(90px, auto) auto;
  gap: 12px;
  padding: 13px;
  border: 1px solid var(--student-border);
  border-radius: 14px;
  background: #fff;
  transition: border-color 150ms ease, transform 150ms ease;
}

.cart-recommendation:hover {
  border-color: #d5c7b5;
  transform: translateY(-1px);
}

.cart-recommendation :deep(.catalog-product-image--compact) {
  grid-column: 1;
  grid-row: 1;
  width: 90px;
  height: 90px;
  flex-basis: 90px;
  border-radius: 10px;
}

.cart-recommendation__content {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.cart-recommendation__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-bottom: 7px;
}

.cart-recommendation__meta > span:first-child {
  overflow: hidden;
  max-width: 100%;
  color: #746b62;
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.035em;
}

.cart-recommendation__offer {
  padding: 3px 6px;
  border-radius: 5px;
  background: #fbf1df;
  color: #895b17;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.cart-recommendation h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 720;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.cart-recommendation__bottom {
  grid-column: 1 / -1;
  grid-row: 2;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0ebe5;
}

.cart-recommendation__price {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cart-recommendation__price small {
  color: #81766c;
  font-size: 12px;
  text-decoration: line-through;
}

.cart-recommendation__price strong {
  font-size: 15px;
  white-space: nowrap;
}

.cart-recommendation__bottom button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #2a211b;
  border-radius: 9px;
  background: #fff;
  color: #2a211b;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
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
  gap: 7px;
  padding: 12px 16px;
  border: 1px solid #cadbcd;
  border-radius: 10px;
  background: #f4faf5;
  color: #33583a;
  font-size: 13px;
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
    padding-top: 20px;
  }
  .cart-recommendations__head {
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
  }
  .cart-recommendations__head h2 {
    font-size: 19px;
  }
  .cart-recommendations__head p {
    font-size: 13px;
  }
  .cart-recommendations__rail {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    padding-bottom: 12px;
    scroll-padding-inline: 2px;
    scroll-snap-type: x proximity;
  }
  .cart-recommendation {
    width: 275px;
    flex: 0 0 min(275px, 82vw);
    scroll-snap-align: start;
  }
  .cart-recommendations__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
    justify-content: center;
  }
}

.cart-recommendations__head a:focus-visible,
.cart-recommendation__bottom button:focus-visible {
  outline: 3px solid #a77532;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .cart-recommendation,
  .recommendation-toast-enter-active,
  .recommendation-toast-leave-active {
    transition: none;
  }
  .cart-recommendation:hover {
    transform: none;
  }
  .cart-recommendation__spinner {
    animation: none;
  }
}
</style>
