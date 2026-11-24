<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <h1>Seu carrinho</h1>
        <p>Seu intervalo começa por aqui.</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="16" />
        Continuar comprando
      </RouterLink>
    </header>

    <Transition name="cart-content" mode="out-in" @after-enter="focarVazioAposTransicao">
      <section v-if="cart.vazio" key="vazio" class="cart-page__empty">
      <div class="cart-page__empty-copy">
        <span class="cart-page__eyebrow">Falta só escolher</span>
        <h2>Um intervalo<br>com seu sabor.</h2>
        <p>Seu carrinho está vazio. Encontre seu próximo favorito no cardápio.</p>
        <RouterLink :to="{ name: 'cardapio' }" class="cart-page__primary-link">Explorar cardápio <ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      </div>
      <div class="cart-page__empty-art" aria-hidden="true"><ProductIllustration tipo="coxinha" /><span>feito para o seu intervalo</span></div>
    </section>

      <div v-else key="com-itens" class="cart-page__content">
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
              ref="botaoLimparRef"
              class="cart-page__clear"
              :disabled="finalizando"
              @click="abrirConfirmacaoLimpeza"
            >
              <Trash2 :size="14" />
              Limpar
            </button>
          </div>

          <div v-if="sincronizando" class="cart-page__sync" role="status">
            <LoaderCircle :size="15" class="cart-page__spinner" />
            Conferindo preços e disponibilidade...
          </div>

          <TransitionGroup name="cart-item-list" tag="div" class="cart-page__item-list">
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
                class="cart-item__remove"
                :disabled="finalizando"
                :aria-label="`Remover ${item.produto.nome} do carrinho`"
                @click="removerItem(item.produto.id)"
              >
                <X :size="18" aria-hidden="true" />
              </button>
            </article>
          </TransitionGroup>
        </section>

        <aside class="cart-summary" aria-labelledby="cart-summary-title">
          <span class="cart-summary__eyebrow">Balcão Pires</span>
          <div class="cart-summary__head">
            <h2 id="cart-summary-title">Seu pedido</h2>
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
            <Transition name="cart-price" mode="out-in">
              <strong :key="cart.totalPreco">{{ formatarPreco(cart.totalPreco) }}</strong>
            </Transition>
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
      </div>
    </Transition>

    <dialog
      ref="dialogoLimpezaRef"
      class="cart-clear-dialog"
      aria-labelledby="cart-clear-dialog-title"
      aria-describedby="cart-clear-dialog-description"
      @close="restaurarFocoLimpeza"
    >
      <span class="cart-clear-dialog__eyebrow">SEU CARRINHO</span>
      <h2 id="cart-clear-dialog-title" class="cart-clear-dialog__title">
        Tirar tudo do carrinho?
      </h2>
      <p id="cart-clear-dialog-description" class="cart-clear-dialog__description">
        Todos os produtos escolhidos serão removidos. Você pode adicioná-los novamente pelo cardápio.
      </p>
      <div class="cart-clear-dialog__actions">
        <button
          ref="botaoCancelarLimpezaRef"
          type="button"
          class="cart-clear-dialog__cancel"
          @click="fecharConfirmacaoLimpeza"
        >
          Manter produtos
        </button>
        <button
          type="button"
          class="cart-clear-dialog__confirm"
          @click="confirmarLimpezaCarrinho"
        >
          <Trash2 :size="17" aria-hidden="true" />
          Sim, limpar carrinho
        </button>
      </div>
    </dialog>

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

import ProductIllustration from "@/components/catalog/ProductIllustration.vue";
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
const dialogoLimpezaRef = ref(null);
const botaoLimparRef = ref(null);
const botaoCancelarLimpezaRef = ref(null);
const focarAoEsvaziar = ref(false);
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
  focarAoEsvaziar.value = false;
  if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
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
  if (Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id))
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

function abrirConfirmacaoLimpeza() {
  if (finalizando.value || cart.vazio || dialogoLimpezaRef.value?.open) return;
  dialogoLimpezaRef.value?.showModal();
  nextTick(() => botaoCancelarLimpezaRef.value?.focus());
}

function fecharConfirmacaoLimpeza() {
  dialogoLimpezaRef.value?.close();
}

function restaurarFocoLimpeza() {
  if (focarAoEsvaziar.value) return;
  nextTick(() => botaoLimparRef.value?.focus());
}

function focarVazioAposTransicao() {
  if (!focarAoEsvaziar.value || !cart.vazio) return;
  focarAoEsvaziar.value = false;
  document.querySelector(".cart-page__primary-link")?.focus();
}

function confirmarLimpezaCarrinho() {
  if (finalizando.value) return;
  focarAoEsvaziar.value = true;
  dialogoLimpezaRef.value?.close();
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
  cart.atualizarRascunho();
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
  if (dialogoLimpezaRef.value?.open) dialogoLimpezaRef.value.close();
});
</script>

