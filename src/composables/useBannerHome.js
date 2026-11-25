import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import { registrarOrigemVoo } from "@/utils/vooAoCarrinho";

export function useBannerHome(props, emit) {
  const DURACAO_SLIDE_MS = 6000;
  const ROLAGEM_PARALLAX_PX = 320;

  const raiz = useTemplateRef("raiz");
  const atual = shallowRef(0);
  const movimentoReduzido = shallowRef(false);
  const abaEscondida = shallowRef(document.hidden);
  const consultaLayout = window.matchMedia("(max-width: 760px)");
  const telaMobile = shallowRef(consultaLayout.matches);
  const slidesVisuais = computed(() =>
    props.slides.map((slide) => ({
      ...slide,
      video:
        telaMobile.value && slide.videoMobile ? slide.videoMobile : slide.video,
      poster:
        telaMobile.value && slide.posterMobile
          ? slide.posterMobile
          : slide.poster,
    })),
  );
  const fotosComErro = shallowRef(new Set());
  let timer = null;
  let consultaMovimento = null;
  let quadroAgendado = false;

  const videosComErro = shallowRef(new Set());
  const videos = new Map();

  function temComercial(slide) {
    if (!slide?.video) return false;
    return (
      (!movimentoReduzido.value && !videosComErro.value.has(slide.id)) ||
      (slide.poster && !fotosComErro.value.has(slide.poster))
    );
  }

  function registrarVideoComErro(id) {
    videosComErro.value = new Set(videosComErro.value).add(id);
    nextTick(agendar);
  }

  function registrarVideo(id, el) {
    if (el) videos.set(id, el);
    else videos.delete(id);
  }

  function sincronizarVideos() {
    props.slides.forEach((slide, indice) => {
      const video = videos.get(slide.id);
      if (!video) return;
      if (
        indice === atual.value &&
        !movimentoReduzido.value &&
        !abaEscondida.value
      ) {
        if (video.paused)
          video.play().catch((erro) => {
            if (erro.name !== "AbortError") registrarVideoComErro(slide.id);
          });
      } else {
        video.pause();
        if (indice !== atual.value && video.currentTime !== 0)
          video.currentTime = 0;
      }
    });
  }

  watch(
    [atual, movimentoReduzido, abaEscondida, telaMobile, () => props.slides],
    () => {
      nextTick(() => {
        sincronizarVideos();
        agendar();
      });
    },
    { flush: "post" },
  );

  function aoTerminarVideo(id) {
    if (props.slides[atual.value]?.id === id && !abaEscondida.value)
      irPara(atual.value + 1);
  }

  function aoMudarVisibilidade() {
    abaEscondida.value = document.hidden;
  }

  function aoMudarLayout() {
    telaMobile.value = consultaLayout.matches;
  }

  function registrarFotoComErro(id) {
    fotosComErro.value = new Set(fotosComErro.value).add(id);
  }

  function irPara(indice) {
    const total = props.slides.length;
    if (!total) return;
    atual.value = (indice + total) % total;
    agendar();
  }

  function agendar() {
    window.clearTimeout(timer);
    if (movimentoReduzido.value || abaEscondida.value || props.slides.length < 2)
      return;
    const slide = props.slides[atual.value];
    if (slide?.video && !videosComErro.value.has(slide.id)) return;
    timer = window.setTimeout(
      () => irPara(atual.value + 1),
      slide?.duracao || DURACAO_SLIDE_MS,
    );
  }

  function adicionar(slide, event) {
    const produto = event.currentTarget
      .closest(".home-banner__slide")
      ?.querySelector(
        ".home-banner__video, .home-banner__foto, .home-banner__ilustracao",
      );
    registrarOrigemVoo(produto);
    emit("adicionar", slide.acao.produto);
  }

  function atualizarCena() {
    quadroAgendado = false;
    const progresso = movimentoReduzido.value
      ? 1
      : Math.min(1, Math.max(0, window.scrollY / ROLAGEM_PARALLAX_PX));
    raiz.value?.style.setProperty("--p", progresso.toFixed(3));
  }

  function aoRolar() {
    if (quadroAgendado) return;
    quadroAgendado = true;
    window.requestAnimationFrame(atualizarCena);
  }

  function aoMudarMovimento() {
    movimentoReduzido.value = Boolean(consultaMovimento?.matches);
    atualizarCena();
    agendar();
  }

  watch(
    () => props.slides.map((slide) => slide.id).join(","),
    () => {
      atual.value = 0;
      agendar();
    },
  );

  onMounted(() => {
    consultaLayout.addEventListener("change", aoMudarLayout);
    consultaMovimento =
      window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
    consultaMovimento?.addEventListener?.("change", aoMudarMovimento);
    movimentoReduzido.value = Boolean(consultaMovimento?.matches);
    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    atualizarCena();
    agendar();
    nextTick(sincronizarVideos);
  });

  onBeforeUnmount(() => {
    consultaLayout.removeEventListener("change", aoMudarLayout);
    window.clearTimeout(timer);
    window.removeEventListener("scroll", aoRolar);
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    videos.forEach((video) => video.pause());
    consultaMovimento?.removeEventListener?.("change", aoMudarMovimento);
  });

  return {
    DURACAO_SLIDE_MS,
    abaEscondida,
    adicionar,
    aoTerminarVideo,
    atual,
    fotosComErro,
    irPara,
    movimentoReduzido,
    raiz,
    registrarFotoComErro,
    registrarVideo,
    registrarVideoComErro,
    sincronizarVideos,
    slidesVisuais,
    temComercial,
    videosComErro,
  };
}
