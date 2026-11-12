import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarFavoritos, categoriasFavoritas, validarAdicao } from '../src/utils/favoritos.js';
const produtos = [
  {id:1, nome:'Pão de queijo', categoria_nome:'Salgados', preco_atual:'7.50'},
  {id:2, nome:'Café', categoria_nome:'Bebidas', preco:'4.00'},
  {id:3, nome:'Água', categoria_nome:'Bebidas', preco:'3.00'},
];
test('busca remove acentos e combina categoria real e ordenação sem mutar coleção',()=>{
  assert.deepEqual(filtrarFavoritos(produtos,{busca:'PAO'}).map(p=>p.id),[1]);
  assert.deepEqual(filtrarFavoritos(produtos,{busca:'bebidas',categoria:'Bebidas',ordem:'maior-preco'}).map(p=>p.id),[2,3]);
  assert.deepEqual(filtrarFavoritos(produtos,{ordem:'nome'}).map(p=>p.id),[3,2,1]);
  assert.deepEqual(categoriasFavoritas(produtos),['Bebidas','Salgados']);
  assert.deepEqual(produtos.map(p=>p.id),[1,2,3]);
});
test('adição rejeita estoque incluindo carrinho, inativo, preço inválido e mudança de preço',()=>{
  const salvo={id:1,preco:'5.00'}, atual={...salvo,ativo:true,estoque:3};
  assert.equal(validarAdicao(salvo,atual,1,2),null);
  assert.equal(validarAdicao(salvo,atual,2,2),'estoque');
  assert.equal(validarAdicao(salvo,{...atual,ativo:false},1,0),'indisponivel');
  assert.equal(validarAdicao(salvo,{...atual,preco:'6.00'},1,0),'preco-alterado');
  assert.equal(validarAdicao(salvo,{...atual,preco:null},1,0),'indisponivel');
  assert.equal(validarAdicao(salvo,{...atual,id:2},1,0),'indisponivel');
});
