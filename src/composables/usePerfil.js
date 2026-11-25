import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";

import { getSessionVersion } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

export function estadoBooleano(valor, sim, nao) {
  return valor === true ? sim : valor === false ? nao : "Não disponível";
}

export function usePerfil() {
  const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
  const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const auth = useAuthStore();
  const avatarInput = ref(null);
  const avatarFile = ref(null);
  const avatarPreview = ref("");
  const removerAvatar = ref(false);
  const avatarRemotoComErro = ref(false);
  const salvando = ref(false);
  const carregandoPerfil = ref(!auth.usuario);
  const erroCarregamento = ref("");
  const mensagem = ref(null);
  const confirmado = ref(null);
  const form = reactive({ name: "", phone: "" });
  const erros = reactive({ name: "", phone: "", avatar: "" });
  let ativo = true;
  let versaoFormulario = getSessionVersion();
  let operacao = 0;
  let buscaPendente = false;

  const iniciais = computed(() =>
    String(auth.usuario?.name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join(""),
  );
  const avatarExibido = computed(() => {
    if (avatarRemotoComErro.value) return "";
    if (avatarPreview.value) return avatarPreview.value;
    return removerAvatar.value ? "" : auth.usuario?.avatar || "";
  });
  const temAlteracoes = computed(
    () =>
      Boolean(confirmado.value) &&
      (form.name.trim() !== String(confirmado.value.name || "").trim() ||
        form.phone !== mascararTelefone(confirmado.value.phone) ||
        Boolean(avatarFile.value) ||
        removerAvatar.value),
  );
  const ultimoAcesso = computed(() => {
    const valor = auth.usuario?.last_login;
    if (!valor) return "Não disponível";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "Não disponível";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(data);
  });
  const metodosLogin = computed(() => {
    const metodos = [];
    if (auth.usuario?.has_usable_password === true)
      metodos.push("E-mail e senha");
    if (auth.usuario?.google_connected === true) metodos.push("Google");
    return metodos.join(" + ") || "Não disponível";
  });

  watch(
    () => auth.usuario,
    (usuario) => {
      const novaSessao =
        versaoFormulario !== getSessionVersion() ||
        confirmado.value?.id !== usuario?.id;
      const preservarRascunho = !novaSessao && temAlteracoes.value;
      const avatarAnterior = confirmado.value?.avatar;
      confirmado.value = usuario ? { ...usuario } : null;
      if (novaSessao) {
        versaoFormulario = getSessionVersion();
        operacao++;
        salvando.value = false;
        erroCarregamento.value = "";
      }
      if (!preservarRascunho) restaurarFormulario();
      if (avatarAnterior !== usuario?.avatar) avatarRemotoComErro.value = false;
    },
    { immediate: true, deep: true, flush: "sync" },
  );

  function contextoAtual(contexto) {
    return (
      ativo &&
      contexto.versao === getSessionVersion() &&
      contexto.id === auth.usuario?.id &&
      contexto.operacao === operacao
    );
  }

  function restaurarFormulario() {
    if (salvando.value) return;
    form.name = String(confirmado.value?.name || "");
    form.phone = mascararTelefone(confirmado.value?.phone);
    avatarFile.value = null;
    removerAvatar.value = false;
    avatarRemotoComErro.value = false;
    limparPreview();
    limparErros();
    mensagem.value = null;
    if (avatarInput.value) avatarInput.value.value = "";
  }
  function abrirSeletorFoto() {
    if (!salvando.value) avatarInput.value?.click();
  }

  function selecionarFoto(event) {
    if (salvando.value) return;
    limparErro("avatar");
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (
      !ALLOWED_AVATAR_TYPES.has(arquivo.type) ||
      arquivo.size > MAX_AVATAR_BYTES
    ) {
      erros.avatar = !ALLOWED_AVATAR_TYPES.has(arquivo.type)
        ? "Escolha uma imagem JPG, PNG ou WebP."
        : "A foto de perfil deve ter no máximo 3 MB.";
      event.target.value = "";
      focarPrimeiroErro();
      return;
    }
    limparPreview();
    avatarFile.value = arquivo;
    avatarPreview.value = URL.createObjectURL(arquivo);
    removerAvatar.value = false;
    avatarRemotoComErro.value = false;
  }

  function marcarRemocaoAvatar() {
    if (salvando.value) return;
    avatarFile.value = null;
    removerAvatar.value = Boolean(confirmado.value?.avatar);
    avatarRemotoComErro.value = false;
    limparPreview();
    limparErro("avatar");
    if (avatarInput.value) avatarInput.value.value = "";
    document.getElementById("profile-avatar-trigger")?.focus();
  }

  function atualizarTelefone(event) {
    if (salvando.value) return;
    form.phone = mascararTelefone(event.target.value);
    event.target.value = form.phone;
    limparErro("phone");
  }

  function mascararTelefone(valor) {
    const digitos = String(valor || "")
      .replace(/\D/g, "")
      .replace(/^55(?=\d{10,11}$)/, "")
      .slice(0, 11);
    if (!digitos) return "";
    if (digitos.length <= 2) return `(${digitos}`;
    if (digitos.length <= 6)
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    const corte = digitos.length <= 10 ? 6 : 7;
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, corte)}-${digitos.slice(corte)}`;
  }

  async function salvarPerfil() {
    if (salvando.value || !auth.usuario || !temAlteracoes.value) return;
    limparErros();
    mensagem.value = null;
    if (!form.name.trim()) {
      erros.name = "Informe seu nome completo.";
      await focarPrimeiroErro();
      return;
    }
    const contexto = {
      versao: getSessionVersion(),
      id: auth.usuario.id,
      operacao: ++operacao,
    };
    salvando.value = true;
    try {
      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("phone", form.phone.trim());
      if (avatarFile.value) payload.append("avatar", avatarFile.value);
      else if (removerAvatar.value) payload.append("remove_avatar", "true");
      const resultado = await auth.atualizarPerfil(payload);
      if (!contextoAtual(contexto) || resultado?.ignorado) return;
      if (!resultado?.ok) {
        Object.assign(erros, {
          name: resultado?.campos?.name || "",
          phone: resultado?.campos?.phone || "",
          avatar: resultado?.campos?.avatar || "",
        });
        mensagem.value = {
          tipo: "error",
          texto:
            resultado?.erro ||
            "Não foi possível salvar seu perfil. Tente novamente.",
        };
        salvando.value = false;
        await focarPrimeiroErro(contexto);
        return;
      }
      confirmado.value = { ...auth.usuario };
      salvando.value = false;
      restaurarFormulario();
      mensagem.value = {
        tipo: "success",
        texto: "Perfil atualizado com sucesso.",
      };
    } catch {
      if (contextoAtual(contexto)) {
        mensagem.value = {
          tipo: "error",
          texto:
            "Não foi possível salvar seu perfil. Verifique sua conexão e tente novamente.",
        };
      }
    } finally {
      if (contextoAtual(contexto)) salvando.value = false;
    }
  }

  async function focarPrimeiroErro(contexto) {
    await nextTick();
    if (!ativo || (contexto && !contextoAtual(contexto))) return;
    const campo = ["name", "phone", "avatar"].find((chave) => erros[chave]);
    if (campo) {
      document
        .getElementById(
          campo === "avatar" ? "profile-avatar-trigger" : `profile-${campo}`,
        )
        ?.focus();
    }
  }

  async function carregarPerfil() {
    if (buscaPendente || !ativo) return;
    const versao = getSessionVersion();
    buscaPendente = true;
    carregandoPerfil.value = true;
    erroCarregamento.value = "";
    try {
      const usuario = await auth.buscarUsuarioLogado();
      if (ativo && versao === getSessionVersion() && !usuario && !auth.usuario) {
        erroCarregamento.value =
          "Seus dados não estão disponíveis. Tente novamente.";
      }
    } catch {
      if (ativo && versao === getSessionVersion()) {
        erroCarregamento.value = "Verifique sua conexão e tente novamente.";
      }
    } finally {
      buscaPendente = false;
      if (ativo && versao === getSessionVersion()) carregandoPerfil.value = false;
    }
  }

  function limparErro(campo) {
    erros[campo] = "";
    mensagem.value = null;
  }

  function limparErros() {
    Object.assign(erros, { name: "", phone: "", avatar: "" });
  }

  function limparPreview() {
    if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value);
    avatarPreview.value = "";
  }

  onMounted(() => {
    if (!auth.usuario) return carregarPerfil();
  });

  onBeforeUnmount(() => {
    ativo = false;
    operacao++;
    limparPreview();
  });

  return {
    auth,
    avatarInput,
    avatarFile,
    avatarPreview,
    removerAvatar,
    avatarRemotoComErro,
    salvando,
    carregandoPerfil,
    erroCarregamento,
    mensagem,
    form,
    erros,
    iniciais,
    avatarExibido,
    temAlteracoes,
    ultimoAcesso,
    metodosLogin,
    estadoBooleano,
    restaurarFormulario,
    abrirSeletorFoto,
    selecionarFoto,
    marcarRemocaoAvatar,
    atualizarTelefone,
    salvarPerfil,
    carregarPerfil,
    limparErro,
  };
}
