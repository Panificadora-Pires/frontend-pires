import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import api from './fixtures/admin-api.mjs';
const hooks=registerHooks({resolve(specifier,context,next){if(specifier==='./api'&&context.parentURL?.endsWith('/src/services/admin.service.js'))return {url:new URL('./fixtures/admin-api.mjs',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
const {default:service}=await import('../src/services/admin.service.js');
after(()=>hooks.deregister());
test('coleção completa concatena páginas e mantém parâmetros',async()=>{
  const calls=[];api.get=async(path,config)=>{calls.push({path,...config.params});return {data:{next:config.params.page===1?'page2':null,results:[{id:config.params.page}]}};};
  assert.deepEqual(await service.listarCategorias({ativa:true}),[{id:1},{id:2}]);assert.equal(calls[1].ativa,true);assert.equal(calls[1].page_size,100);
});
test('página 30 com next rejeita coleção parcial em vez de declarar sucesso',async()=>{
  let calls=0;api.get=async()=>{calls++;return {data:{count:3100,next:'mais',results:[{id:calls}]}};};
  await assert.rejects(service.listarCategorias(),{code:'ADMIN_COLLECTION_INCOMPLETE'});assert.equal(calls,30);
});
test('página vazia com next não transforma falha de cobertura em vazio real',async()=>{
  api.get=async()=>({data:{next:'mais',results:[]}});
  await assert.rejects(service.listarCategorias(),{code:'ADMIN_COLLECTION_INCOMPLETE'});
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

test('catálogo administrativo consulta uma única página com filtros',async()=>{
  const calls=[];
  const pagina={count:205,page:2,page_size:18,total_pages:12,next:'next',previous:'prev',results:[{id:22,estoque:2}]};
  api.get=async(path,config)=>{calls.push({path,params:config?.params});return {data:pagina};};
  assert.deepEqual(await service.listarProdutosAdminPagina({page:2,page_size:18,busca:'Coxinha',categoria:4,situacao:'reposicao'}),pagina);
  assert.deepEqual(calls,[{path:'/produtos/admin_catalogo/',params:{page:2,page_size:18,busca:'Coxinha',categoria:4,situacao:'reposicao'}}]);
});
test('catálogo administrativo rejeita parâmetros inválidos e não apresenta dados parciais como completos',async()=>{
  let calls=0;
  api.get=async()=>{calls++;return {data:{results:[{id:1}],count:1}};};
  await assert.rejects(service.listarProdutosAdminPagina({page:0}),{code:'ADMIN_CATALOG_PAGE_INVALID'});
  await assert.rejects(service.listarProdutosAdminPagina({page_size:101}),{code:'ADMIN_CATALOG_PAGE_INVALID'});
  assert.equal(calls,0);
  await assert.rejects(service.listarProdutosAdminPagina(),{code:'ADMIN_CATALOG_PAGE_INVALID'});
});
test('indicadores globais do catálogo exigem valores inteiros e não aceitam falsos zeros',async()=>{
  const indicadores={total:3100,ativos:3000,sem_estoque:5,reposicao:15,em_promocao:4};
  api.get=async path=>{assert.equal(path,'/produtos/resumo_admin/');return {data:indicadores};};
  assert.deepEqual(await service.resumoProdutosAdmin(),indicadores);
  api.get=async()=>({data:{...indicadores,reposicao:null}});
  await assert.rejects(service.resumoProdutosAdmin(),{code:'ADMIN_CATALOG_SUMMARY_INVALID'});
});

test('detalhe interno do produto usa rota restrita da API administrativa',async()=>{
  const calls=[];
  const produto={id:11,nome:'Brioche',preco_custo:'3.10',estoque:5,estoque_minimo:2};
  api.get=async path=>{calls.push(path);return {data:produto};};
  assert.deepEqual(await service.obterProdutoAdmin(11),produto);
  assert.deepEqual(calls,['/produtos/11/admin_detalhe/']);
});

test('resumo de promoções usa agregado administrativo e não aceita contagens parciais', async () => {
 const paths=[];
 api.get=async path=>{paths.push(path);return {data:{total:3100,ativas:7}};};
 const dados=await service.resumoPromocoesAdmin();
 assert.deepEqual(dados,{total:3100,ativas:7});
 assert.deepEqual(paths,['/promocoes/resumo_admin/']);
 api.get=async()=>({data:{total:100,ativas:101}});
 await assert.rejects(service.resumoPromocoesAdmin(),{code:'ADMIN_PROMOTIONS_SUMMARY_INVALID'});
 api.get=async()=>({data:{total:100}});
 await assert.rejects(service.resumoPromocoesAdmin(),{code:'ADMIN_PROMOTIONS_SUMMARY_INVALID'});
});

test('promoções administrativas filtram e paginam uma única requisição', async () => {
  const calls = [];
  const pagina = {
    count: 3001, page: 2, page_size: 12, total_pages: 251,
    next: '?page=3', previous: '?page=1',
    results: [{ id: 32, produto_nome: 'Coxinha' }],
  };
  api.get = async (path, config) => {
    calls.push({ path, params: config.params });
    return { data: pagina };
  };
  const resultado = await service.listarPromocoesAdminPagina({
    page: 2, page_size: 12, busca: ' Coxinha ', situacao: 'ativa',
  });
  assert.deepEqual(resultado, pagina);
  assert.deepEqual(calls, [{
    path: '/promocoes/admin_listagem/',
    params: { page: 2, page_size: 12, busca: 'Coxinha', situacao: 'ativa' },
  }]);
});
test('promoções não transformam página incompleta em lista válida', async () => {
  let calls = 0;
  api.get = async () => {
    calls++;
    return { data: { count: 3001, page: 1, results: [{ id: 1 }] } };
  };
  await assert.rejects(service.listarPromocoesAdminPagina({ page: 0 }), {
    code: 'ADMIN_PROMOTIONS_PAGE_INVALID',
  });
  await assert.rejects(service.listarPromocoesAdminPagina({ page_size: 101 }), {
    code: 'ADMIN_PROMOTIONS_PAGE_INVALID',
  });
  await assert.rejects(service.listarPromocoesAdminPagina({ situacao: 'cancelada' }), {
    code: 'ADMIN_PROMOTIONS_PAGE_INVALID',
  });
  assert.equal(calls, 0);
  await assert.rejects(service.listarPromocoesAdminPagina(), {
    code: 'ADMIN_PROMOTIONS_PAGE_INVALID',
  });
});
test('contadores de promoções são globais e devem totalizar todas as situações', async () => {
  let chamada;
  api.get = async path => {
    chamada = path;
    return { data: { total: 3001, ativas: 5, agendadas: 12, encerradas: 2984 } };
  };
  const resumo = await service.resumoPromocoesGestao();
  assert.equal(chamada, '/promocoes/resumo_admin/');
  assert.equal(resumo.total, 3001);
  api.get = async () => ({ data: { total: 3001, ativas: 5, agendadas: 12, encerradas: 100 } });
  await assert.rejects(service.resumoPromocoesGestao(), {
    code: 'ADMIN_PROMOTIONS_SUMMARY_INVALID',
  });
});

test('categorias administrativas carregam somente a página solicitada, com filtros', async () => {
  const chamadas=[];
  const resposta={
    count:3001,page:2,page_size:18,total_pages:167,next:'?page=3',
    previous:'?page=1',results:[{id:19,nome:'Bebidas'}],
  };
  api.get=async(path,config)=>{
    chamadas.push({path,params:config.params});
    return {data:resposta};
  };
  const pagina=await service.listarCategoriasAdminPagina({
    page:2,page_size:18,busca:' cafés ',situacao:'ativa',
  });
  assert.deepEqual(pagina,resposta);
  assert.deepEqual(chamadas,[{
    path:'/categorias/admin_listagem/',
    params:{page:2,page_size:18,busca:'cafés',situacao:'ativa'},
  }]);
});
test('categorias paginadas rejeitam filtros inválidos e resposta parcial', async () => {
  let chamadas=0;
  api.get=async()=>{chamadas++;return {data:{count:3001,results:[]}};};
  await assert.rejects(service.listarCategoriasAdminPagina({page:0}),{code:'ADMIN_CATEGORIES_PAGE_INVALID'});
  await assert.rejects(service.listarCategoriasAdminPagina({page_size:101}),{code:'ADMIN_CATEGORIES_PAGE_INVALID'});
  await assert.rejects(service.listarCategoriasAdminPagina({situacao:'desconhecida'}),{code:'ADMIN_CATEGORIES_PAGE_INVALID'});
  assert.equal(chamadas,0);
  await assert.rejects(service.listarCategoriasAdminPagina(),{code:'ADMIN_CATEGORIES_PAGE_INVALID'});
});
test('indicadores globais de categorias não aceitam valores parciais', async () => {
  let rota;
  api.get=async path=>{rota=path;return {data:{total:3001,ativas:2000,inativas:1001}};};
  assert.deepEqual(await service.resumoCategoriasAdmin(),{total:3001,ativas:2000,inativas:1001});
  assert.equal(rota,'/categorias/resumo_admin/');
  api.get=async()=>({data:{total:3001,ativas:2000,inativas:4}});
  await assert.rejects(service.resumoCategoriasAdmin(),{code:'ADMIN_CATEGORIES_SUMMARY_INVALID'});
});
