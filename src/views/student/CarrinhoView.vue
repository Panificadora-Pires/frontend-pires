<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <span class="cart-page__eyebrow">Seu pedido</span>
        <h1>Meu carrinho</h1>
        <p>
          Revise os itens e confira o total antes de seguir para o pagamento.
        </p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="17" />
        Continuar comprando
      </RouterLink>
    </header>

    <section v-if="cart.vazio" class="cart-page__empty">
      <span class="cart-page__empty-icon"><ShoppingCart :size="31" /></span>
      <h2>Seu carrinho está vazio</h2>
      <p>Adicione produtos do cardápio para montar sua reserva.</p>
      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__primary-link">
        Ver cardápio
        <ArrowRight :size="17" />
      </RouterLink>
    </section>

    <div v-else class="cart-page__layout">
      <section class="cart-page__items" aria-labelledby="cart-items-title">
        <div class="cart-page__section-head">
          <div>
            <h2 id="cart-items-title">Produtos selecionados</h2>
            <p>
              {{ cart.totalItens }}
              {{ cart.totalItens === 1 ? "item" : "itens" }} no carrinho
            </p>
          </div>

          <button
            type="button"
            class="cart-page__clear"
            :disabled="finalizando"
            @click="limparCarrinho"
          >
            <Trash2 :size="15" />
            Esvaziar carrinho
          </button>
        </div>

        <div v-if="sincronizando" class="cart-page__sync" role="status">
          <LoaderCircle :size="16" class="cart-page__spinner" />
          Atualizando disponibilidade e preços...
        </div>

        <article
          v-for="item in cart.itens"
          :key="item.produto.id"
          class="cart-item"
          :class="{ 'cart-item--problem': problemaItem(item) }"
        >
          <ProductImage :produto="item.produto" variant="compact" />

          <div class="cart-item__info">
            <span class="cart-item__category">{{
              item.produto.categoria_nome || "Produto"
            }}</span>
            <h3>{{ item.produto.nome }}</h3>

            <div class="cart-item__prices">
              <span
                v-if="item.produto.em_promocao"
                class="cart-item__old-price"
              >
                {{ formatarPreco(item.produto.preco) }}
              </span>
              <strong>{{ formatarPreco(precoUnitario(item)) }}</strong>
              <span>cada</span>
            </div>

            <p v-if="problemaItem(item)" class="cart-item__problem-text">
              <CircleAlert :size="14" />
              {{ problemaItem(item) }}
            </p>
          </div>

          <div class="cart-item__quantity-wrap">
            <span>Quantidade</span>
            <div class="cart-item__quantity">
              <button
                type="button"
                :disabled="finalizando || item.quantidade <= 1"
                :aria-label="`Diminuir quantidade de ${item.produto.nome}`"
                @click="alterarQuantidade(item, item.quantidade - 1)"
              >
                <Minus :size="16" />
              </button>
              <strong>{{ item.quantidade }}</strong>
              <button
                type="button"
                :disabled="finalizando || !podeAumentar(item)"
                :aria-label="`Aumentar quantidade de ${item.produto.nome}`"
                @click="alterarQuantidade(item, item.quantidade + 1)"
              >
                <Plus :size="16" />
              </button>
            </div>
            <small v-if="estoqueConhecido(item)">
              {{ estoqueDisponivel(item) }}
              {{ estoqueDisponivel(item) === 1 ? "disponível" : "disponíveis" }}
            </small>
          </div>

          <div class="cart-item__subtotal">
            <span>Subtotal</span>
            <strong>{{
              formatarPreco(precoUnitario(item) * item.quantidade)
            }}</strong>
          </div>

          <button
            type="button"
            class="cart-item__remove"
            :disabled="finalizando"
            :aria-label="`Remover ${item.produto.nome} do carrinho`"
            @click="removerItem(item.produto.id)"
          >
            <X :size="17" />
          </button>
        </article>
      </section>

      <aside class="cart-summary">
        <div class="cart-summary__head">
          <span class="cart-summary__icon"><ReceiptText :size="20" /></span>
          <div>
            <span class="cart-page__eyebrow">Resumo</span>
            <h2>Seu pedido</h2>
          </div>
        </div>

        <div class="cart-summary__rows">
          <div>
            <span>Quantidade de itens</span>
            <strong>{{ cart.totalItens }}</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
          </div>
          <div>
            <span>Taxas</span>
            <strong>R$ 0,00</strong>
          </div>
        </div>

        <div class="cart-summary__total">
          <span>Total</span>
          <strong>{{ formatarPreco(cart.totalPreco) }}</strong>
        </div>

        <div class="cart-summary__notice">
          <Clock3 :size="17" />
          <p>
            Na próxima etapa você escolhe Pix, cartão ou dinheiro na retirada.
          </p>
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
            :size="19"
            class="cart-page__spinner"
          />
          <ShoppingBag v-else :size="19" />
          {{ finalizando ? "Verificando carrinho..." : "Ir para pagamento" }}
        </button>

        <p class="cart-summary__footnote">
          Os preços e o estoque são conferidos antes de abrir o checkout seguro.
        </p>
      </aside>
    </div>

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
  return Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id);
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
  gap: 22px;
  margin-bottom: 22px;
}
.cart-page__eyebrow {
  display: none;
}
.cart-page__header h1 {
  margin: 0;
  font-size: 30px;
}
.cart-page__header p {
  margin: 6px 0 0;
  color: var(--student-muted);
  font-size: 13px;
}
.cart-page__continue {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #745019;
  font-size: 11px;
  font-weight: 700;
}
.cart-page__empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.cart-page__empty-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  border-radius: 50%;
  background: #f2eee8;
  color: #85602a;
}
.cart-page__empty h2 {
  margin: 0;
  font-size: 19px;
}
.cart-page__empty p {
  margin: 7px 0 16px;
  color: var(--student-muted);
  font-size: 12px;
}
.cart-page__primary-link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border-radius: 7px;
  background: #2a211b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.cart-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  align-items: start;
}
.cart-page__items {
  overflow: hidden;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.cart-page__section-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 17px;
  border-bottom: 1px solid var(--student-border);
}
.cart-page__section-head h2 {
  margin: 0;
  font-size: 16px;
}
.cart-page__section-head p {
  margin: 3px 0 0;
  color: var(--student-muted);
  font-size: 10px;
}
.cart-page__clear {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9a4945;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}
.cart-page__sync {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--student-border);
  background: #fbf8f3;
  color: #7b674d;
  font-size: 10px;
}
.cart-page__spinner {
  animation: cart-spin 0.7s linear infinite;
}
.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) 122px 92px 30px;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid var(--student-border);
}
.cart-item:last-child {
  border-bottom: 0;
}
.cart-item--problem {
  background: #fff8f6;
}
.cart-item__info {
  min-width: 0;
}
.cart-item__category {
  display: block;
  color: var(--student-muted);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cart-item__info h3 {
  margin: 4px 0 8px;
  font-size: 13px;
}
.cart-item__prices {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--student-muted);
  font-size: 9px;
}
.cart-item__prices strong {
  color: var(--student-text);
  font-size: 12px;
}
.cart-item__old-price {
  text-decoration: line-through;
  color: #9d958d;
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
.cart-item__quantity-wrap > span,
.cart-item__subtotal > span {
  display: block;
  margin-bottom: 6px;
  color: var(--student-muted);
  font-size: 9px;
}
.cart-item__quantity {
  height: 34px;
  display: grid;
  grid-template-columns: 32px 40px 32px;
  border: 1px solid var(--student-border-strong);
  border-radius: 7px;
  overflow: hidden;
}
.cart-item__quantity button {
  border: 0;
  background: #faf8f5;
  color: var(--student-text);
  cursor: pointer;
}
.cart-item__quantity button:disabled {
  opacity: 0.35;
}
.cart-item__quantity strong {
  display: grid;
  place-items: center;
  border-inline: 1px solid var(--student-border);
  font-size: 11px;
}
.cart-item__quantity-wrap small {
  display: block;
  margin-top: 5px;
  color: var(--student-muted);
  font-size: 8px;
}
.cart-item__subtotal {
  text-align: right;
}
.cart-item__subtotal strong {
  font-size: 13px;
}
.cart-item__remove {
  width: 30px;
  height: 30px;
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
  padding: 18px;
  border: 1px solid var(--student-border);
  border-radius: 10px;
  background: #fff;
}
.cart-summary__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--student-border);
}
.cart-summary__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #f2eee8;
  color: #7c5925;
}
.cart-summary h2 {
  margin: 0;
  font-size: 16px;
}
.cart-summary__rows {
  padding: 14px 0;
  border-bottom: 1px solid var(--student-border);
}
.cart-summary__rows > div,
.cart-summary__total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.cart-summary__rows > div + div {
  margin-top: 9px;
}
.cart-summary__rows span {
  color: var(--student-muted);
  font-size: 10px;
}
.cart-summary__rows strong {
  font-size: 10px;
}
.cart-summary__total {
  align-items: baseline;
  padding: 15px 0;
}
.cart-summary__total span {
  font-size: 12px;
  font-weight: 700;
}
.cart-summary__total strong {
  font-size: 21px;
}
.cart-summary__notice,
.cart-summary__error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 7px;
  font-size: 9px;
  line-height: 1.45;
}
.cart-summary__notice {
  background: #f7f3ed;
  color: #6b5f52;
}
.cart-summary__error {
  background: var(--student-danger-soft);
  color: var(--student-danger);
}
.cart-summary__notice p {
  margin: 0;
}
.cart-summary__checkout {
  width: 100%;
  min-height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 8px;
  background: #2a211b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.cart-summary__checkout:disabled {
  opacity: 0.45;
}
.cart-summary__footnote {
  margin: 9px 2px 0;
  color: var(--student-muted);
  font-size: 8px;
  line-height: 1.45;
  text-align: center;
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
.cart-toast-enter-active,
.cart-toast-leave-active {
  transition: opacity 0.15s ease;
}
.cart-toast-enter-from,
.cart-toast-leave-to {
  opacity: 0;
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
  }
  .cart-page__header h1 {
    font-size: 25px;
  }
  .cart-item {
    grid-template-columns: 66px minmax(0, 1fr) 30px;
    gap: 10px;
  }
  .cart-item :deep(.catalog-product-image--compact) {
    width: 66px;
    height: 66px;
    flex-basis: 66px;
  }
  .cart-item__quantity-wrap,
  .cart-item__subtotal {
    grid-column: 2/3;
  }
  .cart-item__subtotal {
    text-align: left;
  }
  .cart-item__remove {
    grid-column: 3;
    grid-row: 1;
  }
  .cart-item__quantity-wrap > span,
  .cart-item__subtotal > span {
    display: none;
  }
  .cart-page__section-head {
    align-items: flex-start;
  }
  .cart-page__clear {
    padding: 5px;
  }
  .cart-page__toast {
    left: 13px;
    right: 13px;
    bottom: 78px;
  }
}
</style>
