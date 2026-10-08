<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <h1>Seu carrinho</h1>
        <p>Confira os produtos antes de escolher a forma de pagamento.</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="16" />
        Continuar comprando
      </RouterLink>
    </header>

    <section v-if="cart.vazio" class="cart-page__empty">
      <span class="cart-page__empty-icon"><ShoppingCart :size="29" /></span>
      <h2>Seu carrinho está vazio</h2>
      <p>Escolha seus produtos no cardápio e monte seu pedido.</p>
      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__primary-link">
        Explorar cardápio
        <ArrowRight :size="16" />
      </RouterLink>
    </section>

    <template v-else>
      <div class="cart-page__layout">
        <section class="cart-page__items" aria-labelledby="cart-items-title">
          <div class="cart-page__section-head">
            <div>
              <h2 id="cart-items-title">Itens do pedido</h2>
              <p>
                {{ cart.totalItens }}
                {{
                  cart.totalItens === 1
                    ? "item selecionado"
                    : "itens selecionados"
                }}
              </p>
            </div>

            <button
              type="button"
              class="cart-page__clear"
              :disabled="finalizando"
              @click="limparCarrinho"
            >
              <Trash2 :size="14" />
              Limpar
            </button>
          </div>

          <div v-if="sincronizando" class="cart-page__sync" role="status">
            <LoaderCircle :size="15" class="cart-page__spinner" />
            Conferindo preços e disponibilidade...
          </div>

          <div class="cart-page__item-list">
            <article
              v-for="item in cart.itens"
              :key="item.produto.id"
              class="cart-item"
              :class="{ 'cart-item--problem': problemaItem(item) }"
            >
              <ProductImage :produto="item.produto" variant="compact" />

              <div class="cart-item__info">
                <span class="cart-item__category">
                  {{ item.produto.categoria_nome || "Produto" }}
                </span>
                <h3>{{ item.produto.nome }}</h3>

                <div class="cart-item__prices">
                  <span
                    v-if="item.produto.em_promocao"
                    class="cart-item__old-price"
                  >
                    {{ formatarPreco(item.produto.preco) }}
                  </span>
                  <strong>{{ formatarPreco(precoUnitario(item)) }}</strong>
                  <span>un.</span>
                </div>

                <p v-if="problemaItem(item)" class="cart-item__problem-text">
                  <CircleAlert :size="14" />
                  {{ problemaItem(item) }}
                </p>
              </div>

              <div class="cart-item__actions">
                <div
                  class="cart-item__quantity"
                  aria-label="Controle de quantidade"
                >
                  <button
                    type="button"
                    :disabled="finalizando || item.quantidade <= 1"
                    :aria-label="`Diminuir quantidade de ${item.produto.nome}`"
                    @click="alterarQuantidade(item, item.quantidade - 1)"
                  >
                    <Minus :size="15" />
                  </button>
                  <strong>{{ item.quantidade }}</strong>
                  <button
                    type="button"
                    :disabled="finalizando || !podeAumentar(item)"
                    :aria-label="`Aumentar quantidade de ${item.produto.nome}`"
                    @click="alterarQuantidade(item, item.quantidade + 1)"
                  >
                    <Plus :size="15" />
                  </button>
                </div>

                <small v-if="estoqueConhecido(item)" class="cart-item__stock">
                  {{ estoqueDisponivel(item) }}
                  {{
                    estoqueDisponivel(item) === 1 ? "disponível" : "disponíveis"
                  }}
                </small>
              </div>

              <div class="cart-item__subtotal">
                <span>Subtotal</span>
                <strong>
                  {{ formatarPreco(precoUnitario(item) * item.quantidade) }}
                </strong>
              </div>

              <button
                type="button"
                class="cart-item__remove"
                :disabled="finalizando"
                :aria-label="`Remover ${item.produto.nome} do carrinho`"
                @click="removerItem(item.produto.id)"
              >
                <X :size="16" />
              </button>
            </article>
          </div>
        </section>

        <aside class="cart-summary">
          <div class="cart-summary__head">
            <h2>Resumo do pedido</h2>
            <span
              >{{ cart.totalItens }}
              {{ cart.totalItens === 1 ? "item" : "itens" }}</span
            >
          </div>

          <div class="cart-summary__rows">
            <div>
              <span>Subtotal</span>
              <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
            </div>
            <div>
              <span>Taxa de retirada</span>
              <strong>Grátis</strong>
            </div>
          </div>

          <div class="cart-summary__total">
            <span>Total</span>
            <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
          </div>

          <div class="cart-summary__pickup">
            <Clock3 :size="18" />
            <div>
              <strong>Retirada no balcão</strong>
              <p>
                Você acompanha o preparo e retira quando o pedido estiver
                pronto.
              </p>
            </div>
          </div>

          <div v-if="erroFinalizar" class="cart-summary__error" role="alert">
            <CircleAlert :size="17" />
            <span>{{ erroFinalizar }}</span>
          </div>

          <button
            type="button"
            class="cart-summary__checkout"
            :disabled="finalizando || sincronizando || temProblemas"
            @click="finalizarPedido"
          >
            <LoaderCircle
              v-if="finalizando"
              :size="18"
              class="cart-page__spinner"
            />
            <ShoppingBag v-else :size="18" />
            {{
              finalizando ? "Conferindo pedido..." : "Continuar para pagamento"
            }}
            <ArrowRight v-if="!finalizando" :size="16" />
          </button>

          <div class="cart-summary__safe">
            <CircleCheckBig :size="15" />
            Preços e estoque verificados antes do pagamento
          </div>
        </aside>
      </div>

      <CartRecommendations />
    </template>

    <Transition name="cart-toast">
      <div
        v-if="toast"
        class="cart-page__toast"
        role="status"
        aria-live="polite"
      >
        <Check :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-vue-next";

