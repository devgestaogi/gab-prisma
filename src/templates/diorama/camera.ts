// Câmera contínua: nunca corta. Cada cena tem uma pose; na troca a câmera voa até a pose nova (~0,9 s) com easing.
import {Easing} from 'remotion';
import type {DadosT} from '../comum';
import {ESPACO, cenaEm, cenasDe, estacoesDe, idxEstacao, zEstacao} from './tipos';
import type {CenaDio} from './tipos';

export type V3 = [number, number, number];
export type Pose = {pos: V3; alvo: V3};
export const DURACAO_VOO = 0.9;

const rad = (g: number) => (g * Math.PI) / 180;
const orbita = (alvo: V3, dist: number, inclinacao: number, giro: number): Pose => ({
  alvo,
  pos: [
    alvo[0] + dist * Math.cos(rad(inclinacao)) * Math.sin(rad(giro)),
    alvo[1] + dist * Math.sin(rad(inclinacao)),
    alvo[2] + dist * Math.cos(rad(inclinacao)) * Math.cos(rad(giro)),
  ],
});

export const poseDaCena = (d: DadosT, c: CenaDio): Pose => {
  const est = estacoesDe(d);
  const k = idxEstacao(est, c.foco);
  const comprimento = Math.max(0, est.length - 1) * ESPACO;
  if (k < 0) return orbita([0, 0, -comprimento / 2 - 3.5], 18 + comprimento * 0.9, 60, -10);
  const z = zEstacao(k);
  const visao = c.visao ?? 'perto';
  const giro = (k % 2 ? 1 : -1) * 15;
  if (visao === 'cima') return orbita([0, 0, z - 1.5], 17, 74, 0);
  if (visao === 'geral') return orbita([0, 0, z - 2], 27, 60, giro * 0.6);
  return orbita([0, 0.6, z - 0.6], 16.5, 50, giro);
};

const mistura = (a: V3, b: V3, e: number): V3 => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const facil = Easing.inOut(Easing.cubic);

export const poseNoTempo = (d: DadosT, t: number): Pose => {
  const cenas = cenasDe(d);
  const i = cenaEm(d, t);
  const atual = poseDaCena(d, cenas[i]);
  let pos = atual.pos;
  let alvo = atual.alvo;
  const dt = t - d.tempo.cenas[i].ini;
  if (i > 0 && dt < DURACAO_VOO) {
    const ant = poseDaCena(d, cenas[i - 1]);
    const e = facil(Math.max(0, dt / DURACAO_VOO));
    pos = mistura(ant.pos, atual.pos, e);
    alvo = mistura(ant.alvo, atual.alvo, e);
    // o voo faz um arco: sobe um pouco no meio do caminho
    const dist = Math.hypot(ant.pos[0] - atual.pos[0], ant.pos[1] - atual.pos[1], ant.pos[2] - atual.pos[2]);
    pos = [pos[0], pos[1] + Math.sin(Math.PI * e) * Math.min(4, dist * 0.1), pos[2]];
  }
  // respiração: a câmera nunca fica parada
  const r = Math.sin(t * 0.55) * 0.22;
  return {pos: [pos[0] + r, pos[1] + Math.cos(t * 0.43) * 0.12, pos[2]], alvo: [alvo[0] - r * 0.4, alvo[1], alvo[2]]};
};

// houve voo na troca para a cena i? (pose diferente da anterior)
export const temVoo = (d: DadosT, i: number) => {
  if (i <= 0) return false;
  const cenas = cenasDe(d);
  const a = poseDaCena(d, cenas[i - 1]);
  const b = poseDaCena(d, cenas[i]);
  return Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) > 1.5;
};
