// Espelha os limites do catálogo no Django. A validação definitiva é do servidor.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSOES = /\.(jpe?g|png|webp)$/i;

export function validarImagemProduto(arquivo) {
  if (!arquivo) return "Escolha uma imagem.";
  if (!EXTENSOES.test(String(arquivo.name || ""))) {
    return "Formato não suportado. Use JPG, PNG ou WebP.";
  }
  if (!Number.isFinite(arquivo.size) || arquivo.size > MAX_IMAGE_BYTES) {
    return "Escolha uma imagem com até 5 MB.";
  }
  return "";
}