import ProductImage from "@/components/catalog/ProductImage.vue";
import CartRecommendations from "@/components/cart/CartRecommendations.vue";
import catalogService from "@/services/catalog.service";
import { useCartStore } from "@/stores/cart";

const cart = useCartStore();
const router = useRouter();

const estoques = ref({});
const ativos = ref({});
const sincronizando = ref(false);
const finalizando = ref(false);
const erroFinalizar = ref("");
const toast = ref("");
let toastTimer = null;

const temProblemas = computed(() =>
  cart.itens.some((item) => Boolean(problemaItem(item))),
);

function formatarPreco(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function precoUnitario(item) {
  return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0);
}

function estoqueConhecido(item) {
  return (
    Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id) ||
    item?.produto?.estoque !== undefined
  );
}

function estoqueDisponivel(item) {
  if (estoqueConhecido(item))
    return Number(estoques.value[item.produto.id] || 0);
  if (item.produto.estoque !== undefined)
    return Number(item.produto.estoque || 0);
  return 0;
}

function problemaItem(item) {
  const id = item.produto.id;

  if (ativos.value[id] === false) {
    return "Este produto não está mais disponível para venda.";
  }

  if (!estoqueConhecido(item)) return "";

  const estoque = estoqueDisponivel(item);
  if (estoque <= 0) return "Produto sem estoque no momento.";
  if (item.quantidade > estoque) {
    return `A quantidade escolhida excede o estoque atual (${estoque}).`;
  }

  return "";
}

function podeAumentar(item) {
  if (!estoqueConhecido(item)) return false;
  return (
    estoqueDisponivel(item) > item.quantidade &&
    ativos.value[item.produto.id] !== false
  );
}

function alterarQuantidade(item, quantidade) {
  const estoque = estoqueDisponivel(item);

  if (quantidade > estoque && estoqueConhecido(item)) {
    mostrarToast(
      `Há somente ${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}.`,
    );
    return;
  }

  cart.alterarQuantidade(item.produto.id, quantidade);
  erroFinalizar.value = "";
}

function removerItem(produtoId) {
  cart.removerItem(produtoId);
  delete estoques.value[produtoId];
  delete ativos.value[produtoId];
  estoques.value = { ...estoques.value };
  ativos.value = { ...ativos.value };
  erroFinalizar.value = "";
  mostrarToast("Produto removido do carrinho.");
}

function limparCarrinho() {
  if (
    !window.confirm("Deseja realmente remover todos os produtos do carrinho?")
  )
    return;
  cart.limpar();
  estoques.value = {};
  ativos.value = {};
  erroFinalizar.value = "";
}

async function sincronizarCarrinho({ silencioso = false } = {}) {
  if (cart.vazio || sincronizando.value) return;

  sincronizando.value = true;
  if (!silencioso) erroFinalizar.value = "";

  const itensSnapshot = [...cart.itens];
  const resultados = await Promise.allSettled(
    itensSnapshot.map(async (item) => {
      const detalhe = await catalogService.obterProduto(item.produto.id);
      return { id: item.produto.id, detalhe };
    }),
  );

  const novosEstoques = { ...estoques.value };
  const novosAtivos = { ...ativos.value };
  let falhas = 0;

  resultados.forEach((resultado, index) => {
    const itemOriginal = itensSnapshot[index];
    const id = itemOriginal.produto.id;

    if (resultado.status === "fulfilled") {
      const detalhe = resultado.value.detalhe;
      novosEstoques[id] = Number(detalhe?.estoque ?? 0);
      novosAtivos[id] = detalhe?.ativo !== false;

      const itemAtual = cart.itens.find((item) => item.produto.id === id);
      if (itemAtual) {
        itemAtual.produto = {
          ...itemAtual.produto,
          ...detalhe,
        };
      }
    } else {
      falhas += 1;
      novosAtivos[id] = false;
    }
  });

  estoques.value = novosEstoques;
  ativos.value = novosAtivos;
  sincronizando.value = false;

  if (falhas && !silencioso) {
    erroFinalizar.value =
      "Não foi possível atualizar todos os produtos do carrinho.";
  }
}

