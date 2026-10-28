/**
 * Escolhe a ilustração própria de um produto (usada quando ele não tem foto).
 * Procura primeiro no nome e depois na categoria, sem diferença de acento ou maiúscula.
 */

const POR_NOME = [
  ["coxinha", "coxinha"],
  ["pao de queijo", "paodequeijo"],
  ["esfirra", "esfirra"],
  ["esfiha", "esfirra"],
  ["pastel", "pastel"],
  ["brigadeiro", "brigadeiro"],
  ["brownie", "brownie"],
  ["cookie", "cookie"],
  ["biscoito", "cookie"],
  ["bolo", "bolo"],
  ["combo", "combo"],
  ["uva", "sucouva"],
  ["suco", "suco"],
  ["agua", "agua"],
  ["refrigerante", "refrigerante"],
  ["refri", "refrigerante"],
];

const POR_CATEGORIA = [
  ["combo", "combo"],
  ["bebida", "bebida"],
  ["doce", "doce"],
  ["salgad", "salgado"],
];

export const ILUSTRACAO_PADRAO = "salgado";

export function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function procurar(regras, texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  const regra = regras.find(([chave]) => alvo.includes(chave));
  return regra ? regra[1] : null;
}

export function ilustracaoParaProduto(produto) {
  const categoria = produto?.categoria_nome || produto?.categoria?.nome;
  return (
    procurar(POR_NOME, produto?.nome) ||
    procurar(POR_CATEGORIA, categoria) ||
    ILUSTRACAO_PADRAO
  );
}
