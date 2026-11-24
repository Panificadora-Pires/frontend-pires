import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createPinia, setActivePinia } from 'pinia';
import service, {session, relatorioSemanaVazio} from './fixtures/admin-dashboard.service.mjs';
const hook=registerHooks({resolve(specifier,context,next){
  if(specifier==='@/services/admin.service'||specifier==='@/services/api')return {url:new URL('./fixtures/admin-dashboard.service.mjs',import.meta.url).href,shortCircuit:true};
  if(specifier==='@/utils/adminDashboard')return {url:new URL('../src/utils/adminDashboard.js',import.meta.url).href,shortCircuit:true};
  if(specifier==='@/utils/adminRelatorios')return {url:new URL('../src/utils/adminRelatorios.js',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
const {useAdminDashboardStore}=await import('../src/stores/adminDashboard.js');
after(()=>hook.deregister());
const now=new Date('2026-11-19T01:30:00Z');
function reset(){
  setActivePinia(createPinia());session.versao=0;
  service.resumoProdutosAdmin=async()=>({total:0,ativos:0,sem_estoque:0,reposicao:0,em_promocao:0});
  service.resumoPromocoesAdmin=async()=>({total:0,ativas:0});
  service.maisVendidos=async()=>({resultado:[]});
  service.relatorioVendas=async()=>({total_vendido:'0.00',total_pedidos:0});
  service.listarPedidosPagina=async()=>({count:0,page:1,page_size:4,total_pages:1,next:null,previous:null,results:[]});
  service.relatorioAnaliticoAdmin=async p=>relatorioSemanaVazio(p);
  return useAdminDashboardStore();
}
function defer(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('primeira carga difere de vazio; consulta agrega data São Paulo e ranking real',async()=>{
 const s=reset();assert.equal(s.inicializado,false);assert.equal(s.relatorioHoje,null);let params;
 service.relatorioVendas=async p=>(params=p,{total_vendido:'520.00',total_pedidos:52});
 service.resumoProdutosAdmin=async()=>({total:15,ativos:12,sem_estoque:1,reposicao:2,em_promocao:3});
 service.resumoPromocoesAdmin=async()=>({total:8,ativas:5});
 service.maisVendidos=async()=>({resultado:[{produto_id:1,produto_nome:'Coxinha',produto_imagem:'/coxinha.webp',quantidade_vendida:26}]});
 await s.carregar({agora:now});assert.equal(s.inicializado,true);assert.equal(s.dia,'2026-11-18');assert.deepEqual(params,{dataInicio:'2026-11-18',dataFim:'2026-11-18'});assert.equal(s.ranking[0].produto.imagem,'/coxinha.webp');assert.equal(s.resumoProdutos.ativos,12);assert.equal(s.resumoPromocoes.ativas,5);
});
test('falha inicial não vira vazio e refresh falho preserva último sucesso',async()=>{
 const s=reset();service.maisVendidos=async()=>{throw Error('Falha sintética');};await assert.rejects(s.carregar({agora:now}));assert.equal(s.inicializado,false);assert.ok(s.erro);
 service.maisVendidos=async()=>({resultado:[]});await s.carregar({agora:now});assert.equal(s.inicializado,true);assert.deepEqual(s.ranking,[]);
 const report=s.relatorioHoje;service.relatorioVendas=async()=>{throw Error('Falha atualização');};await assert.rejects(s.carregar({agora:now}));assert.equal(s.relatorioHoje,report);assert.equal(s.inicializado,true);
});
test('consumidores simultâneos compartilham carga, sem compartilhar entre instâncias',async()=>{
 const s=reset(),d=defer();let calls=0;service.relatorioVendas=()=>{calls++;return d.promise;};const p1=s.carregar({agora:now}),p2=s.carregar({agora:now});assert.equal(calls,1);setActivePinia(createPinia());const other=useAdminDashboardStore().carregar({agora:now});assert.equal(calls,2);d.resolve({total_vendido:'1.00',total_pedidos:1});await Promise.all([p1,p2,other]);
});
test('reset permite nova carga e resposta antiga não modifica dados nem flags atuais',async()=>{
 const s=reset(),old=defer(),fresh=defer();service.relatorioVendas=()=>old.promise;const p1=s.carregar({agora:now});s.resetar();service.relatorioVendas=()=>fresh.promise;const p2=s.carregar({agora:now});old.resolve({total_vendido:'999.00'});await p1;assert.equal(s.carregando,true);assert.equal(s.relatorioHoje,null);fresh.resolve({total_vendido:'2.00',total_pedidos:1});await p2;assert.equal(s.relatorioHoje.total_vendido,'2.00');assert.equal(s.carregando,false);
});
test('troca de sessão durante carga descarta até resposta de serviço que não use interceptor',async()=>{
 const s=reset(),d=defer();service.relatorioVendas=()=>d.promise;const pending=s.carregar({agora:now});session.versao++;d.resolve({total_vendido:'999.00'});await pending;assert.equal(s.relatorioHoje,null);assert.equal(s.inicializado,false);
});
test('agregado ausente ou nulo não anuncia zero de vendas',async()=>{
 for(const report of [{total_vendido:null,total_pedidos:0},{total_vendido:'0.00',total_pedidos:null},{total_pedidos:0}]){const s=reset();service.relatorioVendas=async()=>report;await assert.rejects(s.carregar({agora:now}),/faturamento/i);assert.equal(s.relatorioHoje,null);assert.equal(s.inicializado,false);}
});

test('Dashboard consulta apenas quatro pedidos recentes mesmo com 3.001 pedidos no banco', async () => {
 const s = reset();
 let paginas = 0, parametrosSemana;
 service.listarPedidosPagina = async params => {
   paginas++;
   assert.deepEqual(params, {page:1,page_size:4});
   return {count:3001,page:1,page_size:4,total_pages:751,next:'/api/pedidos/?page=2',previous:null,
     results:[{id:3001},{id:3000},{id:2999},{id:2998}]};
 };
 service.relatorioAnaliticoAdmin = async periodo => {
   parametrosSemana = periodo;
   const relatorio = relatorioSemanaVazio(periodo);
   relatorio.serie_diaria[6] = {...relatorio.serie_diaria[6],
     total_vendido:'35.40',total_pedidos:2,itens_vendidos:4,ticket_medio:'17.70'};
   relatorio.resumo = {total_vendido:'35.40',total_pedidos:2,itens_vendidos:4,ticket_medio:'17.70'};
   relatorio.formas_pagamento[0] = {...relatorio.formas_pagamento[0],
     total_vendido:'35.40',total_pedidos:2,percentual_pedidos:'100.0'};
   return relatorio;
 };
 await s.carregar({agora:now});
 assert.equal(paginas,1);
 assert.equal(s.pedidosRecentes.length,4);
 assert.deepEqual(s.pedidosRecentes.map(p=>p.id),[3001,3000,2999,2998]);
 assert.deepEqual(parametrosSemana,{dataInicio:'2026-11-12',dataFim:'2026-11-18'});
 assert.equal(s.relatorioSemana.resumo.total_vendido,'35.40');
 assert.equal(s.relatorioSemana.serie_diaria.length,7);
});
test('Falha nos agregados semanais não transforma série financeira incompleta em zero', async () => {
 const s = reset();
 await s.carregar({agora:now});
 const semanaValida = s.relatorioSemana;
 service.relatorioAnaliticoAdmin = async periodo => ({...relatorioSemanaVazio(periodo), serie_diaria:[]});
 await assert.rejects(s.carregar({agora:now}),/relatório|série/i);
 assert.equal(s.relatorioSemana,semanaValida);
 assert.equal(s.inicializado,true);
 assert.ok(s.erro);
});

test('Dashboard rejeita totais ausentes de promoções e preserva o snapshot anterior', async () => {
 const s=reset();
 await s.carregar({agora:now});
 const snapshot=s.resumoPromocoes;
 service.resumoPromocoesAdmin=async()=>{throw new Error('Resumo indisponível');};
 await assert.rejects(s.carregar({agora:now}),/indisponível/);
 assert.equal(s.resumoPromocoes,snapshot);
 assert.equal(s.inicializado,true);
});
