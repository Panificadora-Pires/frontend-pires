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
    { threshold: 0.15 },
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
