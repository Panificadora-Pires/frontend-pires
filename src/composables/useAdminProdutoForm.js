import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import adminService from "@/services/admin.service";
import { resolverUrlMidia } from "@/services/catalog.service";
import { getSessionVersion } from "@/services/api";
import { validarImagemProduto } from "@/utils/adminProdutoImagem";

export function useAdminProdutoForm() {
  const route = useRoute();
  const router = useRouter();
  const salvando = ref(false);
  const carregandoDados = ref(true);
  const erroCarregamento = ref("");
  const erroImagem = ref("");
  const erro = ref("");
  const imagem = ref(null);
  const previewTemporario = ref("");
  const imagemAtual = ref("");
  const editando = computed(() => Boolean(route.params.id));
  const form = reactive({
    nome: "",
    descricao: "",
    categoria: "",
    unidade_medida: "unidade",
    preco: "",
    preco_custo: "",
    estoque: 0,
    estoque_minimo: 0,
    destaque: false,
    ativo: true,
  });
  const preview = computed(() => previewTemporario.value || imagemAtual.value);
  let geracaoCarregamento = 0;

  function preencher(p) {
    form.nome = p.nome || "";
    form.descricao = p.descricao || "";
    form.categoria = p.categoria || "";
    form.unidade_medida = p.unidade_medida || "unidade";
    form.preco = p.preco || "";
    form.preco_custo = p.preco_custo ?? "";
    form.estoque = p.estoque ?? 0;
    form.estoque_minimo = p.estoque_minimo ?? 0;
    form.destaque = Boolean(p.destaque);
    form.ativo = p.ativo !== false;
    imagemAtual.value = resolverUrlMidia(p.imagem);
  }

  function selecionarImagem(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const mensagem = validarImagemProduto(arquivo);
    if (mensagem) {
      erroImagem.value = mensagem;
      e.target.value = "";
      return;
    }
    erroImagem.value = "";
    imagem.value = arquivo;
    if (previewTemporario.value) URL.revokeObjectURL(previewTemporario.value);
    previewTemporario.value = URL.createObjectURL(arquivo);
  }

  function erroApi(e) {
    const d = e.response?.data;
    if (d && typeof d === "object") {
      for (const v of Object.values(d)) {
        if (Array.isArray(v) && v[0]) return String(v[0]);
        if (typeof v === "string") return v;
      }
    }
    return "Não foi possível salvar o produto.";
  }

  async function salvar() {
    if (!form.categoria) {
      erro.value = "Selecione uma categoria para o produto.";
      return;
    }
    salvando.value = true;
    erro.value = "";
    try {
      const payload = { ...form, imagem: imagem.value };
      if (editando.value)
        await adminService.atualizarProduto(route.params.id, payload);
      else await adminService.criarProduto(payload);
      await router.replace({ name: "admin-produtos" });
    } catch (e) {
      erro.value = erroApi(e);
    } finally {
      salvando.value = false;
    }
  }

  function limparFormulario() {
    Object.assign(form, {
      nome: "",
      descricao: "",
      categoria: "",
      unidade_medida: "unidade",
      preco: "",
      preco_custo: "",
      estoque: 0,
      estoque_minimo: 0,
      destaque: false,
      ativo: true,
    });
    if (previewTemporario.value) URL.revokeObjectURL(previewTemporario.value);
    previewTemporario.value = "";
    imagemAtual.value = "";
    imagem.value = null;
    erro.value = "";
    erroImagem.value = "";
  }
  async function carregar() {
    const geracao = ++geracaoCarregamento;
    const sessao = getSessionVersion();
    const id = route.params.id;
    carregandoDados.value = true;
    erroCarregamento.value = "";
    try {
      const produto = id ? await adminService.obterProdutoAdmin(id) : null;
      if (geracao !== geracaoCarregamento || sessao !== getSessionVersion())
        return;
      if (produto) preencher(produto);
    } catch {
      if (geracao === geracaoCarregamento && sessao === getSessionVersion()) {
        erroCarregamento.value =
          "Não foi possível carregar os dados necessários para este formulário.";
      }
    } finally {
      if (geracao === geracaoCarregamento) carregandoDados.value = false;
    }
  }

  watch(
    () => route.params.id,
    () => {
      limparFormulario();
      void carregar();
    },
  );
  onMounted(carregar);
  onBeforeUnmount(() => {
    geracaoCarregamento += 1;
    if (previewTemporario.value) URL.revokeObjectURL(previewTemporario.value);
  });

  return {
    carregandoDados,
    carregar,
    editando,
    erro,
    erroCarregamento,
    erroImagem,
    form,
    imagem,
    preview,
    salvando,
    salvar,
    selecionarImagem,
  };
}
