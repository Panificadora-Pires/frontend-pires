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
