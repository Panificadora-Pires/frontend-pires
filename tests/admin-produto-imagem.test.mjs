import test from "node:test";
import assert from "node:assert/strict";
import { validarImagemProduto } from "../src/utils/adminProdutoImagem.js";

test("aceita JPG/PNG/WebP até cinco megabytes", () => {
  for (const name of ["foto.jpg", "foto.JPEG", "pao.png", "bolo.webp"]) {
    assert.equal(validarImagemProduto({ name, size: 5 * 1024 * 1024 }), "");
  }
});
test("rejeita extensões incorretas, inclusive sufixos disfarçados", () => {
  assert.match(validarImagemProduto({ name: "bolo.svg", size: 500 }), /Formato/);
  assert.match(validarImagemProduto({ name: "bolo.png.exe", size: 500 }), /Formato/);
});
test("rejeita arquivos grandes ou com tamanho ausente", () => {
  assert.match(validarImagemProduto({ name: "pao.webp", size: 5 * 1024 * 1024 + 1 }), /5 MB/);
  assert.match(validarImagemProduto({ name: "pao.jpg" }), /5 MB/);
});
