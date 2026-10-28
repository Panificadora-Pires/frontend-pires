/**
 * v-revelar: a seção aparece suavemente quando entra na tela (uma vez só).
 * O estilo fica em student.css (.pp-revelar / .is-visivel); com movimento reduzido, aparece direto.
 */

let observador = null;

function obterObservador() {
  if (observador || typeof IntersectionObserver === "undefined") return observador;
  observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("is-visivel");
        observador.unobserve(entrada.target);
      });
    },
    // Basta a borda da seção entrar na tela: em seções altas (grade de produtos no celular),
    // exigir uma fração da área deixaria um vazio abaixo do banner.
    { threshold: 0, rootMargin: "0px 0px -10% 0px" },
  );
  return observador;
}

export default {
  mounted(el) {
    el.classList.add("pp-revelar");
    const obs = obterObservador();
    if (obs) {
      obs.observe(el);
    } else {
      el.classList.add("is-visivel");
    }
  },
  unmounted(el) {
    observador?.unobserve(el);
  },
};
