import { readFileSync } from 'node:fs';
import { ref, computed, watch, nextTick, shallowRef, effectScope } from 'vue';

export function executarScript(caminho, dependencias, expor) {
  const fonte = readFileSync(new URL(`../../src/${caminho}`, import.meta.url), 'utf8');
  const script = fonte.match(/<script setup>([\s\S]*?)<\/script>/)[1]
    .replace(/^import\s[\s\S]*?;\s*/gm, '');
  const desmontar = [];
  const contexto = { ref, computed, watch, nextTick, shallowRef, useTemplateRef: () => ref(null), onMounted() {}, onBeforeUnmount: fn => desmontar.push(fn), ...dependencias };
  const escopo = effectScope();
  const resultado = escopo.run(() => new Function(...Object.keys(contexto), `${script}\nreturn { ${expor.join(',')} };`)(...Object.values(contexto)));
  return { ...resultado, desmontar: () => { desmontar.forEach(fn => fn()); escopo.stop(); } };
}
export function carregarComposable(caminho, nome, dependencias) {
  const fonte = readFileSync(new URL(`../../src/${caminho}`, import.meta.url), 'utf8')
    .replace(/^import\s[\s\S]*?;\s*/gm, '').replace(/^export\s+/gm, '');
  const contexto = { ref, computed, watch, nextTick, shallowRef, onMounted() {}, onBeforeUnmount() {}, ...dependencias };
  return new Function(...Object.keys(contexto), `${fonte}\nreturn ${nome};`)(...Object.values(contexto));
}
export const adiar = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
