<template>
  <div class="cart-page">
    <header class="cart-page__header">
      <div>
        <span class="cart-page__eyebrow">Seu pedido</span>
        <h1>Meu carrinho</h1>
        <p>Revise os produtos, ajuste as quantidades e confirme sua reserva.</p>
      </div>

      <RouterLink :to="{ name: 'cardapio' }" class="cart-page__continue">
        <ArrowLeft :size="17" />
        Continuar comprando
      </RouterLink>
    </header>

    <section v-if="pedidoCriado" class="cart-page__success" aria-live="polite">
      <span class="cart-page__success-icon">
        <CircleCheckBig :size="34" />
      </span>
      <span class="cart-page__eyebrow">Pedido confirmado</span>
      <h2>Pedido #{{ pedidoCriado.id }} criado com sucesso</h2>
      <p>
        A Pires Panificadora recebeu sua reserva. Acompanhe o status em Meus Pedidos;
        quando estiver pronto, o QR Code de retirada ficará disponível.
      </p>

      <div class="cart-page__success-summary">
        <div>
          <span>Status inicial</span>
          <strong>{{ pedidoCriado.status_display || 'Pendente' }}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{{ formatarPreco(pedidoCriado.total) }}</strong>
        </div>
      </div>

      <div class="cart-page__success-actions">
        <RouterLink :to="{ name: 'pedidos' }" class="cart-page__primary-link">
          Acompanhar pedido
          <ArrowRight :size="17" />
        </RouterLink>
        <RouterLink :to="{ name: 'cardapio' }" class="cart-page__secondary-link">
          Voltar ao cardápio
        </RouterLink>
      </div>
    </section>

    <section v-else-if="cart.vazio" class="cart-page__empty">
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
            <p>{{ cart.totalItens }} {{ cart.totalItens === 1 ? 'item' : 'itens' }} no carrinho</p>
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
            <span class="cart-item__category">{{ item.produto.categoria_nome || 'Produto' }}</span>
            <h3>{{ item.produto.nome }}</h3>

            <div class="cart-item__prices">
              <span v-if="item.produto.em_promocao" class="cart-item__old-price">
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
              {{ estoqueDisponivel(item) }} {{ estoqueDisponivel(item) === 1 ? 'disponível' : 'disponíveis' }}
            </small>
          </div>

          <div class="cart-item__subtotal">
            <span>Subtotal</span>
            <strong>{{ formatarPreco(precoUnitario(item) * item.quantidade) }}</strong>
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
          <p>Após confirmar, acompanhe o preparo em <strong>Meus Pedidos</strong>.</p>
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
          <LoaderCircle v-if="finalizando" :size="19" class="cart-page__spinner" />
          <ShoppingBag v-else :size="19" />
          {{ finalizando ? 'Confirmando pedido...' : 'Confirmar pedido' }}
        </button>

        <p class="cart-summary__footnote">
          Os preços e o estoque são conferidos novamente antes da criação do pedido.
        </p>
      </aside>
    </div>

    <Transition name="cart-toast">
      <div v-if="toast" class="cart-page__toast" role="status" aria-live="polite">
        <Check :size="17" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
} from 'lucide-vue-next'

import ProductImage from '@/components/catalog/ProductImage.vue'
import catalogService from '@/services/catalog.service'
import orderService from '@/services/order.service'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()

const estoques = ref({})
const ativos = ref({})
const sincronizando = ref(false)
const finalizando = ref(false)
const erroFinalizar = ref('')
const pedidoCriado = ref(null)
const toast = ref('')
let toastTimer = null

const temProblemas = computed(() => cart.itens.some((item) => Boolean(problemaItem(item))))

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function precoUnitario(item) {
  return Number(item?.produto?.preco_atual ?? item?.produto?.preco ?? 0)
}

function estoqueConhecido(item) {
  return Object.prototype.hasOwnProperty.call(estoques.value, item.produto.id)
}

function estoqueDisponivel(item) {
  if (estoqueConhecido(item)) return Number(estoques.value[item.produto.id] || 0)
  if (item.produto.estoque !== undefined) return Number(item.produto.estoque || 0)
  return 0
}

function problemaItem(item) {
  const id = item.produto.id

  if (ativos.value[id] === false) {
    return 'Este produto não está mais disponível para venda.'
  }

  if (!estoqueConhecido(item)) return ''

  const estoque = estoqueDisponivel(item)
  if (estoque <= 0) return 'Produto sem estoque no momento.'
  if (item.quantidade > estoque) {
    return `A quantidade escolhida excede o estoque atual (${estoque}).`
  }

  return ''
}

