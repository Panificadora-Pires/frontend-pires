import { readFileSync } from 'node:fs';
import { compile, computed, createSSRApp, effectScope, h, nextTick, reactive, ref, watch } from 'vue';
import { renderToString } from '@vue/server-renderer';

export const adiar = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};

// Executa o script setup da tela real; só serviços, DOM e lifecycle são controlados.
export function criarPerfil({ usuario, atualizarPerfil, buscarUsuarioLogado } = {}) {
  let versao = 1;
  const auth = reactive({
    usuario: usuario === undefined ? { id: 1, name: 'Ana Fictícia', email: 'ana@example.test', phone: '47999999999', avatar: '' } : usuario,
    atualizarPerfil: atualizarPerfil ?? (async () => ({ ok: true })),
    buscarUsuarioLogado: buscarUsuarioLogado ?? (async () => auth.usuario),
  });
  const montados = [], desmontados = [], revogados = [], focados = [];
  const contexto = {
    computed, nextTick, reactive, ref, watch,
    onMounted: fn => montados.push(fn), onBeforeUnmount: fn => desmontados.push(fn),
    useAuthStore: () => auth, getSessionVersion: () => versao,
    useReducedMotion: () => ref(false),
    window: { setTimeout: () => 1, clearTimeout() {} },
    document: { getElementById: id => ({ focus: () => focados.push(id) }) },
    URL: { createObjectURL: () => `blob:perfil-${revogados.length}`, revokeObjectURL: url => revogados.push(url) },
  };
  const fonte = readFileSync(new URL('../../src/views/student/ProfileView.vue', import.meta.url), 'utf8');
  const script = fonte.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import\s[\s\S]*?;\s*/gm, '');
  const escopo = effectScope();
  const view = escopo.run(() => new Function(...Object.keys(contexto), `${script}\nreturn { form, erros, salvando, mensagem, avatarFile, avatarPreview, removerAvatar, avatarExibido, ultimoAcesso, metodosLogin, temAlteracoes, salvarPerfil, restaurarFormulario, selecionarFoto, marcarRemocaoAvatar, carregarPerfil, carregandoPerfil, erroCarregamento, auth, iniciais, avatarInput, abrirSeletorFoto, estadoBooleano };`)(...Object.values(contexto)));
  return {
    ...view, auth, revogados, focados,
    montar: () => Promise.all(montados.map(fn => fn())),
    renderizarIdentidade: async () => {
      const template = fonte.match(/<section class="profile-identity"[\s\S]*?<\/section>/)[0];
      const app = createSSRApp({ setup: () => view, render: compile(template) });
      for (const nome of ['UserRound', 'Upload', 'Trash2', 'MailCheck']) {
        app.component(nome, { render: () => h('svg', { 'aria-hidden': 'true' }) });
      }
      return renderToString(app);
    },
    trocarSessao(usuarioNovo) { versao++; auth.usuario = usuarioNovo; },
    desmontar() { desmontados.forEach(fn => fn()); escopo.stop(); },
  };
}
