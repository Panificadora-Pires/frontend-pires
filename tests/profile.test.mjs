import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTick } from 'vue';
import { adiar, criarPerfil } from './fixtures/profile-component.mjs';

test('uma submissão em voo; payload só envia campos editáveis', async () => {
  const resposta = adiar(); const payloads = [];
  const view = criarPerfil({ atualizarPerfil: payload => { payloads.push(payload); return resposta.promise; } });
  view.form.name = 'Ana Nova';
  const salvando = view.salvarPerfil(); const duplicado = view.salvarPerfil();
  assert.equal(payloads.length, 1);
  assert.deepEqual([...payloads[0].keys()], ['name', 'phone']);
  resposta.resolve({ ok: true }); await Promise.all([salvando, duplicado]); view.desmontar();
});

test('refresh da mesma conta preserva rascunho; cancelar restaura confirmação mais recente', async () => {
  const view = criarPerfil(); view.form.name = 'Rascunho';
  view.auth.usuario = { ...view.auth.usuario, name: 'Nome confirmado', phone: '4733334444' };
  await nextTick(); assert.equal(view.form.name, 'Rascunho');
  view.restaurarFormulario(); assert.equal(view.form.name, 'Nome confirmado');
  assert.equal(view.form.phone, '(47) 3333-4444'); assert.equal(view.temAlteracoes.value, false); view.desmontar();
});

for (const resultado of [{ ok: true }, { ok: false, ignorado: true }, { ok: false, erro: 'Falha antiga' }]) {
  test(`A→B→A descarta resposta antiga ${JSON.stringify(resultado)}`, async () => {
    const resposta = adiar(); const view = criarPerfil({ atualizarPerfil: () => resposta.promise });
    const usuarioA = { ...view.auth.usuario }; view.form.name = 'Antigo'; const salvando = view.salvarPerfil();
    view.trocarSessao({ id: 2, name: 'B', email: 'b@example.test' }); await nextTick();
    view.trocarSessao(usuarioA); await nextTick(); view.form.name = 'Novo rascunho';
    resposta.resolve(resultado); await salvando;
    assert.equal(view.form.name, 'Novo rascunho'); assert.equal(view.mensagem.value, null); view.desmontar();
  });
}

test('resultado ignorado da conta atual não anuncia erro nem sucesso', async () => {
  const view = criarPerfil({ atualizarPerfil: async () => ({ ok: false, ignorado: true }) });
  view.form.name = 'Rascunho'; await view.salvarPerfil();
  assert.equal(view.mensagem.value, null); assert.equal(view.form.name, 'Rascunho'); view.desmontar();
});

test('falha de campo preserva rascunho e foca primeiro erro', async () => {
  const view = criarPerfil({ atualizarPerfil: async () => ({ ok: false, erro: 'Confira os dados', campos: { name: 'Nome inválido', phone: 'Telefone inválido' } }) });
  view.form.name = 'Rascunho'; await view.salvarPerfil();
  assert.equal(view.form.name, 'Rascunho'); assert.equal(view.erros.name, 'Nome inválido');
  assert.equal(view.focados.at(-1), 'profile-name'); assert.equal(view.salvando.value, false); view.desmontar();
});

test('exceção inesperada é recuperável e preserva rascunho', async () => {
  const view = criarPerfil({ atualizarPerfil: async () => { throw new Error('offline'); } });
  view.form.name = 'Rascunho'; await view.salvarPerfil();
  assert.equal(view.form.name, 'Rascunho'); assert.equal(view.mensagem.value.tipo, 'error');
  assert.equal(view.salvando.value, false); view.desmontar();
});

test('desmontar revoga preview e ignora resposta pendente', async () => {
  const resposta = adiar(); const view = criarPerfil({ atualizarPerfil: () => resposta.promise });
  view.selecionarFoto({ target: { files: [new File(['imagem'], 'foto.png', { type: 'image/png' })] } });
  const preview = view.avatarPreview.value; const salvando = view.salvarPerfil(); view.desmontar();
  resposta.resolve({ ok: true }); await salvando;
  assert.ok(view.revogados.includes(preview)); assert.equal(view.mensagem.value, null);
});

test('upload é provisório; cancelar/remover revogam URL e respeitam avatar Google', () => {
  const view = criarPerfil({ usuario: { id: 1, name: 'Ana', avatar: 'https://example.test/google.png' } });
  view.selecionarFoto({ target: { files: [new File(['imagem'], 'foto.webp', { type: 'image/webp' })] } });
  assert.match(view.avatarExibido.value, /^blob:/); const preview = view.avatarPreview.value;
  view.marcarRemocaoAvatar(); assert.equal(view.avatarExibido.value, ''); assert.equal(view.removerAvatar.value, true);
  assert.ok(view.revogados.includes(preview)); view.restaurarFormulario();
  assert.equal(view.avatarExibido.value, 'https://example.test/google.png'); view.desmontar();
});

