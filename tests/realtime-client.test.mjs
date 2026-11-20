import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/services/api") {
      return {
        url: new URL("./fixtures/realtime-api.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});
const { createRealtimeClient, validarEventoRealtime, construirUrlRealtime } =
  await import("../src/services/realtime.js");
after(() => hook.deregister());

const flush = () => new Promise(resolve => setImmediate(resolve));
let serial = 0;
function evento(extra = {}) {
  serial += 1;
  return {
    v: 1, tipo: "pedido.atualizado",
    event_id: serial.toString(16).padStart(32, "0"),
    emitido_em: "2026-11-19T20:00:00+00:00",
    pedido_id: 8, ...extra,
  };
}
function controle({
  ativo = true, credencial = "jwt-secreto",
  endpoint = "https://backend.example/api",
} = {}) {
  let sessao = 12;
  let token = credencial;
  let emissao = 0;
  const sockets = [];
  const temporizadores = new Map();
  const trocas = new Set();
  const chamadas = [];
  let proximoTimer = 1;
  const http = {
    defaults: { baseURL: endpoint },
    post: async (url, corpo) => {
      chamadas.push({ url, corpo });
      emissao += 1;
      return { data: {
        protocol: "pires.v1", ws_path: "/ws/v1/events/",
        ticket: String(emissao).repeat(43), expires_in: 45,
      } };
    },
  };
  const timer = (fn, ms) => {
    const id = proximoTimer++;
    temporizadores.set(id, { fn, ms });
    return id;
  };
  const pararTimer = id => temporizadores.delete(id);
  const socketFactory = (url, protocols) => {
    const socket = {
      url, protocols, protocol: "pires.v1", closed: false,
      open() { this.onopen?.({}); },
      message(data) { this.onmessage?.({ data: JSON.stringify(data) }); },
      close() { this.closed = true; this.onclose?.({}); },
    };
    sockets.push(socket);
    return socket;
  };
  const client = createRealtimeClient({
    enabled: ativo, http, getVersion: () => sessao, getToken: () => token,
    onSessionChange: fn => {
      trocas.add(fn);
      return () => trocas.delete(fn);
    },
    socketFactory, schedule: timer, unschedule: pararTimer,
    random: () => 0.5, origin: () => "https://site.example",
  });
  return {
    client, sockets, temporizadores, chamadas,
    async proximoTimer() {
      const [id, { fn }] = temporizadores.entries().next().value || [];
      if (id == null) throw Error("Sem timer agendado");
      temporizadores.delete(id);
      fn();
      await flush();
    },
    trocarSessao() {
      sessao += 1;
      for (const notify of [...trocas]) notify();
    },
    semToken() { token = null; },
  };
}

test("realtime desligado não busca ticket nem abre conexão", async () => {
  const sim = controle({ ativo: false });
  assert.equal(sim.client.iniciar(), false);
  await flush();
  assert.equal(sim.sockets.length, 0);
  assert.equal(sim.chamadas.length, 0);
  assert.equal(sim.client.estado, "desativado");
});

test("token de acesso fica na camada HTTP; WS recebe somente ticket temporário", async () => {
  const sim = controle();
  assert.equal(sim.client.iniciar(), true);
  await flush();
  assert.deepEqual(sim.chamadas, [{ url: "/realtime/ticket/", corpo: null }]);
  assert.equal(sim.sockets.length, 1);
  const socket = sim.sockets[0];
  assert.equal(socket.url, "wss://backend.example/ws/v1/events/");
  assert.equal(socket.protocols[0], "pires.v1");
  assert.ok(socket.protocols[1].startsWith("pires.ticket."));
  assert.ok(!socket.url.includes("jwt-secreto"));
  assert.ok(!socket.protocols.join(",").includes("jwt-secreto"));
  socket.open();
  assert.equal(sim.client.estado, "conectado");
  sim.client.parar();
  assert.equal(socket.closed, true);
  assert.equal(sim.client.estado, "parado");
});

test("conexão envia resync e ignora duplicatas, payload extra e eventos inválidos", async () => {
  const sim = controle(), eventos = [];
  sim.client.inscrever(value => eventos.push(value));
  sim.client.iniciar();
  await flush();
  const socket = sim.sockets[0];
  socket.open();
  assert.deepEqual(eventos, [null]);
  const pedido = evento({ texto: "DADO PRIVADO", token: "NUNCA" });
  socket.message(pedido);
  socket.message(pedido);
  socket.message(evento({ v: 2 }));
  socket.message({ ...pedido, event_id: "INCOMPLETO" });
  assert.equal(eventos.length, 2);
  assert.equal(eventos[1].tipo, "pedido.atualizado");
  assert.equal(eventos[1].pedido_id, 8);
  assert.equal(eventos[1].texto, undefined);
  assert.equal(eventos[1].token, undefined);
  sim.client.parar();
});

test("troca de sessão fecha WS e descarta eventos antigos", async () => {
  const sim = controle(), eventos = [];
  sim.client.inscrever(value => eventos.push(value));
  sim.client.iniciar();
  await flush();
  const socket = sim.sockets[0];
  socket.open();
  sim.trocarSessao();
  assert.equal(sim.client.estado, "parado");
  assert.equal(socket.closed, true);
  socket.message(evento());
  assert.deepEqual(eventos, [null]);
  assert.equal(sim.temporizadores.size, 0);
});

test("queda da conexão solicita novo ticket após backoff; conexões antigas ficam inertes", async () => {
  const sim = controle();
  sim.client.iniciar();
  await flush();
  const socketAntigo = sim.sockets[0];
  socketAntigo.open();
  socketAntigo.close();
  assert.equal(sim.client.estado, "reconectando");
  assert.equal(sim.temporizadores.size, 1);
  await sim.proximoTimer();
  assert.equal(sim.chamadas.length, 2);
  assert.equal(sim.sockets.length, 2);
  assert.notEqual(sim.sockets[0].protocols[1], sim.sockets[1].protocols[1]);
  sim.sockets[1].open();
  assert.equal(sim.client.estado, "conectado");
  sim.client.parar();
});

test("falha no ticket preserva a aplicação e agenda nova tentativa", async () => {
  const sim = controle({ endpoint: "http://backend.example/api" });
  sim.client.iniciar();
  await flush();
  assert.equal(sim.sockets.length, 0);
  assert.equal(sim.client.estado, "reconectando");
  assert.equal(sim.temporizadores.size, 1);
  sim.client.parar();
  assert.equal(sim.temporizadores.size, 0);
});

test("URL validada força WSS e só aceita HTTP local", () => {
  assert.equal(
    construirUrlRealtime("https://backend.example/api"),
    "wss://backend.example/ws/v1/events/",
  );
  assert.equal(
    construirUrlRealtime("http://127.0.0.1:8000/api"),
    "ws://127.0.0.1:8000/ws/v1/events/",
  );
  assert.throws(() => construirUrlRealtime("http://backend.example/api"), /TLS/);
  assert.throws(() => construirUrlRealtime("https://backend.example/api", "/ws/espia/"), /Caminho/);
  assert.throws(() => construirUrlRealtime("ftp://backend.example/api"), /Protocolo/);
});

test("tipos e ids inválidos não passam para as stores", () => {
  assert.equal(validarEventoRealtime({ ...evento(), tipo: "cliente.todos" }), null);
  assert.equal(validarEventoRealtime({ ...evento(), pedido_id: -1 }), null);
  assert.equal(validarEventoRealtime({ ...evento(), event_id: "x" }), null);
  assert.equal(validarEventoRealtime({ ...evento(), emitido_em: "invalido" }), null);
  assert.equal(validarEventoRealtime({ ...evento(), v: 3 }), null);
});
