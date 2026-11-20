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
                  role="group"
                  :aria-label="`Quantidade de ${item.produto.nome}`"
                >
                  <button
                    type="button"
                    class="pp-card-action"
                    :disabled="finalizando || item.quantidade <= 1"
                    :aria-label="`Diminuir quantidade de ${item.produto.nome}`"
                    @click="alterarQuantidade(item, item.quantidade - 1)"
                  >
                    <CardActionContent><Minus :size="15" /></CardActionContent>
                  </button>
                  <strong>{{ item.quantidade }}</strong>
                  <button
                    type="button"
                    class="pp-card-action"
                    :disabled="finalizando || !podeAumentar(item)"
                    :aria-label="`Aumentar quantidade de ${item.produto.nome}`"
                    @click="alterarQuantidade(item, item.quantidade + 1)"
                  >
                    <CardActionContent><Plus :size="15" /></CardActionContent>
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
                class="cart-item__remove pp-card-action pp-card-action--danger"
                :disabled="finalizando"
                :aria-label="`Remover ${item.produto.nome} do carrinho`"
                @click="removerItem(item.produto.id)"
              >
                <CardActionContent><X :size="16" /></CardActionContent>
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
            Preços e estoque conferidos ao continuar
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import CardActionContent from "@/components/ui/CardActionContent.vue";
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
let montado = true;
const contextoAtual = contexto => montado && cart.contextoAtual(contexto);
watch(() => cart.geracao, () => {
  estoques.value = {};
  ativos.value = {};
  sincronizando.value = false;
  finalizando.value = false;
  erroFinalizar.value = "";
  toast.value = "";
  window.clearTimeout(toastTimer);
}, { flush: "sync" });

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
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;

  sincronizando.value = true;
  if (!silencioso) erroFinalizar.value = "";

  const itensSnapshot = [...cart.itens];
  const resultados = await Promise.allSettled(
    itensSnapshot.map(async (item) => {
      const detalhe = await catalogService.obterProduto(item.produto.id);
      return { id: item.produto.id, detalhe };
    }),
  );

  if (!contextoAtual(contexto)) return;

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
  const contexto = cart.capturarContexto();
  if (!contextoAtual(contexto)) return;

  finalizando.value = true;
  erroFinalizar.value = "";

  try {
    await sincronizarCarrinho({ silencioso: true });
    if (!contextoAtual(contexto) || cart.vazio) return;

    if (temProblemas.value) {
      erroFinalizar.value = "Revise os itens destacados antes de continuar.";
      return;
    }

    await router.push({ name: "checkout" });
  } catch (error) {
    if (contextoAtual(contexto)) erroFinalizar.value = mensagemErroPedido(error);
  } finally {
    if (contextoAtual(contexto)) finalizando.value = false;
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
  const contexto = cart.capturarContexto();
  sincronizarCarrinho().catch(() => {
    if (!contextoAtual(contexto)) return;
    erroFinalizar.value =
      "Não foi possível atualizar a disponibilidade dos produtos.";
    sincronizando.value = false;
  });
});

onBeforeUnmount(() => {
  montado = false;
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
  margin-bottom: 26px;
}

.cart-page__header h1 {
  margin: 0;
  font-size: clamp(30px, 3vw, 36px);
  line-height: 1.08;
  font-weight: 760;
  letter-spacing: -0.035em;
}

.cart-page__header p {
  margin: 8px 0 0;
  color: var(--student-muted);
  font-size: 15px;
  line-height: 1.5;
}

.cart-page__continue {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #75501b;
  font-size: 13px;
  font-weight: 700;
  text-underline-offset: 4px;
}

.cart-page__empty {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border: 1px solid var(--student-border);
  border-radius: 16px;
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
  font-size: 23px;
  line-height: 1.2;
}

.cart-page__empty p {
  max-width: 390px;
  margin: 12px 0 20px;
  color: var(--student-muted);
  font-size: 14px;
  line-height: 1.5;
}

.cart-page__primary-link {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 20px;
  border-radius: 10px;
  background: #2a211b;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.cart-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 364px;
  gap: 24px;
  align-items: start;
}

.cart-page__items {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 16px;
  background: #fff;
}

.cart-page__section-head {
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--student-border);
}

.cart-page__section-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 740;
}

.cart-page__section-head p {
  margin: 5px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}

.cart-page__clear {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  color: #8c514c;
  font-size: 13px;
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
  gap: 9px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--student-border);
  background: #fbf8f3;
  color: #78664e;
  font-size: 13px;
}

.cart-page__item-list {
  padding: 0 20px;
}

.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 132px 98px 44px;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  border-bottom: 1px solid #eee9e4;
}

.cart-item :deep(.catalog-product-image--compact) {
  width: 92px;
  height: 92px;
  flex-basis: 92px;
  border-radius: 11px;
}

.cart-item:last-child {
  border-bottom: 0;
}

.cart-item--problem {
  margin-inline: -20px;
  padding-inline: 20px;
  background: #fff8f6;
}

.cart-item__info {
  min-width: 0;
}

.cart-item__category {
  display: block;
  margin-bottom: 6px;
  color: #7d7268;
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.045em;
}

