import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

// O painel só ganha distância de rolagem quando todo o conteúdo cabe na tela.
// A compra continua independente da mídia e da posição do scroll.
export function useScrollVideo(container, panel, video) {
  const active = shallowRef(false);
  const distance = shallowRef(0);
  const panelHeight = shallowRef(0);
  const canLoad = shallowRef(false);
  let frame = 0;
  let failed = false;
  let reducedMotion;
  let desktop;
  let observer;
  let detachVideo = () => {};
  let detachEligibility = () => {};

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function update() {
    frame = 0;
    const element = video.value;
    const section = container.value;
    const surface = panel.value;
    if (!section || !surface) return;

    const top = parseFloat(getComputedStyle(surface).top) || 0;
    const bottomNav = document.querySelector(".student-layout__bottom-nav");
    const bottom = bottomNav?.getBoundingClientRect().height || 0;
    const available = window.innerHeight - top - bottom - 16;
    panelHeight.value = surface.offsetHeight;
    const valid = element && !failed && !element.error && element.readyState >= 1 &&
      Number.isFinite(element.duration) && element.duration > 0 &&
      element.videoWidth > 0 && element.videoHeight > 0;
    active.value = Boolean(valid && canLoad.value && surface.offsetHeight <= available);
    distance.value = active.value ? Math.max(window.innerHeight * 1.25, 720) : 0;
    if (!active.value) return;

    const progress = Math.min(1, Math.max(0, (top - section.getBoundingClientRect().top) / distance.value));
    // O clipe local tem 24fps. O último quadro começa antes do fim da duração.
    const target = progress * Math.max(0, element.duration - 1 / 24);
    // Enquanto há um seek pendente, preservar apenas a posição mais recente do scroll.
    // seeked agenda uma nova leitura, inclusive quando o usuário já parou de rolar.
    if (!element.seeking && Math.abs(element.currentTime - target) > 1 / 96) {
      try {
        element.currentTime = target;
      } catch {
        failed = true;
        schedule();
      }
    }
  }

  watch(video, (element) => {
    detachVideo();
    failed = false;
    if (!element) { schedule(); return; }
    const onError = () => { failed = true; schedule(); };
    const events = ["loadedmetadata", "durationchange", "loadeddata", "seeked"];
    for (const event of events) element.addEventListener(event, schedule);
    element.addEventListener("error", onError);
    detachVideo = () => {
      for (const event of events) element.removeEventListener(event, schedule);
      element.removeEventListener("error", onError);
    };
    schedule();
  }, { flush: "post" });

  onMounted(() => {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    desktop = window.matchMedia("(min-width: 761px)");
    const updateEligibility = () => {
      canLoad.value = desktop.matches && !reducedMotion.matches;
      schedule();
    };
    reducedMotion.addEventListener("change", updateEligibility);
    desktop.addEventListener("change", updateEligibility);
    detachEligibility = () => {
      reducedMotion.removeEventListener("change", updateEligibility);
      desktop.removeEventListener("change", updateEligibility);
    };
    updateEligibility();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    // Inclui fontes, descrição longa, mudança de zoom e conteúdo anterior à faixa.
    observer = new ResizeObserver(schedule);
    observer.observe(panel.value);
    observer.observe(document.body);
    schedule();
  });

  onBeforeUnmount(() => {
    detachVideo();
    observer?.disconnect();
    detachEligibility();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("pageshow", schedule);
    cancelAnimationFrame(frame);
  });

  return { active, distance, panelHeight, canLoad };
}
