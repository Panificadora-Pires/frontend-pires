const CHAVE = "pp_recarga_nova_versao";
const INTERVALO_MINIMO_MS = 10_000;

export function erroDeVersaoAntiga(erro) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    String(erro?.message || erro || ""),
  );
}

export function podeRecarregar(armazenamento, agora = Date.now()) {
  try {
    const ultima = Number(armazenamento.getItem(CHAVE) || 0);
    if (agora - ultima < INTERVALO_MINIMO_MS) return false;
    armazenamento.setItem(CHAVE, String(agora));
    return true;
  } catch {
    return false;
  }
}

export function recarregarParaNovaVersao(destino) {
  if (!podeRecarregar(window.sessionStorage)) return false;
  if (destino) window.location.assign(destino);
  else window.location.reload();
  return true;
}
