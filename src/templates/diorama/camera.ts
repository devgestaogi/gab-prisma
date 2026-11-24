// Câmera contínua: nunca corta. Cada cena tem uma pose; na troca a câmera voa até a pose nova (~0,9 s) com easing.
import {Easing} from 'remotion';
import type {CenaTempo, DadosT} from '../comum';
import {ESPACO, idxEstacao, normCena, planejamentoDe, zEstacao} from './tipos';
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
  const {est} = planejamentoDe(d);
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

// pose (sem respiração) no instante t dentro da cena válida k: o voo parte da pose que a cena anterior
// realmente alcançou na fronteira (pelo tempo absoluto), não da pose final dela, se ela era curta demais
const poseVoo = (d: DadosT, v: CenaTempo[], cs: CenaDio[], k: number, t: number): Pose => {
  const atual = poseDaCena(d, cs[v[k].i]);
  const dt = t - v[k].ini;
  if (k <= 0 || dt >= DURACAO_VOO) return atual;
  const ant = poseVoo(d, v, cs, k - 1, v[k].ini);
  const e = facil(Math.max(0, dt / DURACAO_VOO));
  const pos = mistura(ant.pos, atual.pos, e);
  // o voo faz um arco: sobe um pouco no meio do caminho
  const dist = Math.hypot(ant.pos[0] - atual.pos[0], ant.pos[1] - atual.pos[1], ant.pos[2] - atual.pos[2]);
  return {pos: [pos[0], pos[1] + Math.sin(Math.PI * e) * Math.min(4, dist * 0.1), pos[2]], alvo: mistura(ant.alvo, atual.alvo, e)};
};

export const poseNoTempo = (d: DadosT, t: number): Pose => {
  const {validas: v, cenas} = planejamentoDe(d);
  let base: Pose;
  if (!v.length) base = poseDaCena(d, normCena({})); // palco vazio: visão geral
  else {
    let k = 0;
    v.forEach((c, j) => { if (c.ini <= t + 1e-6) k = j; });
    base = poseVoo(d, v, cenas, k, t);
  }
  // respiração: a câmera nunca fica parada
  const r = Math.sin(t * 0.55) * 0.22;
  return {pos: [base.pos[0] + r, base.pos[1] + Math.cos(t * 0.43) * 0.12, base.pos[2]], alvo: [base.alvo[0] - r * 0.4, base.alvo[1], base.alvo[2]]};
};

// instantes (s) em que a câmera voa de verdade (pose diferente da cena válida anterior)
export const temposDeVoo = (d: DadosT): number[] => {
  const {validas: v, cenas: cs} = planejamentoDe(d);
  return v.filter((c, k) => {
    if (k === 0) return false;
    const a = poseDaCena(d, cs[v[k - 1].i]);
    const b = poseDaCena(d, cs[c.i]);
    return Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) > 1.5;
  }).map((c) => c.ini);
};
