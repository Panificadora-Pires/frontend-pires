export const normalizarTexto = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export const categoriaProduto = produto => String(produto.categoria_nome || produto.categoria?.nome || '').trim();
export function precoProduto(produto) {
  const valor = produto?.preco_atual ?? produto?.preco;
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0 ? Number(valor) : null;
}
export function categoriasFavoritas(produtos) {
  return [...new Set(produtos.map(categoriaProduto).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
}
export function filtrarFavoritos(produtos, { busca = '', categoria = '', ordem = 'selecao' } = {}) {
  const termo = normalizarTexto(busca);
  const lista = produtos.filter(p => (!categoria || categoriaProduto(p) === categoria) && normalizarTexto(`${p.nome || ''} ${categoriaProduto(p)}`).includes(termo));
  if (ordem === 'nome') lista.sort((a,b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  if (['menor-preco','maior-preco'].includes(ordem)) lista.sort((a,b) => {
    const pa = precoProduto(a), pb = precoProduto(b);
    if (pa === null) return pb === null ? 0 : 1;
    if (pb === null) return -1;
    return (pa-pb) * (ordem === 'maior-preco' ? -1 : 1);
  });
  return lista;
}
export function validarAdicao(anterior, atual, quantidade, noCarrinho) {
  if (!atual?.ativo || Number(anterior?.id) !== Number(atual?.id) || precoProduto(atual) === null || !Number.isSafeInteger(quantidade) || quantidade < 1) return 'indisponivel';
  if (precoProduto(anterior) !== precoProduto(atual)) return 'preco-alterado';
  if (!Number.isFinite(Number(atual.estoque)) || Number(atual.estoque) <= 0 || noCarrinho + quantidade > Number(atual.estoque)) return 'estoque';
  return null;
}
