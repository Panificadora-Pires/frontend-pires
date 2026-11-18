import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import api from './fixtures/admin-api.mjs';
const hooks=registerHooks({resolve(specifier,context,next){if(specifier==='./api'&&context.parentURL?.endsWith('/src/services/admin.service.js'))return {url:new URL('./fixtures/admin-api.mjs',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
const {default:service}=await import('../src/services/admin.service.js');
after(()=>hooks.deregister());
test('coleção completa concatena páginas e mantém parâmetros',async()=>{
  const calls=[];api.get=async(path,config)=>{calls.push({path,...config.params});return {data:{next:config.params.page===1?'page2':null,results:[{id:config.params.page}]}};};
  assert.deepEqual(await service.listarProdutos({ativo:true}),[{id:1},{id:2}]);assert.equal(calls[1].ativo,true);assert.equal(calls[1].page_size,100);
});
test('página 30 com next rejeita coleção parcial em vez de declarar sucesso',async()=>{
  let calls=0;api.get=async()=>{calls++;return {data:{count:3100,next:'mais',results:[{id:calls}]}};};
  await assert.rejects(service.listarPedidos(),{code:'ADMIN_COLLECTION_INCOMPLETE'});assert.equal(calls,30);
});
test('página vazia com next não transforma falha de cobertura em vazio real',async()=>{
  api.get=async()=>({data:{next:'mais',results:[]}});
  await assert.rejects(service.listarPedidos(),{code:'ADMIN_COLLECTION_INCOMPLETE'});
});
test('coleção não paginada continua compatível',async()=>{api.get=async()=>({data:[{id:7}]});assert.deepEqual(await service.listarCategorias(),[{id:7}]);});

test('listagem paginada envia filtros para API e preserva metadata da página',async()=>{
  const calls=[];
  const resposta={count:301,next:'http://test/api/pedidos/?page=2',previous:null,page:1,page_size:30,total_pages:11,results:[{id:5}]};
  api.get=async(path,config)=>{calls.push({path,config});return {data:resposta};};
  const data=await service.listarPedidosPagina({page:1,page_size:30,status:'pendente',pagamento:'processando',busca:'Jaque'});
  assert.deepEqual(data,resposta);
  assert.deepEqual(calls,[{path:'/pedidos/',config:{params:{page:1,page_size:30,status:'pendente',pagamento:'processando',busca:'Jaque'}}}]);
});
test('listagem paginada valida tamanho e não aceita resposta sem metadata',async()=>{
  let calls=0;api.get=async()=>{calls++;return {data:{results:[{id:3}]}};};
  await assert.rejects(service.listarPedidosPagina({page:0}),{code:'ADMIN_PAGE_INVALID'});
  await assert.rejects(service.listarPedidosPagina({page_size:101}),{code:'ADMIN_PAGE_INVALID'});
  assert.equal(calls,0);
  await assert.rejects(service.listarPedidosPagina(),{code:'ADMIN_PAGE_INVALID'});
});
test('resumo administrativo utiliza endpoint próprio e valida contagens',async()=>{
  const resumo={data_referencia:'2026-11-18',total:3001,pedidos_hoje:12,pendentes:3,confirmados:5,prontos:2,retirados:2981,cancelados:10,pagamentos_pendentes:4};
  const paths=[];api.get=async path=>{paths.push(path);return {data:resumo};};
  assert.deepEqual(await service.resumoPedidosAdmin(),resumo);
  assert.deepEqual(paths,['/pedidos/resumo_admin/']);
  api.get=async()=>({data:{...resumo,pendentes:null}});
  await assert.rejects(service.resumoPedidosAdmin(),{code:'ADMIN_SUMMARY_INVALID'});
});
