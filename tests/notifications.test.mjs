import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  apresentarNotificacao,
  agruparNotificacoes,
  filtrarNotificacoes,
  formatarDataNotificacao,
} from "../src/utils/notifications.js";

const aviso = (id, pedido, mensagem, criada_em = "2026-11-06T12:00:00Z") => ({
  id,
  pedido,
  mensagem,
  criada_em,
  lida: false,
});

test("classifica somente os dois templates completos, vinculados ao mesmo pedido válido", () => {
  const pronta = aviso(
    1,
    42,
    "Seu pedido #42 está pronto para retirada! Mostre seu QR Code no balcão.",
  );
  const chat = aviso(2, 42, "Nova mensagem da padaria sobre o pedido #42.");
  assert.deepEqual(apresentarNotificacao(pronta), {
    tipo: "retirada",
    titulo: "Pedido pronto para retirada",
    destino: { name: "pedidos", query: { pedido: "42" } },
    acao: "Ver pedido",
  });
  assert.deepEqual(apresentarNotificacao(chat), {
    tipo: "mensagem",
    titulo: "Nova mensagem da padaria",
    destino: { name: "pedidos", query: { chat: "42" } },
    acao: "Abrir conversa",
  });
  for (const item of [
    aviso(3, 42, "Nova mensagem da padaria sobre o pedido #43."),
    aviso(4, null, chat.mensagem),
    aviso(5, 42, chat.mensagem + " "),
    aviso(
      6,
      0,
      "Seu pedido #0 está pronto para retirada! Mostre seu QR Code no balcão.",
    ),
    aviso(7, 42, "Seu pedido está pronto"),
    aviso(8, "1.2", "Nova mensagem da padaria sobre o pedido #1.2."),
  ]) {
    assert.equal(apresentarNotificacao(item).tipo, "generica");
    assert.equal(apresentarNotificacao(item).destino, null);
    assert.equal(apresentarNotificacao(item).titulo, "Atualização da Pires");
  }
  assert.equal(chat.mensagem, "Nova mensagem da padaria sobre o pedido #42.");
});

test("ordenação recente e desempate por ID são estáveis; datas inválidas ficam ao fim", () => {
  const itens = [
    aviso(1, null, "A", "inválida"),
    aviso(2, null, "B"),
    aviso(3, null, "C"),
    aviso(4, null, "D", "2026-11-05T12:00:00Z"),
  ];
  const grupos = agruparNotificacoes(itens, new Date("2026-11-06T15:00:00Z"));
  assert.deepEqual(
    grupos.flatMap((g) => g.itens.map((i) => i.id)),
    [3, 2, 4, 1],
  );
  assert.equal(itens[0].id, 1);
  assert.equal(grupos.at(-1).titulo, "Data indisponível");
  assert.equal(formatarDataNotificacao(null), "Data indisponível");
  assert.equal(formatarDataNotificacao("não-data"), "Data indisponível");
});

test("filtros por leitura, texto e número de pedido não alteram mensagens nem coleção", () => {
  const itens = [
    aviso(1, 42, "Nova mensagem da padaria sobre o pedido #42."),
    { ...aviso(2, 43, "Atualização geral"), lida: true },
  ];
  assert.deepEqual(
    filtrarNotificacoes(itens, "nao-lidas", "").map((i) => i.id),
    [1],
  );
  assert.deepEqual(
    filtrarNotificacoes(itens, "todas", "#43").map((i) => i.id),
    [2],
  );
  assert.deepEqual(
    filtrarNotificacoes(itens, "todas", "PADARIA").map((i) => i.id),
    [1],
  );
  assert.equal(filtrarNotificacoes(itens, "todas", "inexistente").length, 0);
});

test("Hoje/Ontem seguem o calendário local em virada de dia e DST, sem assumir dias de24h", () => {
  const modulo = new URL("../src/utils/notifications.js", import.meta.url).href;
  const casos = [
    [
      "America/Sao_Paulo",
      "2026-11-06T03:10:00Z",
      "2026-11-06T02:59:00Z",
      "Ontem",
    ],
    [
      "America/Sao_Paulo",
      "2026-11-06T03:10:00Z",
      "2026-11-06T03:01:00Z",
      "Hoje",
    ],
    [
      "America/New_York",
      "2026-11-02T05:30:00Z",
      "2026-11-01T04:10:00Z",
      "Ontem",
    ],
    [
      "America/New_York",
      "2026-03-09T04:30:00Z",
      "2026-03-08T05:10:00Z",
      "Ontem",
    ],
  ];
  for (const [TZ, agora, data, titulo] of casos) {
    const codigo = `import{agruparNotificacoes}from${JSON.stringify(modulo)};console.log(agruparNotificacoes([{id:1,criada_em:${JSON.stringify(data)}}],new Date(${JSON.stringify(agora)}))[0].titulo);`;
    const real = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", codigo],
      { env: { ...process.env, TZ }, encoding: "utf8" },
    ).trim();
    assert.equal(real, titulo, `${TZ} ${data}`);
  }
});