function podeAumentar(item) {
  if (!estoqueConhecido(item)) return false
  return estoqueDisponivel(item) > item.quantidade && ativos.value[item.produto.id] !== false
}

function alterarQuantidade(item, quantidade) {
  const estoque = estoqueDisponivel(item)

  if (quantidade > estoque && estoqueConhecido(item)) {
    mostrarToast(`Há somente ${estoque} ${estoque === 1 ? 'unidade disponível' : 'unidades disponíveis'}.`)
    return
  }

  cart.alterarQuantidade(item.produto.id, quantidade)
  erroFinalizar.value = ''
}

function removerItem(produtoId) {
  cart.removerItem(produtoId)
  delete estoques.value[produtoId]
  delete ativos.value[produtoId]
  estoques.value = { ...estoques.value }
  ativos.value = { ...ativos.value }
  erroFinalizar.value = ''
  mostrarToast('Produto removido do carrinho.')
}

function limparCarrinho() {
  if (!window.confirm('Deseja realmente remover todos os produtos do carrinho?')) return
  cart.limpar()
  estoques.value = {}
  ativos.value = {}
  erroFinalizar.value = ''
}

async function sincronizarCarrinho({ silencioso = false } = {}) {
  if (cart.vazio || sincronizando.value) return

  sincronizando.value = true
  if (!silencioso) erroFinalizar.value = ''

  const itensSnapshot = [...cart.itens]
  const resultados = await Promise.allSettled(
    itensSnapshot.map(async (item) => {
      const detalhe = await catalogService.obterProduto(item.produto.id)
      return { id: item.produto.id, detalhe }
    }),
  )

  const novosEstoques = { ...estoques.value }
  const novosAtivos = { ...ativos.value }
  let falhas = 0

  resultados.forEach((resultado, index) => {
    const itemOriginal = itensSnapshot[index]
    const id = itemOriginal.produto.id

    if (resultado.status === 'fulfilled') {
      const detalhe = resultado.value.detalhe
      novosEstoques[id] = Number(detalhe?.estoque ?? 0)
      novosAtivos[id] = detalhe?.ativo !== false

      const itemAtual = cart.itens.find((item) => item.produto.id === id)
      if (itemAtual) {
        itemAtual.produto = {
          ...itemAtual.produto,
          ...detalhe,
        }
      }
    } else {
      falhas += 1
      novosAtivos[id] = false
    }
  })

  estoques.value = novosEstoques
  ativos.value = novosAtivos
  sincronizando.value = false

  if (falhas && !silencioso) {
    erroFinalizar.value = 'Não foi possível atualizar todos os produtos do carrinho.'
  }
}

async function finalizarPedido() {
  if (cart.vazio || finalizando.value) return

  finalizando.value = true
  erroFinalizar.value = ''

  try {
    await sincronizarCarrinho({ silencioso: true })

    if (temProblemas.value) {
      erroFinalizar.value = 'Revise os itens destacados antes de confirmar o pedido.'
      return
    }

    const itensCriacao = cart.itens.map((item) => ({
      produto: item.produto.id,
      quantidade: item.quantidade,
    }))

    const { data } = await orderService.criar(itensCriacao)
    pedidoCriado.value = data
    cart.limpar()
    estoques.value = {}
    ativos.value = {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    erroFinalizar.value = mensagemErroPedido(error)
    await sincronizarCarrinho({ silencioso: true }).catch(() => {})
  } finally {
    finalizando.value = false
  }
}

function mensagemErroPedido(error) {
  const data = error?.response?.data

  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.itens_criacao === 'string') return data.itens_criacao
  if (Array.isArray(data?.itens_criacao)) return data.itens_criacao.join(' ')

  if (data && typeof data === 'object') {
    const primeiraMensagem = Object.values(data)
      .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
      .find((valor) => typeof valor === 'string')

    if (primeiraMensagem) return primeiraMensagem
  }

  return 'Não foi possível confirmar o pedido. Verifique sua conexão e tente novamente.'
}

function mostrarToast(mensagem) {
  toast.value = mensagem
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2200)
}

onMounted(() => {
  sincronizarCarrinho().catch(() => {
    erroFinalizar.value = 'Não foi possível atualizar a disponibilidade dos produtos.'
    sincronizando.value = false
  })
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer)
})
</script>

<style scoped>
.cart-page {
  width: min(100%, 1240px);
  margin: 0 auto;
  color: var(--pp-text-dark);
}

.cart-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.cart-page__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #bd7a10;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.cart-page__header h1 {
  margin: 0;
  color: #201b17;
  font-size: clamp(31px, 4vw, 43px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.cart-page__header p {
  margin: 9px 0 0;
  color: #81776e;
  font-size: 12.5px;
}

.cart-page__continue,
.cart-page__primary-link,
.cart-page__secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 11.5px;
  font-weight: 800;
}