<style scoped>
/* Modal nativo sem janela do Chrome: o estilo e as ações pertencem à Pires. */
.cart-clear-dialog {
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  margin: auto;
  padding: 30px;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 18px 18px 18px 6px;
  background: var(--pp-creme);
  color: var(--pp-marrom);
  box-shadow: 0 24px 80px rgba(35, 19, 9, .25);
  font-family: var(--pp-font-body);
}
.cart-clear-dialog::backdrop {
  background: rgba(30, 18, 9, .58);
}
.cart-clear-dialog__eyebrow {
  display: block;
  margin-bottom: 12px;
  color: var(--pp-dourado-profundo);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .12em;
}
.cart-clear-dialog__title {
  margin: 0;
  font: 400 clamp(30px, 7vw, 38px)/1.15 var(--pp-font-titulo);
}
.cart-clear-dialog__description {
  margin: 14px 0 28px;
  color: var(--pp-texto-2);
  font-size: 15px;
  line-height: 1.6;
}
.cart-clear-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.cart-clear-dialog__actions button {
  flex: 1 1 155px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 9px;
  font: 650 14px/1.3 var(--pp-font-body);
  cursor: pointer;
  transition: transform .15s ease, background .15s ease, border-color .15s ease;
}
.cart-clear-dialog__cancel {
  border: 1px solid var(--pp-creme-borda);
  background: transparent;
  color: var(--pp-marrom);
}
.cart-clear-dialog__cancel:hover {
  background: #eee2d2;
}
.cart-clear-dialog__confirm {
  border: 1px solid var(--pp-marrom);
  background: var(--pp-marrom);
  color: var(--pp-creme);
}
.cart-clear-dialog__confirm:hover {
  background: #442718;
}
.cart-clear-dialog__actions button:active {
  transform: scale(.985);
}
.cart-clear-dialog__actions button:focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 3px;
}
@media (max-width: 520px) {
  .cart-clear-dialog {
    padding: 25px 20px;
  }
  .cart-clear-dialog__actions {
    flex-direction: column;
  }
  .cart-clear-dialog__actions button {
    flex: auto;
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cart-clear-dialog__actions button {
    transition: none;
  }
}
.cart-page {
  width: min(100%,1280px);
  margin: auto;
  color: var(--pp-marrom);
  font-family: var(--pp-font-body);
  padding-bottom: 40px;
}
.cart-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 0 32px;
  border-bottom: 1px solid var(--pp-creme-borda);
  margin-bottom: 32px;
}
.cart-page__header h1 {
  margin: 0;
  font: 400 clamp(50px,7vw,92px)/1.08 var(--pp-font-titulo);
  letter-spacing: -.025em;
}
.cart-page__header p {
  margin: 8px 0 0;
  color: var(--pp-dourado-profundo);
  font: 700 28px/1.2 var(--pp-font-nota);
}
.cart-page__continue {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 600;
  color: var(--pp-marrom);
}
.cart-page__layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 350px;
  gap: 48px;
  align-items: start;
}
.cart-page__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.cart-page__section-head h2 {
  font: 400 28px/1.2 var(--pp-font-titulo);
  margin: 0;
}
.cart-page__section-head p {
  margin: 6px 0 0;
  color: var(--pp-texto-2);
  font-size: 14px;
}
.cart-page__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pp-texto-2);
  min-height: 44px;
  padding: 9px 15px;
  font: 600 14px/1.4 var(--pp-font-body);
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease,
    border-color 180ms ease, transform 180ms ease;
}
.cart-page__clear svg {
  transition: transform 180ms ease;
}
@media (hover: hover) {
  .cart-page__clear:hover:not(:disabled) {
    background: #eee5da;
    border-color: var(--pp-creme-borda);
    color: var(--pp-marrom);
    transform: translateY(-1px);
  }
  .cart-page__clear:hover:not(:disabled) svg {
    transform: rotate(-9deg);
  }
}
.cart-page__clear:active:not(:disabled) {
  background: #e6d8c7;
  transform: translateY(1px);
}
.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 128px minmax(0,1fr) auto;
  gap: 16px 22px;
  align-items: center;
  padding: 26px 0;
  border-bottom: 1px solid var(--pp-creme-borda);
}
.cart-item :deep(.catalog-product-image--compact) {
  width: 128px;
  height: 128px;
  border-radius: 50% 50% 12px 12px;
  grid-row: span 2;
}
.cart-item__info {
  min-width: 0;
  padding-right: 30px;
}
.cart-item__category,.cart-page__eyebrow {
  color: var(--pp-texto-2);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.cart-item h3 {
  margin: 7px 0 10px;
  font-size: 20px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.cart-item__prices {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
}
.cart-item__old-price {
  color: var(--pp-texto-2);
  text-decoration: line-through;
}
.cart-item__prices strong {
  font-size: 16px;
}
.cart-item__actions {
  grid-column: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.cart-item__quantity {
  display: flex;
  align-items: center;
  border: 1px solid var(--pp-creme-borda);
  border-radius: 999px;
  overflow: hidden;
}
.cart-item__quantity button {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--pp-marrom);
  cursor: pointer;
}
.cart-item__quantity strong {
  min-width: 30px;
  text-align: center;
}
.cart-item__stock {
  color: var(--pp-texto-2);
  font-size: 14px;
}
.cart-item__subtotal {
  grid-column: 3;
  grid-row: 1 / span 2;
  text-align: right;
}
.cart-item__subtotal span {
  display: block;
  color: var(--pp-texto-2);
  font-size: 14px;
  margin-bottom: 6px;
}
.cart-item__subtotal strong {
  font-size: 22px;
  white-space: nowrap;
}
.cart-item__remove {
  position: absolute;
  right: 0;
  top: 8px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--pp-texto-2);
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}
@media (hover: hover) {
  .cart-item__remove:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pp-auth-error) 10%, transparent);
    color: var(--pp-auth-error);
    transform: translateY(-1px);
  }
}
.cart-item__remove:focus-visible {
  outline: 2px solid var(--pp-dourado-profundo);
  outline-offset: 2px;
  background: color-mix(in srgb, var(--pp-auth-error) 10%, transparent);
}
.cart-item__remove:disabled {
  cursor: not-allowed;
  opacity: .5;
}
@media (prefers-reduced-motion: reduce) {
  .cart-item__remove { transition: none; }
}
.cart-item--problem {
  border-bottom-color: var(--student-danger);
}
.cart-item__problem-text {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--pp-auth-error);
  font-size: 14px;
  margin: 8px 0 0;
}
.cart-summary {
  position: sticky;
  top: calc(var(--pp-altura-topo) + 24px);
  padding: 28px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  border-radius: 3px 3px 24px 3px;
}
.cart-summary__eyebrow {
  font-size: 12px;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--pp-gold);
}
.cart-summary__head {
  margin: 18px 0 28px;
}
.cart-summary__head h2 {
  color: var(--pp-creme);
  font: 400 38px/1.15 var(--pp-font-titulo);
  margin: 0 0 8px;
}
.cart-summary__head>span {
  font-size: 14px;
  color: var(--pp-cream-dim);
}
.cart-summary__rows {
  display: grid;
  gap: 16px;
  font-size: 14px;
}
.cart-summary__rows>div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.cart-summary__total {
  border-top: 1px dashed var(--pp-border);
  margin-top: 24px;
  padding: 24px 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.cart-summary__total strong {
  font-size: 32px;
  letter-spacing: -.04em;
  white-space: nowrap;
}
.cart-summary__pickup {
  display: flex;
  gap: 10px;
  padding-bottom: 24px;
}
.cart-summary__pickup svg,.cart-summary__safe svg {
  flex-shrink: 0;
}
.cart-summary__pickup strong {
  font-size: 14px;
}
.cart-summary__pickup p {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--pp-cream-dim);
}
.cart-summary__checkout,.cart-page__primary-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 54px;
  padding: 14px 16px;
  border: 0;
  border-radius: 8px;
  background: var(--pp-gold);
  color: var(--pp-marrom);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms,transform 180ms;
  text-decoration: none;
}
.cart-summary__checkout {
  width: 100%;
}
.cart-summary__checkout:hover:not(:disabled),.cart-page__primary-link:hover {
  background: var(--pp-gold-hover);
  transform: translateY(-2px);
}
.cart-summary__checkout:active:not(:disabled),.cart-page__primary-link:active {
  transform: translateY(1px);
}
.cart-summary__safe {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  color: var(--pp-cream-dim);
  font-size: 12px;
  line-height: 1.5;
}
.cart-summary__error {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--pp-creme);
  color: var(--pp-auth-error);
  font-size: 14px;
  line-height: 1.5;
  border-radius: 4px;
}
.cart-page__sync {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px 0;
  font-size: 14px;
  color: var(--pp-texto-2);
}
.cart-page :is(a,button):focus-visible {
  outline: 3px solid var(--pp-dourado-escuro);
  outline-offset: 4px;
}
.cart-summary button:focus-visible {
  outline-color: var(--pp-creme);
}
.cart-page button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.cart-page__empty {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: center;
  min-height: 470px;
  gap: 48px;
  padding: 24px 40px 48px;
}
.cart-page__empty h2 {
  font: 400 clamp(42px,5.4vw,76px)/1.08 var(--pp-font-titulo);
  margin: 18px 0;
  letter-spacing: -.02em;
}
.cart-page__empty p {
  max-width: 350px;
  color: var(--pp-texto-2);
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 24px;
}
.cart-page__primary-link {
  width: fit-content;
}
.cart-page__empty-art {
  padding: 30px;
  background: var(--pp-creme-2);
  border-radius: 50% 50% 4px 4px;
  transform: rotate(4deg);
}
.cart-page__empty-art :deep(svg) {
  display: block;
  width: 100%;
  height: 250px;
}
.cart-page__empty-art span {
  display: block;
  text-align: center;
  color: var(--pp-dourado-profundo);
  font: 700 26px/1.3 var(--pp-font-nota);
}
.cart-page__toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 110;
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 14px 20px;
  background: var(--pp-marrom);
  color: var(--pp-creme);
  border-radius: 8px;
  font-size: 14px;
}
.cart-page__spinner {
  animation: cart-spin .8s linear infinite;
}
@keyframes cart-spin {
  to {
    transform: rotate(360deg);
  }
}
/* Transições sutis nos estados vazio/preenchido, remoção de item e total. */
.cart-content-enter-active,.cart-content-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}
.cart-content-enter-from {
  opacity: 0;
  transform: translateY(14px);
}
.cart-content-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.cart-item-list-enter-active,.cart-item-list-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.cart-item-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.cart-item-list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
.cart-price-enter-active,.cart-price-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}
.cart-price-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.cart-price-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.cart-toast-enter-active,.cart-toast-leave-active {
  transition: opacity 180ms;
}
.cart-toast-enter-from,.cart-toast-leave-to {
  opacity: 0;
}
@media(max-width:1100px) {
  .cart-page__layout {
    grid-template-columns: minmax(0,1fr) 310px;
    gap: 24px;
  }
  .cart-item {
    grid-template-columns: 100px minmax(0,1fr);
    gap: 16px;
  }
  .cart-item :deep(.catalog-product-image--compact) {
    width: 100px;
    height: 100px;
  }
  .cart-item__subtotal {
    grid-column: 2;
    grid-row: auto;
    text-align: left;
  }
  .cart-item__subtotal span {
    display: inline;
    margin-right: 8px;
  }
  .cart-item__subtotal strong {
    font-size: 18px;
  }
}
@media(max-width:800px) {
  .cart-page__layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .cart-summary {
    position: static;
  }
  .cart-item {
    grid-template-columns: 128px minmax(0,1fr) auto;
  }
  .cart-item :deep(.catalog-product-image--compact) {
    width: 128px;
    height: 128px;
  }
  .cart-item__subtotal {
    grid-column: 3;
    grid-row: 1 / span 2;
  }
  .cart-item__subtotal span {
    display: block;
  }
  .cart-page__empty {
    gap: 24px;
    padding: 24px 0;
  }
}
@media(max-width:520px) {
  .cart-page__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
    padding-top: 8px;
    padding-bottom: 20px;
  }
  .cart-page__header h1 {
    font-size: clamp(44px,12vw,62px);
  }
  .cart-page__header p {
    font-size: 24px;
  }
  .cart-item {
    grid-template-columns: 88px minmax(0,1fr);
    gap: 12px;
    padding: 24px 0;
  }
  .cart-item :deep(.catalog-product-image--compact) {
    width: 88px;
    height: 100px;
  }
  .cart-item h3 {
    font-size: 18px;
  }
  .cart-item__info {
    padding-right: 22px;
  }
  .cart-item__category {
    font-size: 11px;
  }
  .cart-item__actions {
    gap: 8px;
  }
  .cart-item__subtotal {
    grid-column: 2;
    grid-row: auto;
    text-align: left;
  }
  .cart-item__subtotal span {
    display: inline;
  }
  .cart-item__remove {
    top: 12px;
    right: -8px;
  }
  .cart-summary {
    padding: 24px 20px;
  }
  .cart-summary__total strong {
    font-size: 30px;
  }
  .cart-page__empty {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .cart-page__empty-art {
    grid-row: 1;
    width: 70%;
    justify-self: end;
    padding: 16px;
  }
  .cart-page__empty-art :deep(svg) {
    height: 130px;
  }
  .cart-page__empty-art span {
    font-size: 20px;
  }
  .cart-page__empty h2 {
    font-size: 48px;
  }
  .cart-page__empty p {
    font-size: 16px;
  }
}
@media(prefers-reduced-motion:reduce) {
  .cart-page *, .cart-page *::before {
    animation: none!important;
    transition: none!important;
  }
  .cart-content-enter-active,.cart-content-leave-active,
  .cart-item-list-enter-active,.cart-item-list-leave-active,
  .cart-price-enter-active,.cart-price-leave-active {
    transition: none!important;
    transform: none!important;
  }
}
</style>
