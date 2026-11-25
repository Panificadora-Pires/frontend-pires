import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ADMIN_BASE||'http://127.0.0.1:5189';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));
const out=new URL('../docs/prints/admin-pr1/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={checks:[],errors:[],requests:[],console:[]};
const selectedCheck=process.env.ADMIN_CHECK;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function day(offset){const d=new Date(today+'T12:00:00-03:00');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
const totals=[20,30,10,40,50,20,130];
const orders=totals.map((total,i)=>({id:i+1,usuario:2,usuario_nome:'Cliente fictício '+(i+1),data:day(i-6)+'T12:00:00-03:00',status_atualizado_em:day(i-6)+'T12:30:00-03:00',status:'retirado',status_display:'Retirado',total:String(total),forma_pagamento:'pix',forma_pagamento_display:'Pix',status_pagamento:'aprovado',status_pagamento_display:'Aprovado',itens:[{id:i+1,produto:1,produto_nome:'Coxinha de frango',quantidade:total/5,preco_unitario:'5.00',subtotal:String(total)}]}));
for(const [i,status] of ['pendente','confirmado','pronto'].entries())orders.push({id:20+i,usuario:2,usuario_nome:'Pessoa fictícia '+i,data:today+`T12:${58-i}:00-03:00`,status_atualizado_em:today+`T12:${58-i}:00-03:00`,status,status_display:{pendente:'Pendente',confirmado:'Em preparo',pronto:'Pronto'}[status],total:'10.00',forma_pagamento:'dinheiro',forma_pagamento_display:'Dinheiro',status_pagamento:'pendente',status_pagamento_display:'Pendente',itens:[{id:30+i,produto:1,produto_nome:'Coxinha de frango',quantidade:2,preco_unitario:'5.00',subtotal:'10.00'}]});
const products=[{id:1,nome:'Coxinha de frango',codigo:'P001',categoria:1,categoria_nome:'Salgados',preco:'5.00',preco_atual:'5.00',unidade_medida:'unidade',imagem:base+'/src/assets/images/categories/salgados.webp'},{id:2,nome:'Brigadeiro',codigo:'P002',categoria:1,categoria_nome:'Doces',preco:'3.00',preco_atual:'3.00',imagem:base+'/src/assets/images/categories/doces.webp'}];
async function fixture({width=1440,height=960,mode='normal',staff=true,anonymous=false}={}){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});context.setDefaultTimeout(6000);
  const state={mode,staff,hold:null};
  if(!anonymous)await context.addInitScript(()=>{localStorage.setItem('pp_access_token','fixture.eyJ1c2VyX2lkIjoxfQ.fixture');localStorage.setItem('pp_refresh_token','fixture.eyJ1c2VyX2lkIjoxfQ.fixture');});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===base&&!url.pathname.startsWith('/api/'))return route.continue();
    if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
    if(url.hostname==='accounts.google.com')return route.fulfill({contentType:'application/javascript',body:''});
    if(!url.pathname.startsWith('/api/'))return route.abort();
    const path=url.pathname.slice(4);results.requests.push({path,method:req.method(),mode:state.mode});
    if(req.method()!=='GET')return route.fulfill({status:403,json:{detail:'Fixture de auditoria, sem mutação.'}});
    if(path==='/usuarios/me/')return route.fulfill({json:{id:1,name:'Admin fictício',email:'admin@example.test',is_staff:state.staff}});
    if(state.hold&&path===state.hold.path){state.hold.started();await state.hold.wait;}
    if(state.mode==='error'&&!path.startsWith('/chat/'))return route.fulfill({status:500,json:{detail:'Falha sintética.'}});
    const collection=list=>({count:list.length,next:null,results:list});let json=collection([]);
    if(path==='/pedidos/')json=state.mode==='partial'?{count:3100,next:'mais',results:[{...orders[0],id:Number(url.searchParams.get('page'))}]}:collection(state.mode==='empty'?[]:orders);
    else if(path==='/produtos/')json=collection(state.mode==='empty'?[]:products);
    else if(path==='/produtos/mais_vendidos/')json={criterio:'Somente retirados',resultado:state.mode==='empty'?[]:[{produto_id:1,produto_nome:'Coxinha de frango',produto_codigo:'P001',quantidade_vendida:10},{produto_id:2,produto_nome:'Brigadeiro',produto_codigo:'P002',quantidade_vendida:5}]};
    else if(path==='/pedidos/relatorio_vendas/')json={criterio:'Somente retirados',total_pedidos:state.mode==='empty'?0:1,total_vendido:state.mode==='empty'?'0.00':'130.00',ticket_medio:'130.00'};
    else if(/^\/pedidos\/\d+\/$/.test(path))json=orders.find(p=>p.id===Number(path.split('/')[2]))||orders[0];
    return route.fulfill({json});
  });
  const page=await context.newPage();page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))results.console.push({mode:state.mode,type:m.type(),text:m.text()});});
  return {context,page,state};
}
async function check(name,fn){if(selectedCheck&&!name.includes(selectedCheck))return;try{const detail=await fn();results.checks.push({name,ok:true,detail});console.log('PASS '+name);}catch(e){results.checks.push({name,ok:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
async function ready(page){await page.goto(base+'/admin');await page.locator('h1').waitFor();await page.waitForFunction(()=>document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminOrders')?.inicializado);await page.waitForTimeout(200);await page.evaluate(()=>document.fonts.ready);}
try{
  for(const width of [1440,390])await check(`Dashboard real ${width}px, dados e imagens da API`,async()=>{
    const {context,page}=await fixture({width,height:width===1440?960:844});try{await ready(page);await page.getByText('Coxinha de frango',{exact:true}).first().waitFor();
      const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,sidebar:document.querySelector('.admin-sidebar').getBoundingClientRect().width}));assert.equal(metrics.width,width);assert.ok(metrics.documentWidth<=width);if(width===1440)assert.equal(metrics.sidebar,232);
      assert.match(await page.locator('main').innerText(),/130,00/);assert.match(await page.locator('main').innerText(),/estoque/i);
      const ranking=page.getByRole('heading',{name:'Mais vendidos',exact:true}).locator('xpath=ancestor::section[1]');assert.equal(await ranking.locator('img').count(),2);await ranking.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.doesNotMatch(await page.locator('main').innerText(),/Mínimo sugerido/);await page.screenshot({path:fileURLToPath(new URL(`dashboard-${width}.png`,out)),fullPage:true});return metrics;
    }finally{await context.close();}
  });
  await check('Gaveta protege foco, fecha por Escape e devolve ao gatilho',async()=>{
    const {context,page}=await fixture({width:390,height:844});try{await ready(page);const trigger=page.getByRole('button',{name:'Abrir menu',exact:true});await trigger.click();assert.ok(await page.locator('dialog[open]').count());await page.keyboard.press('Tab');assert.ok(await page.locator('dialog[open]').evaluate(e=>e.contains(document.activeElement)));await page.screenshot({path:fileURLToPath(new URL('menu-390.png',out))});await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.ok(await trigger.evaluate(e=>e===document.activeElement));}finally{await context.close();}
  });
  await check('Gaveta fecha ao navegar e ao mudar para desktop, sem scroll lock residual',async()=>{
    const {context,page}=await fixture({width:390,height:844});try{await ready(page);await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.locator('dialog[open]').getByRole('link',{name:/Pedidos/}).click();await page.waitForURL('**/admin/pedidos');assert.equal(await page.locator('dialog[open]').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.setViewportSize({width:1440,height:600});assert.equal(await page.locator('dialog[open]').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');assert.equal(await page.locator('.admin-sidebar').evaluate(e=>e.getBoundingClientRect().width),232);}finally{await context.close();}
  });
  await check('Rotas existentes permanecem acessíveis e contexto de Pedidos ativo',async()=>{
    const {context,page}=await fixture();try{await ready(page);await page.goto(base+'/admin/pedidos/20');await page.getByRole('heading',{name:/Pedido #20/}).waitFor();const link=page.locator('.admin-sidebar').getByRole('link',{name:/Pedidos/});assert.ok(await link.evaluate(e=>e.classList.contains('is-active')||e.classList.contains('active')));}finally{await context.close();}
  });
  await check('Vazio real não inventa ranking ou alertas de estoque',async()=>{
    const {context,page}=await fixture({mode:'empty',width:390,height:844});try{await ready(page);assert.equal(await page.getByText('Coxinha de frango',{exact:true}).count(),0);await page.screenshot({path:fileURLToPath(new URL('empty-390.png',out)),fullPage:true});}finally{await context.close();}
  });
  await check('Erro inicial encerra aria-busy e mantém valores desconhecidos',async()=>{
    const {context,page}=await fixture({mode:'error',width:390,height:844});try{await page.goto(base+'/admin');await page.waitForFunction(()=>{const s=document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s;return s?.get('adminDashboard')?.erro&&!s.get('adminDashboard').carregando&&!s.get('adminOrders').carregando;});assert.equal(await page.locator('.pp-admin-metric[aria-busy="true"]').count(),0);assert.ok((await page.locator('.pp-admin-metric strong').allTextContents()).every(value=>value==='—'));await page.screenshot({path:fileURLToPath(new URL('error-390.png',out)),fullPage:true});}finally{await context.close();}
  });
  await check('Falha silenciosa preserva último faturamento e sinaliza desatualização',async()=>{
    const {context,page,state}=await fixture();try{await ready(page);await page.getByText('Coxinha de frango',{exact:true}).first().waitFor();state.mode='error';await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminDashboard')?.erro);const store=await page.evaluate(()=>{const s=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminDashboard');return {total:s.relatorioHoje.total_vendido,initialized:s.inicializado,error:s.erro};});assert.equal(store.total,'130.00');assert.equal(store.initialized,true);assert.ok(store.error);return store;}finally{await context.close();}
  });
  await check('Carga inicial lenta não apresenta zero ou ranking vazio como resposta',async()=>{
    const {context,page,state}=await fixture({width:390,height:844});let release;try{state.hold={path:'/pedidos/relatorio_vendas/',started(){},wait:new Promise(r=>{release=r;})};await page.goto(base+'/admin');await page.locator('h1').waitFor();const initialized=await page.evaluate(()=>document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminDashboard')?.inicializado);assert.equal(initialized,false);await page.screenshot({path:fileURLToPath(new URL('loading-390.png',out)),fullPage:true});release();}finally{release?.();await context.close();}
  });
  await check('Polling central continua ativo sem nova instância no Dashboard',async()=>{
    const {context,page}=await fixture();try{await page.clock.install();await ready(page);const start=results.requests.filter(r=>r.path==='/pedidos/').length;const next=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/pedidos/');await page.clock.fastForward(20000);await next;const after=results.requests.filter(r=>r.path==='/pedidos/').length;assert.ok(after>start);return {requestsBefore:start,requestsAfter:after};}finally{await context.close();}
  });
  await check('Movimento reduzido e reflow em 1280/768/320',async()=>{
    const {context,page}=await fixture();try{await page.emulateMedia({reducedMotion:'reduce'});const views=[];for(const width of [1280,768,320]){await page.setViewportSize({width,height:800});await ready(page);const v=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));assert.ok(v.width>=v.scrollWidth);assert.ok(v.reduced);views.push(v);}return views;}finally{await context.close();}
  });
  await check('Coleção parcial não inicializa contagens como completas',async()=>{
    const {context,page}=await fixture({mode:'partial'});try{await page.goto(base+'/admin');await page.waitForFunction(()=>document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminOrders')?.erro);const s=await page.evaluate(()=>{const s=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('adminOrders');return {initialized:s.inicializado,count:s.itens.length};});assert.deepEqual(s,{initialized:false,count:0});return s;}finally{await context.close();}
  });
  await check('Guard mantém aluno e anônimo fora do Admin',async()=>{
    for(const options of [{staff:false},{anonymous:true}]){const {context,page}=await fixture(options);try{await page.goto(base+'/admin');await page.waitForURL(url=>options.anonymous?url.pathname==='/login'&&url.searchParams.get('redirect')==='/admin':url.pathname==='/');assert.equal(await page.locator('.admin-layout').count(),0);}finally{await context.close();}}
  });
  await check('Logout limpa sessão e retorna ao login',async()=>{
    const {context,page}=await fixture();try{await ready(page);await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await page.waitForURL('**/login');assert.equal(await page.locator('.admin-layout').count(),0);}finally{await context.close();}
  });
}finally{await writeFile(new URL(selectedCheck?'browser-focused.json':'browser-results.json',out),JSON.stringify(results,null,2));await browser.close();}
if(results.checks.some(c=>!c.ok))process.exitCode=1;
