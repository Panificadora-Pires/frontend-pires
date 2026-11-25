import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useAdminUsuariosStore } from "@/stores/adminUsuarios";
import { iniciaisUsuario, ultimoAcesso } from "@/utils/adminUsuarios";

export function useAdminUsuarios() {
  const store = useAdminUsuariosStore();
  const busca = ref("");
  const perfil = ref("");
  const situacao = ref("");
  const verificacao = ref("");
  const pagina = ref(1);
  const POR_PAGINA = 18;

  const metricas = [
    {
      chave: "total",
      titulo: "Total de contas",
      legenda: "Cadastradas no sistema",
    },
    {
      chave: "clientes",
      titulo: "Clientes",
      legenda: "Contas sem acesso ao painel",
    },
    {
      chave: "administradores",
      titulo: "Administradores",
      legenda: "Contas com acesso ao painel",
    },
    { chave: "ativas", titulo: "Contas ativas", legenda: "Com acesso permitido" },
  ];
  const perfis = [
    { value: "", label: "Todos os perfis" },
    { value: "admin", label: "Administradores" },
    { value: "cliente", label: "Clientes" },
  ];
  const situacoes = [
    { value: "", label: "Todas as situações" },
    { value: "ativa", label: "Ativas" },
    { value: "inativa", label: "Inativas" },
  ];
  const verificacoes = [
    { value: "", label: "Todos os e-mails" },
    { value: "verificado", label: "Verificados" },
    { value: "pendente", label: "Pendentes" },
  ];
  const filtrosAtivos = computed(() =>
    Boolean(busca.value || perfil.value || situacao.value || verificacao.value),
  );
  const inicioPagina = computed(
    () => (store.pagina.page - 1) * store.pagina.page_size + 1,
  );
  const fimPagina = computed(
    () =>
      (store.pagina.page - 1) * store.pagina.page_size +
      store.pagina.results.length,
  );
  let temporizador = null;

  function numero(valor) {
    return new Intl.NumberFormat("pt-BR").format(valor ?? 0);
  }
  function iniciais(usuario) {
    return iniciaisUsuario(usuario.name, usuario.email);
  }
  function parametros() {
    return {
      page: pagina.value,
      page_size: POR_PAGINA,
      busca: busca.value.trim(),
      perfil: perfil.value,
      situacao: situacao.value,
      verificacao: verificacao.value,
    };
  }
  function carregar() {
    return store.carregar(parametros());
  }
  const { atualizarAgora } = useAutoRefresh(carregar, { intervalo: 60_000 });
  function tentarNovamente() {
    store.carregar(parametros()).catch(() => {});
  }
  function irParaPagina(numeroPagina) {
    if (numeroPagina < 1 || numeroPagina > store.pagina.total_pages) return;
    pagina.value = numeroPagina;
    store.carregar(parametros()).catch(() => {});
  }
  function limparFiltros() {
    busca.value = "";
    perfil.value = "";
    situacao.value = "";
    verificacao.value = "";
  }
  watch([busca, perfil, situacao, verificacao], () => {
    pagina.value = 1;
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      store.carregar(parametros()).catch(() => {});
    }, 300);
  });
  watch(
    () => store.pagina.total_pages,
    (total) => {
      if (pagina.value > total && total > 0 && !store.carregando) {
        pagina.value = total;
        store.carregar(parametros()).catch(() => {});
      }
    },
  );
  onBeforeUnmount(() => {
    window.clearTimeout(temporizador);
    store.resetar();
  });

  return {
    busca,
    filtrosAtivos,
    fimPagina,
    iniciais,
    inicioPagina,
    irParaPagina,
    limparFiltros,
    metricas,
    numero,
    pagina,
    perfil,
    perfis,
    situacao,
    situacoes,
    store,
    tentarNovamente,
    verificacao,
    verificacoes,
    ultimoAcesso,
  };
}