.cart-item__info h3 {
  margin: 0 0 9px;
  font-size: 16px;
  font-weight: 720;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.cart-item__prices {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  color: #776c62;
  font-size: 13px;
}

.cart-item__prices strong {
  color: var(--student-text);
  font-size: 15px;
}

.cart-item__old-price {
  color: #aaa29b;
  text-decoration: line-through;
}

.cart-item__problem-text {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 10px 0 0;
  color: var(--student-danger);
  font-size: 13px;
  line-height: 1.45;
}

.cart-item__actions {
  justify-self: start;
}

.cart-item__quantity {
  height: 44px;
  display: grid;
  grid-template-columns: 44px 42px 44px;
  border: 1px solid var(--student-border-strong);
  border-radius: 10px;
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


.cart-item__quantity button:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}
.cart-item__quantity .pp-card-action:focus-visible {
  outline-color: var(--pp-marrom);
  outline-offset: -3px;
}

.cart-item__quantity strong {
  display: grid;
  place-items: center;
  border-inline: 1px solid var(--student-border);
  font-size: 14px;
}

.cart-item__stock {
  display: block;
  margin-top: 8px;
  color: var(--student-muted);
  font-size: 12px;
}

.cart-item__subtotal {
  text-align: right;
}

.cart-item__subtotal span {
  display: block;
  margin-bottom: 6px;
  color: var(--student-muted);
  font-size: 12px;
}

.cart-item__subtotal strong {
  font-size: 16px;
  white-space: nowrap;
}

.cart-item__remove {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #81766c;
  cursor: pointer;
}


.cart-summary {
  position: sticky;
  top: calc(var(--pp-altura-topo) + 24px);
  padding: 22px;
  border: 1px solid var(--student-border);
  border-radius: 16px;
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
  font-size: 18px;
  font-weight: 740;
}

.cart-summary__head > span {
  color: var(--student-muted);
  font-size: 12px;
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
  font-size: 14px;
}

.cart-summary__rows strong {
  font-size: 14px;
  font-weight: 650;
}

.cart-summary__total {
  align-items: baseline;
  padding: 15px 0;
  border-top: 1px solid var(--student-border);
}

.cart-summary__total span {
  font-size: 14px;
  font-weight: 700;
}

.cart-summary__total strong {
  font-size: 28px;
  letter-spacing: -0.03em;
}

.cart-summary__pickup {
  display: grid;
  grid-template-columns: 24px minmax(0,1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 11px;
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
  font-size: 14px;
}

.cart-summary__pickup p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

.cart-summary__error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 9px;
  background: var(--student-danger-soft);
  color: var(--student-danger);
  font-size: 13px;
  line-height: 1.45;
}

.cart-summary__checkout {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 10px;
  background: #2a211b;
  color: #fff;
  font-size: 14px;
  font-weight: 740;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;
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
  gap: 7px;
  margin-top: 12px;
  color: #71675f;
  font-size: 12px;
  line-height: 1.4;
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
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #cadbcd;
  border-radius: 10px;
  background: #f4faf5;
  color: #33583a;
  font-size: 13px;
  font-weight: 650;
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
    gap: 8px;
    margin-bottom: 20px;
  }

  .cart-page__header h1 {
    font-size: 30px;
  }

  .cart-page__header p {
    font-size: 14px;
  }

  .cart-page__continue {
    min-height: 44px;
    font-size: 13px;
  }

  .cart-page__section-head {
    min-height: 76px;
    padding: 14px 15px;
    gap: 8px;
  }

  .cart-page__section-head h2 {
    font-size: 17px;
  }

  .cart-page__section-head p {
    font-size: 12px;
  }

  .cart-page__clear {
    min-width: 74px;
    justify-content: flex-end;
    padding-inline: 5px;
  }

  .cart-page__item-list {
    padding: 0 15px;
  }

  .cart-item {
    grid-template-columns: 80px minmax(0, 1fr) 44px;
    align-items: start;
    gap: 10px;
    padding: 18px 0;
  }

  .cart-item--problem {
    margin-inline: -15px;
    padding-inline: 15px;
  }

  .cart-item :deep(.catalog-product-image--compact) {
    width: 80px;
    height: 80px;
    flex-basis: 80px;
  }

  .cart-item__info h3 {
    font-size: 16px;
  }

  .cart-item__actions,
  .cart-item__subtotal {
    grid-column: 2 / 3;
  }

  .cart-item__actions {
    grid-row: 2;
  }

  .cart-item__subtotal {
    grid-row: 3;
    text-align: left;
  }

  .cart-item__subtotal span {
    display: none;
  }

  .cart-item__remove {
    grid-column: 3;
    grid-row: 1;
  }

  .cart-summary {
    padding: 18px;
  }

  .cart-page__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
    justify-content: center;
  }
}

@media (max-width: 360px) {
  .cart-item {
    grid-template-columns: 72px minmax(0, 1fr) 40px;
    gap: 8px;
  }

  .cart-item :deep(.catalog-product-image--compact) {
    width: 72px;
    height: 72px;
    flex-basis: 72px;
  }

  .cart-item__remove {
    width: 40px;
    height: 44px;
  }
}

.cart-page__continue:focus-visible,
.cart-page__clear:focus-visible,
.cart-page__primary-link:focus-visible,
.cart-item__remove:focus-visible,
.cart-summary__checkout:focus-visible {
  outline: 3px solid #a77532;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .cart-summary__checkout,
  .cart-toast-enter-active,
  .cart-toast-leave-active {
    transition: none;
  }

  .cart-summary__checkout:hover:not(:disabled) {
    transform: none;
  }

  .cart-page__spinner {
    animation: none;
  }
}
</style>