.cart-page__continue,
.cart-page__secondary-link {
  border: 1px solid rgba(47, 31, 20, 0.1);
  background: #fff;
  color: #5f554c;
}

.cart-page__primary-link {
  border: 0;
  background: linear-gradient(135deg, #dda238, #f0b63f);
  color: #2b190d;
  box-shadow: 0 8px 22px rgba(224, 168, 62, 0.2);
}

.cart-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: 24px;
}

.cart-page__items,
.cart-summary,
.cart-page__empty,
.cart-page__success {
  border: 1px solid rgba(45, 29, 19, 0.075);
  background: #fff;
  box-shadow: 0 10px 32px rgba(46, 31, 20, 0.045);
}

.cart-page__items {
  padding: 20px;
  border-radius: 20px;
}

.cart-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 2px 2px 17px;
  border-bottom: 1px solid #eee7df;
}

.cart-page__section-head h2,
.cart-summary h2 {
  margin: 0;
  color: #29231e;
  font-size: 17px;
}

.cart-page__section-head p {
  margin: 4px 0 0;
  color: #91877e;
  font-size: 10.5px;
}

.cart-page__clear {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 0;
  background: transparent;
  color: #9a5d52;
  font-size: 10.5px;
  font-weight: 750;
  cursor: pointer;
}

.cart-page__sync {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #faf6ef;
  color: #806f5d;
  font-size: 10.5px;
}

.cart-page__spinner {
  animation: cart-spin 700ms linear infinite;
}

@keyframes cart-spin {
  to { transform: rotate(360deg); }
}

.cart-item {
  position: relative;
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto minmax(105px, auto) 32px;
  align-items: center;
  gap: 15px;
  padding: 18px 2px;
  border-bottom: 1px solid #f0ebe5;
}

.cart-item:last-child {
  border-bottom: 0;
  padding-bottom: 2px;
}

.cart-item--problem {
  margin-inline: -8px;
  padding-inline: 10px;
  border-radius: 13px;
  background: #fff8f5;
}

.cart-item__info {
  min-width: 0;
}

.cart-item__category {
  display: block;
  margin-bottom: 4px;
  color: #a19589;
  font-size: 9.5px;
  font-weight: 650;
}

.cart-item__info h3 {
  margin: 0;
  color: #2a2420;
  font-size: 13px;
  line-height: 1.3;
}

.cart-item__prices {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
  font-size: 10px;
  color: #999087;
}

.cart-item__prices strong {
  color: #72511f;
  font-size: 11.5px;
}

.cart-item__old-price {
  text-decoration: line-through;
}

.cart-item__problem-text {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 7px 0 0;
  color: #aa5144;
  font-size: 9.5px;
  line-height: 1.35;
}

.cart-item__problem-text svg {
  flex: 0 0 auto;
}

.cart-item__quantity-wrap {
  text-align: center;
}

.cart-item__quantity-wrap > span,
.cart-item__subtotal span {
  display: block;
  margin-bottom: 6px;
  color: #a09890;
  font-size: 9px;
  font-weight: 650;
}

.cart-item__quantity {
  min-width: 104px;
  height: 36px;
  display: grid;
  grid-template-columns: 34px 36px 34px;
  align-items: center;
  border: 1px solid #e8e0d7;
  border-radius: 11px;
  background: #fff;
}

.cart-item__quantity button {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #715c46;
  cursor: pointer;
}

.cart-item__quantity button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.cart-item__quantity strong {
  color: #2d251f;
  font-size: 12px;
}

.cart-item__quantity-wrap small {
  display: block;
  margin-top: 5px;
  color: #9c948c;
  font-size: 8.5px;
}

.cart-item__subtotal {
  text-align: right;
}

.cart-item__subtotal strong {
  color: #2b241e;
  font-size: 13px;
}

.cart-item__remove {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: #faf7f3;
  color: #9c8375;
  cursor: pointer;
}

.cart-item__remove:hover:not(:disabled) {
  background: #fff0ea;
  color: #a24c3e;
}

.cart-summary {
  position: sticky;
  top: 24px;
  padding: 22px;
  border-radius: 20px;
}

.cart-summary__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid #eee7df;
}

.cart-summary__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: #fff4dc;
  color: #bd7a10;
}

.cart-summary__rows {
  display: grid;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid #eee7df;
}

.cart-summary__rows > div,
.cart-summary__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cart-summary__rows span {
  color: #81776e;
  font-size: 11px;
}

.cart-summary__rows strong {
  color: #37302a;
  font-size: 11px;
}

.cart-summary__total {
  padding: 18px 0;
}