async function finalizarPedido() {
  if (cart.vazio || finalizando.value) return;

  finalizando.value = true;
  erroFinalizar.value = "";

  try {
    await sincronizarCarrinho({ silencioso: true });

    if (temProblemas.value) {
      erroFinalizar.value = "Revise os itens destacados antes de continuar.";
      return;
    }

    await router.push({ name: "checkout" });
  } catch (error) {
    erroFinalizar.value = mensagemErroPedido(error);
  } finally {
    finalizando.value = false;
  }
}

function mensagemErroPedido(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.itens_criacao === "string") return data.itens_criacao;
  if (Array.isArray(data?.itens_criacao)) return data.itens_criacao.join(" ");

  if (data && typeof data === "object") {
    const primeiraMensagem = Object.values(data)
      .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
      .find((valor) => typeof valor === "string");

    if (primeiraMensagem) return primeiraMensagem;
  }

  return "Não foi possível confirmar o pedido. Verifique sua conexão e tente novamente.";
}

function mostrarToast(mensagem) {
  toast.value = mensagem;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

onMounted(() => {
  sincronizarCarrinho().catch(() => {
    erroFinalizar.value =
      "Não foi possível atualizar a disponibilidade dos produtos.";
    sincronizando.value = false;
  });
});

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer);
});
</script>

<style scoped>
.cart-page {
  width: min(100%, 1180px);
  margin: 0 auto;
  color: var(--student-text);
}

.cart-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.cart-page__header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.cart-page__header p {
  margin: 7px 0 0;
  color: var(--student-muted);
  font-size: 13px;
  line-height: 1.45;
}

.cart-page__continue {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #75501b;
  font-size: 11px;
  font-weight: 700;
}

.cart-page__empty {
  min-height: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 34px;
  border: 1px solid var(--student-border);
  border-radius: 14px;
  background: #fff;
  text-align: center;
}

.cart-page__empty-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 15px;
  border-radius: 50%;
  background: #f4efe8;
  color: #8a6228;
}

.cart-page__empty h2 {
  margin: 0;
  font-size: 20px;
}

.cart-page__empty p {
  margin: 8px 0 18px;
  color: var(--student-muted);
  font-size: 12px;
}

.cart-page__primary-link {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 16px;
  border-radius: 9px;
  background: #2a211b;
  color: #fff;
  font-size: 11px;
  font-weight: 720;
}

.cart-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 352px;
  gap: 20px;
  align-items: start;
}

.cart-page__items {
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 14px;
  background: #fff;
}

.cart-page__section-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--student-border);
}

.cart-page__section-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 720;
}

.cart-page__section-head p {
  margin: 4px 0 0;
  color: var(--student-muted);
  font-size: 10px;
}

.cart-page__clear {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 8px;
  border: 0;
  background: transparent;
  color: #8c514c;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.cart-page__clear:hover:not(:disabled) {
  color: var(--student-danger);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.cart-page__sync {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 17px;
  border-bottom: 1px solid var(--student-border);
  background: #fbf8f3;
  color: #78664e;
  font-size: 10px;
}

.cart-page__item-list {
  padding: 0 18px;
}

.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) 112px 96px 28px;
  align-items: center;
  gap: 15px;
  padding: 18px 0;
  border-bottom: 1px solid #eee9e4;
}

.cart-item:last-child {
  border-bottom: 0;
}

.cart-item--problem {
  margin-inline: -18px;
  padding-inline: 18px;
  background: #fff8f6;
}

.cart-item__info {
  min-width: 0;
}

