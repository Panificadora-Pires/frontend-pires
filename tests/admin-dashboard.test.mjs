import test from 'node:test';
import assert from 'node:assert/strict';
import { diaEmSaoPaulo, serieRetiradas, metricasPedidos, normalizarRanking } from '../src/utils/adminDashboard.js';

test('dia administrativo usa São Paulo, não o dia UTC ou o fuso do navegador', () => {
  assert.equal(diaEmSaoPaulo('2026-11-19T01:30:00Z'), '2026-11-18');
  assert.equal(diaEmSaoPaulo('2026-11-19T03:30:00Z'), '2026-11-19');
  assert.equal(diaEmSaoPaulo(null), null);
  assert.equal(diaEmSaoPaulo(undefined), null);
  assert.equal(diaEmSaoPaulo('inválida'), null);
});
test('receita considera somente retirados pela data de retirada e soma centavos', () => {
  const items = [
    {status:'retirado',data:'2026-11-01T12:00:00Z',status_atualizado_em:'2026-11-19T01:30:00Z',total:'0.10'},
    {status:'retirado',status_atualizado_em:'2026-11-18T13:00:00Z',total:'0.20'},
    {status:'cancelado',status_atualizado_em:'2026-11-18T13:00:00Z',total:'100'},
    {status:'pronto',status_atualizado_em:'2026-11-18T13:00:00Z',total:'100'},
    {status:'retirado',data:'2026-11-18T12:00:00Z',total:'100'},
  ];
  const points=serieRetiradas(items,'2026-11-18');
  assert.equal(points.length,7);assert.equal(points.at(-1).value,.3);assert.equal(points.at(-1).dia,'2026-11-18');
  assert.equal(points[0].dia,'2026-11-12');
});
test('contagem de hoje usa criação; fila não exclui pedidos do dia anterior', () => {
  const m=metricasPedidos([{status:'pronto',data:'2026-11-18T12:00:00Z'}, {status:'confirmado',data:'2026-11-19T01:00:00Z'}, {status:'pendente',data:'2026-11-17T12:00:00Z',status_pagamento:'processando'}],'2026-11-18');
  assert.deepEqual(m,{pedidosHoje:2,pendentes:1,confirmados:1,prontos:1,pagamentosPendentes:1});
});
test('ranking usa resultado da API e associa foto sem inventar receita', () => {
  const list=normalizarRanking({criterio:'retirados',resultado:[{produto_id:7,produto_nome:'Coxinha',quantidade_vendida:26}]},[{id:7,nome:'Coxinha',imagem:'/media/coxinha.webp',preco:'99.00'}]);
  assert.equal(list[0].quantidade_vendida,26);assert.equal(list[0].produto.imagem,'/media/coxinha.webp');
  assert.equal('receita' in list[0],false);
  const missing=normalizarRanking({resultado:[{produto_id:8,produto_nome:'Produto antigo',quantidade_vendida:2}]},[]);
  assert.equal(missing[0].produto.nome,'Produto antigo');assert.equal(missing[0].produto.imagem,null);
  assert.throws(()=>normalizarRanking({resultado:null},[]),/ranking/i);
  assert.throws(()=>normalizarRanking({resultado:[{produto_id:8,quantidade_vendida:null}]},[]),/ranking/i);
});

test('pagamentos pendentes ignoram pedidos cancelados e preservam pedidos ativos', () => {
  const pedidos = [
    { status: 'cancelado', forma_pagamento: 'dinheiro', status_pagamento: 'pendente' },
    { status: 'cancelado', forma_pagamento: 'pix', status_pagamento: 'processando' },
    { status: 'pendente', forma_pagamento: 'pix', status_pagamento: 'processando' },
    { status: 'confirmado', forma_pagamento: 'dinheiro', status_pagamento: 'pendente' },
    { status: 'pronto', forma_pagamento: 'dinheiro', status_pagamento: 'pendente' },
    { status: 'retirado', forma_pagamento: 'dinheiro', status_pagamento: 'aprovado' },
  ];
  assert.equal(metricasPedidos(pedidos, '2026-11-18').pagamentosPendentes, 3);
});

test('ranking pode exibir imagem da API sem requisitar todos os produtos', () => {
 const ranking=normalizarRanking({resultado:[
   {produto_id:10,produto_nome:'Brioche',produto_imagem:'https://cdn.example.org/brioche.jpg',quantidade_vendida:12},
 ]},[]);
 assert.equal(ranking[0].produto.imagem,'https://cdn.example.org/brioche.jpg');
 assert.equal(ranking[0].produto.nome,'Brioche');
});