.cart-summary__total span {
  color: #5e544b;
  font-size: 12px;
  font-weight: 750;
}

.cart-summary__total strong {
  color: #251e18;
  font-size: 21px;
  letter-spacing: -0.025em;
}

.cart-summary__notice,
.cart-summary__error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 13px;
  padding: 11px 12px;
  border-radius: 11px;
  font-size: 9.5px;
  line-height: 1.45;
}

.cart-summary__notice {
  background: #f6f2eb;
  color: #72665b;
}

.cart-summary__error {
  border: 1px solid #f1d4cc;
  background: #fff5f2;
  color: #9c4d40;
}

.cart-summary__notice svg,
.cart-summary__error svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.cart-summary__notice p {
  margin: 0;
}

.cart-summary__checkout {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, #dfa438, #f0b43b);
  color: #2b180c;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 9px 22px rgba(224, 168, 62, 0.22);
}

.cart-summary__checkout:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.cart-summary__footnote {
  margin: 10px 0 0;
  color: #a09992;
  font-size: 8.5px;
  line-height: 1.4;
  text-align: center;
}

.cart-page__empty,
.cart-page__success {
  min-height: 390px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  border-radius: 22px;
  text-align: center;
}

.cart-page__empty-icon,
.cart-page__success-icon {
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 20px;
  background: #fff3dc;
  color: #bd7a10;
}

.cart-page__success-icon {
  background: #edf7ec;
  color: #5d8b59;
}

.cart-page__empty h2,
.cart-page__success h2 {
  margin: 0;
  color: #29231e;
  font-size: 23px;
}

.cart-page__empty p,
.cart-page__success > p {
  max-width: 540px;
  margin: 9px 0 22px;
  color: #82786f;
  font-size: 12px;
  line-height: 1.55;
}

.cart-page__success-summary {
  width: min(100%, 430px);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.cart-page__success-summary > div {
  padding: 13px;
  border-radius: 12px;
  background: #f8f5f1;
}

.cart-page__success-summary span,
.cart-page__success-summary strong {
  display: block;
}

.cart-page__success-summary span {
  color: #928981;
  font-size: 9px;
}

.cart-page__success-summary strong {
  margin-top: 4px;
  color: #302923;
  font-size: 12px;
}

.cart-page__success-actions {
  display: flex;
  justify-content: center;
  gap: 9px;
  flex-wrap: wrap;
}

.cart-page__toast {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 120;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 12px;
  background: #2f1c11;
  color: #f8ebd9;
  box-shadow: 0 16px 40px rgba(35, 20, 11, 0.22);
  font-size: 11px;
  font-weight: 700;
}

.cart-toast-enter-active,
.cart-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.cart-toast-enter-from,
.cart-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 980px) {
  .cart-page__layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 680px) {
  .cart-page__header {
    align-items: flex-start;
    margin-bottom: 18px;
  }

  .cart-page__header h1 {
    font-size: 29px;
  }

  .cart-page__header p {
    max-width: 260px;
    font-size: 10.5px;
  }

  .cart-page__continue {
    width: 42px;
    min-height: 42px;
    padding: 0;
    font-size: 0;
  }

  .cart-page__items,
  .cart-summary {
    padding: 14px;
    border-radius: 17px;
  }

  .cart-page__section-head {
    align-items: flex-start;
  }

  .cart-page__clear {
    padding-inline: 3px;
    font-size: 0;
  }

  .cart-item {
    grid-template-columns: 58px minmax(0, 1fr) 30px;
    gap: 10px;
    padding: 15px 0;
  }

  .cart-item :deep(.catalog-product-image--compact) {
    width: 58px;
    height: 58px;
  }

  .cart-item__quantity-wrap {
    grid-column: 1 / 3;
    display: flex;
    align-items: center;
    gap: 9px;
    text-align: left;
  }

  .cart-item__quantity-wrap > span {
    margin: 0;
  }

  .cart-item__quantity-wrap small {
    margin: 0;
  }

  .cart-item__subtotal {
    grid-column: 3;
    grid-row: 2;
    align-self: center;
  }

  .cart-item__remove {
    grid-column: 3;
    grid-row: 1;
    align-self: start;
  }

  .cart-item__quantity {
    min-width: 96px;
    grid-template-columns: 31px 34px 31px;
  }

  .cart-page__success-summary {
    grid-template-columns: 1fr;
  }

  .cart-page__success-actions {
    width: 100%;
    flex-direction: column;
  }

  .cart-page__primary-link,
  .cart-page__secondary-link {
    width: 100%;
  }

  .cart-page__toast {
    left: 16px;
    right: 16px;
    bottom: 82px;
    justify-content: center;
  }
}
</style>