.cart-item__category {
  display: block;
  margin-bottom: 4px;
  color: #8d857d;
  font-size: 8.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cart-item__info h3 {
  margin: 0 0 7px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}

.cart-item__prices {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #8e857d;
  font-size: 9px;
}

.cart-item__prices strong {
  color: var(--student-text);
  font-size: 12px;
}

.cart-item__old-price {
  color: #aaa29b;
  text-decoration: line-through;
}

.cart-item__problem-text {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 8px 0 0;
  color: var(--student-danger);
  font-size: 9px;
  line-height: 1.4;
}

.cart-item__actions {
  justify-self: start;
}

.cart-item__quantity {
  height: 34px;
  display: grid;
  grid-template-columns: 32px 38px 32px;
  border: 1px solid var(--student-border-strong);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.cart-item__quantity button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: #faf8f5;
  color: var(--student-text);
  cursor: pointer;
}

.cart-item__quantity button:hover:not(:disabled) {
  background: #f1ece6;
}

.cart-item__quantity button:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.cart-item__quantity strong {
  display: grid;
  place-items: center;
  border-inline: 1px solid var(--student-border);
  font-size: 11px;
}

.cart-item__stock {
  display: block;
  margin-top: 6px;
  color: var(--student-muted);
  font-size: 8px;
}

.cart-item__subtotal {
  text-align: right;
}

.cart-item__subtotal span {
  display: block;
  margin-bottom: 5px;
  color: var(--student-muted);
  font-size: 8.5px;
}

.cart-item__subtotal strong {
  font-size: 13px;
  white-space: nowrap;
}

.cart-item__remove {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9a928a;
  cursor: pointer;
}

.cart-item__remove:hover:not(:disabled) {
  background: #fff1ef;
  color: var(--student-danger);
}

.cart-summary {
  position: sticky;
  top: 24px;
  padding: 20px;
  border: 1px solid var(--student-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(47, 38, 31, 0.035);
}

.cart-summary__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--student-border);
}

.cart-summary__head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 740;
}

.cart-summary__head > span {
  color: var(--student-muted);
  font-size: 9.5px;
}

.cart-summary__rows {
  padding: 15px 0 13px;
}

.cart-summary__rows > div,
.cart-summary__total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cart-summary__rows > div + div {
  margin-top: 10px;
}

.cart-summary__rows span {
  color: var(--student-muted);
  font-size: 10px;
}

.cart-summary__rows strong {
  font-size: 10px;
  font-weight: 650;
}

.cart-summary__total {
  align-items: baseline;
  padding: 15px 0;
  border-top: 1px solid var(--student-border);
}

.cart-summary__total span {
  font-size: 12px;
  font-weight: 700;
}

.cart-summary__total strong {
  font-size: 22px;
  letter-spacing: -0.03em;
}

.cart-summary__pickup {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 9px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 9px;
  background: #f7f4ef;
  color: #665b50;
}

.cart-summary__pickup svg {
  margin-top: 1px;
  color: #916526;
}

.cart-summary__pickup strong {
  display: block;
  color: #433a32;
  font-size: 10px;
}

.cart-summary__pickup p {
  margin: 3px 0 0;
  font-size: 8.5px;
  line-height: 1.45;
}

.cart-summary__error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--student-danger-soft);
  color: var(--student-danger);
  font-size: 9px;
  line-height: 1.45;
}

.cart-summary__checkout {
  width: 100%;
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 9px;
  background: #2a211b;
  color: #fff;
  font-size: 11px;
  font-weight: 740;
  cursor: pointer;
  transition:
    background 150ms ease,
    transform 150ms ease;
}

.cart-summary__checkout:hover:not(:disabled) {
  background: #19130f;
  transform: translateY(-1px);
}

.cart-summary__checkout:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cart-summary__safe {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 10px;
  color: #817970;
  font-size: 8px;
  text-align: center;
}

.cart-summary__safe svg {
  color: var(--student-success);
}

.cart-page__toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 13px;
  border: 1px solid #cadbcd;
  border-radius: 8px;
  background: #f4faf5;
  color: #33583a;
  font-size: 11px;
  font-weight: 600;
}

.cart-page__spinner {
  animation: cart-spin 0.7s linear infinite;
}

.cart-toast-enter-active,
.cart-toast-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.cart-toast-enter-from,
.cart-toast-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@keyframes cart-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .cart-page__layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 700px) {
  .cart-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .cart-page__header h1 {
    font-size: 26px;
  }

  .cart-item {
    grid-template-columns: 66px minmax(0, 1fr) 28px;
    gap: 11px;
  }

  .cart-item :deep(.catalog-product-image--compact) {
    width: 66px;
    height: 66px;
    flex-basis: 66px;
  }

  .cart-item__actions,
  .cart-item__subtotal {
    grid-column: 2 / 3;
  }

  .cart-item__subtotal {
    text-align: left;
  }

  .cart-item__subtotal span {
    display: none;
  }

  .cart-item__remove {
    grid-column: 3;
    grid-row: 1;
  }

  .cart-page__section-head {
    align-items: flex-start;
  }

  .cart-page__clear {
    padding-inline: 4px;
  }

  .cart-page__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
    justify-content: center;
  }
}
</style>
