import api from './api'

function itensDoCarrinho(cart) {
  return cart.itens.map((item) => ({
    produto: item.produto.id,
    quantidade: item.quantidade,
  }))
}

async function checkoutDinheiro({ checkoutId, cart }) {
  return api.post('/pedidos/checkout_dinheiro/', {
    checkout_id: checkoutId,
    itens_criacao: itensDoCarrinho(cart),
  })
}

async function checkoutMercadoPago({ checkoutId, cart, paymentType, formData }) {
  return api.post('/pedidos/checkout_mercado_pago/', {
    checkout_id: checkoutId,
    itens_criacao: itensDoCarrinho(cart),
    payment_type: paymentType,
    form_data: formData,
  })
}

async function consultar(pedidoId) {
  return api.get(`/pedidos/${pedidoId}/pagamento/`)
}

export default {
  checkoutDinheiro,
  checkoutMercadoPago,
  consultar,
}
