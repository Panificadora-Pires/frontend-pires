function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function indicadoresCategorias(categorias = []) {
  return categorias.reduce((contagens, categoria) => {
    contagens.total++;
    if (categoria.ativa) contagens.ativas++;
    else contagens.inativas++;
    return contagens;
  }, { total: 0, ativas: 0, inativas: 0 });
}

export function filtrarCategoriasAdmin(categorias = [], { busca = "", situacao = "" } = {}) {
  const texto = normalizar(busca);
  return categorias
    .filter(categoria => {
      if (situacao === "ativa" && !categoria.ativa) return false;
      if (situacao === "inativa" && categoria.ativa) return false;
      if (!texto) return true;
      return [categoria.nome, categoria.descricao, categoria.slug].some(campo =>
        normalizar(campo).includes(texto)
      );
    })
    .slice()
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)
      || String(a.nome).localeCompare(String(b.nome), "pt-BR")
      || Number(a.id) - Number(b.id));
}