test('upload inválido não substitui preview e não é aceito enquanto salva', async () => {
  const resposta = adiar(); const view = criarPerfil({ atualizarPerfil: () => resposta.promise });
  view.selecionarFoto({ target: { files: [new File(['x'], 'arquivo.svg', { type: 'image/svg+xml' })], value: '' } });
  assert.match(view.erros.avatar, /JPG/); assert.equal(view.avatarFile.value, null);
  view.form.name = 'Rascunho'; const salvando = view.salvarPerfil();
  view.selecionarFoto({ target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
  assert.equal(view.avatarFile.value, null); resposta.resolve({ ok: true }); await salvando; view.desmontar();
});

test('último acesso e métodos ausentes não inventam fatos', () => {
  const view = criarPerfil(); assert.equal(view.ultimoAcesso.value, 'Não disponível');
  assert.equal(view.metodosLogin.value, 'Não disponível');
  view.auth.usuario.last_login = 'data inválida'; assert.equal(view.ultimoAcesso.value, 'Não disponível'); view.desmontar();
});

test('remover foto mantém foco na próxima ação disponível', async () => {
  const view = criarPerfil({ usuario: { id: 1, name: 'Ana', avatar: 'https://example.test/foto.png' } });
  view.marcarRemocaoAvatar(); await nextTick();
  assert.equal(view.focados.at(-1), 'profile-avatar-trigger'); view.desmontar();
});

test('mais de 3 MB é recusado sem trocar a foto e o erro recebe foco', async () => {
  const view = criarPerfil();
  view.selecionarFoto({ target: { files: [{ type: 'image/png', size: 3 * 1024 * 1024 + 1 }], value: 'foto' } });
  await nextTick(); assert.equal(view.avatarFile.value, null); assert.match(view.erros.avatar, /3 MB/);
  assert.equal(view.focados.at(-1), 'profile-avatar-trigger'); view.desmontar();
});

test('remoção envia remove_avatar e confirmação limpa rascunho sem enviar e-mail', async () => {
  let payload;
  const view = criarPerfil({ usuario: { id: 1, name: 'Ana', avatar: 'https://example.test/foto.png' }, atualizarPerfil: async recebido => {
    payload = recebido; view.auth.usuario = { ...view.auth.usuario, avatar: '' }; return { ok: true };
  } });
  view.marcarRemocaoAvatar(); await view.salvarPerfil();
  assert.equal(payload.get('remove_avatar'), 'true'); assert.equal(payload.has('email'), false);
  assert.equal(view.avatarExibido.value, ''); assert.equal(view.temAlteracoes.value, false);
  assert.equal(view.mensagem.value.tipo, 'success'); view.desmontar();
});

test('preview da sessão anterior é revogado imediatamente na troca da conta', () => {
  const view = criarPerfil();
  view.selecionarFoto({ target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
  const preview = view.avatarPreview.value;
  view.trocarSessao({ id: 2, name: 'Outra conta' });
  assert.equal(view.avatarPreview.value, ''); assert.ok(view.revogados.includes(preview));
  assert.equal(view.form.name, 'Outra conta'); view.desmontar();
});

test('refresh sem edição local atualiza os campos confirmados', () => {
  const view = criarPerfil(); view.auth.usuario = { ...view.auth.usuario, name: 'Nome confirmado' };
  assert.equal(view.form.name, 'Nome confirmado'); assert.equal(view.temAlteracoes.value, false); view.desmontar();
});

test('perfil já restaurado pelo Router não duplica GET ao montar', async () => {
  let chamadas = 0; const view = criarPerfil({ buscarUsuarioLogado: async () => { chamadas++; } });
  await view.montar(); assert.equal(chamadas, 0); view.desmontar();
});

test('perfil ausente tem loading, falha recuperável e retry sem chamadas simultâneas', async () => {
  const resposta = adiar(); let chamadas = 0;
  const view = criarPerfil({ usuario: null, buscarUsuarioLogado: () => { chamadas++; return resposta.promise; } });
  const montando = view.montar(); await view.carregarPerfil();
  assert.equal(chamadas, 1); assert.equal(view.carregandoPerfil.value, true);
  resposta.reject(new Error('offline')); await montando;
  assert.match(view.erroCarregamento.value, /conexão/); assert.equal(view.carregandoPerfil.value, false);
  view.auth.buscarUsuarioLogado = async () => { view.auth.usuario = { id: 1, name: 'Recuperado' }; return view.auth.usuario; };
  await view.carregarPerfil(); assert.equal(view.form.name, 'Recuperado');
  assert.equal(view.erroCarregamento.value, ''); view.desmontar();
});

test('erro tardio do GET desmontado não deixa feedback de outra página', async () => {
  const resposta = adiar(); const view = criarPerfil({ usuario: null, buscarUsuarioLogado: () => resposta.promise });
  const montando = view.montar(); view.desmontar(); resposta.reject(new Error('offline')); await montando;
  assert.equal(view.erroCarregamento.value, '');
});

for (const [email_verified, estado] of [[true, 'Verificado'], [false, 'Não verificado'], [undefined, 'Não disponível']]) {
  test(`identidade apresenta o estado real do e-mail: ${estado}`, async () => {
    const view = criarPerfil({ usuario: { id: 1, name: 'Ana Fictícia', email: 'ana@example.test', email_verified } });
    const identidade = await view.renderizarIdentidade();
    const texto = identidade.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
    assert.ok(texto.includes(`E-mail: ${estado}`), `Estado ${estado} ausente na identidade`);
    view.desmontar();
  });
}
