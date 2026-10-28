/**
 * Animação do produto "voando" até o carrinho.
 *
 * O card (ou o modal) registra de onde saiu o clique; o layout chama `animarVooAoCarrinho`
 * só depois que `cart.adicionar` terminou sem erro. Sem origem recente ou com movimento
 * reduzido, não há voo: o layout só anima o contador.
 */

const VALIDADE_ORIGEM_MS = 1500;
const DURACAO_MS = 650;
const ALTURA_ARCO_PX = 120;
const TAMANHO_PX = 64;

let origem = null;

export function movimentoReduzido() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function registrarOrigemVoo(elemento) {
  if (!elemento) return;
  origem = { elemento, registradaEm: Date.now() };
}

function consumirOrigem() {
  const atual = origem;
  origem = null;
  if (!atual || Date.now() - atual.registradaEm > VALIDADE_ORIGEM_MS) return null;
  if (!atual.elemento.isConnected) return null;
  return atual.elemento;
}

export function animarVooAoCarrinho(destino) {
  const elementoOrigem = consumirOrigem();
  if (!elementoOrigem || !destino || movimentoReduzido() || !destino.isConnected) {
    return Promise.resolve();
  }

  const de = elementoOrigem.getBoundingClientRect();
  const para = destino.getBoundingClientRect();
  if (!para.width || !para.height) return Promise.resolve();

  // Clona só o conteúdo visual (foto ou ilustração) num círculo creme.
  const clone = document.createElement("div");
  clone.className = "pp-voo-carrinho";
  clone.setAttribute("aria-hidden", "true");
  const visual = elementoOrigem.querySelector("img, svg");
  if (visual) clone.appendChild(visual.cloneNode(true));
  document.body.appendChild(clone);

  const metade = TAMANHO_PX / 2;
  const x0 = de.left + de.width / 2 - metade;
  const y0 = de.top + de.height / 2 - metade;
  const x1 = para.left + para.width / 2 - metade;
  const y1 = para.top + para.height / 2 - metade;

  const animacao = clone.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      {
        transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - ALTURA_ARCO_PX}px) scale(0.8)`,
        opacity: 1,
        offset: 0.55,
      },
      { transform: `translate(${x1}px, ${y1}px) scale(0.25)`, opacity: 0.2 },
    ],
    { duration: DURACAO_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  );

  return new Promise((resolve) => {
    const terminar = () => {
      clone.remove();
      resolve();
    };
    animacao.onfinish = terminar;
    animacao.oncancel = terminar;
  });
}
