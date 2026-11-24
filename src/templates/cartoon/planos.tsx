// Modo "planos de imagem" do template cartoon: cada cena mostra uma imagem gerada do assunto (personagem 2D de
// contorno grosso dentro de cenário com volume e luz de cinema) e a câmera anda devagar por cima. A imagem substitui
// o set 3D e os personagens SVG; inserts, legenda, vinheta e troca por obstáculo continuam do template.
// Tudo é função do quadro (determinístico, sem Math.random).
import React from 'react';
import {Img} from 'remotion';
import {DadosT, cenasValidas, imagemDoProjeto, numero, objeto, umDe} from '../comum';
import {Insert} from './inserts';
import {clamp, senoide, suave} from './util';

export const MOVIMENTOS = ['push', 'dolly', 'plongee', 'pan'] as const;
export type Mov = (typeof MOVIMENTOS)[number];
export type Plano = {src: string; movimento: Mov; foco: [number, number]};
export type Pos = 'alto' | 'meio' | 'baixo';
export type Layout = {legenda: Pos; insert: Pos; legendaExplicita: boolean; insertExplicito: boolean};

// plano.imagem fica em public/<projeto>/planos/; imagem ausente, inválida ou fora da pasta = sem plano (volta ao set 3D)
export const normPlano = (v: unknown, projeto: string): Plano | null => {
  const o = objeto(v);
  const src = imagemDoProjeto(projeto, 'planos', o.imagem);
  if (!src) return null;
  const f = Array.isArray(o.foco) ? o.foco : [];
  return {
    src,
    movimento: umDe(o.movimento, MOVIMENTOS, 'push'),
    foco: [clamp(numero(f[0], 0.5), 0.1, 0.9), clamp(numero(f[1], 0.45), 0.1, 0.9)],
  };
};

const POS = ['alto', 'meio', 'baixo'] as const;
export const normLayout = (v: unknown): Layout => {
  const o = objeto(v);
  return {
    legenda: umDe(o.legenda, POS, 'meio'),
    insert: umDe(o.insert, POS, 'meio'),
    legendaExplicita: (POS as readonly string[]).includes(o.legenda),
    insertExplicito: (POS as readonly string[]).includes(o.insert),
  };
};

// centro (y) da legenda por posição: tudo dentro da faixa útil 270..1248
export const LEGENDA_Y: Record<Pos, number> = {alto: 600, meio: 1000, baixo: 1150};
// faixa de cada posição do insert (y)
const BANDA_INSERT: Record<Pos, [number, number]> = {alto: [380, 760], meio: [560, 1000], baixo: [760, 1200]};
const TOPO = 270, BASE = 1248;
const METADE_LEGENDA = 92; // meia altura de um bloco de legenda (1 ou 2 linhas de 64 px) mais folga

// medidas naturais de cada insert (topo e altura em y, a 1920) para encaixar na faixa pedida
const naturalDoInsert = (ins: Insert): {topo: number; alt: number} => {
  if (ins.tipo === 'papel') return {topo: 330, alt: 840};
  if (ins.tipo === 'planilha') return {topo: 340, alt: 180 + 76 * Math.max(1, (ins.linhas ?? []).length)};
  return {topo: 310, alt: 930}; // celular com a mão
};

// Onde o insert fica: translação e escala sobre o centro natural. Nunca cobre a legenda: o insert cede.
export const posInsert = (ins: Insert, pos: Pos, legendaY: number): {dy: number; s: number; cy: number} => {
  const nat = naturalDoInsert(ins);
  const cNat = nat.topo + nat.alt / 2;
  const [a, b] = BANDA_INSERT[pos];
  let s = clamp(((b - a) * 1.2) / nat.alt, 0.55, 1);
  let cy = (a + b) / 2;
  const lt = legendaY - METADE_LEGENDA, lb = legendaY + METADE_LEGENDA;
  const ext = () => [cy - (nat.alt * s) / 2, cy + (nat.alt * s) / 2] as const;
  let [t, bt] = ext();
  if (bt > lt - 12 && t < lb + 12) {
    const acima = cy <= legendaY;
    const livre = acima ? lt - 12 - TOPO : BASE - (lb + 12);
    if (livre < nat.alt * s) s = Math.max(0.45, livre / nat.alt);
    cy = acima ? lt - 12 - (nat.alt * s) / 2 : lb + 12 + (nat.alt * s) / 2;
    [t, bt] = ext();
  }
  if (t < TOPO) cy += TOPO - t;
  [t, bt] = ext();
  if (bt > BASE) cy -= bt - BASE;
  return {dy: cy - cNat, s, cy: cNat};
};

// ── sons: um por entrada, nunca dois no mesmo quadro (afasta 3 quadros) ───────────────────────────────────────────
export type SomF = {som: string; f: number; vol: number};
export const espalharSons = (sons: SomF[], folga = 3): SomF[] => {
  const ord = sons.slice().sort((x, y) => x.f - y.f);
  const res: SomF[] = [];
  ord.forEach((s) => {
    let f = s.f;
    const ult = res[res.length - 1];
    if (ult && f - ult.f < folga) f = ult.f + folga;
    res.push({...s, f});
  });
  return res;
};
export const sonsDoInsert = (ins: Insert, entra: number): SomF[] => {
  const l: SomF[] = [{som: 'pop', f: entra + 2, vol: 0.4}];
  if (ins.tipo === 'celular') {
    l.push({som: 'toque', f: entra + 6, vol: 0.35});
    if (ins.notificacao) l.push({som: 'ding', f: entra + 22, vol: 0.45});
  }
  if (ins.tipo === 'papel') l.push({som: 'risco', f: entra + 14, vol: 0.35});
  return espalharSons(l);
};

// ── a imagem com a câmera: sempre andando devagar, sempre cobrindo a tela ─────────────────────────────────────────
const camera = (mov: Mov, e: number, foco: [number, number], f: number) => {
  const resp = {x: senoide(f, 83) * 2.5, y: senoide(f, 61, 9) * 2};
  const lado = foco[0] >= 0.5 ? 1 : -1;
  const o = `${(foco[0] * 100).toFixed(1)}% ${(foco[1] * 100).toFixed(1)}%`;
  switch (mov) {
    case 'dolly': return {tr: `translate(${(lado * (e - 0.5) * 190 + resp.x).toFixed(2)}px,${resp.y.toFixed(2)}px) scale(${(1.2 + 0.05 * e).toFixed(4)})`, o: '50% 50%'};
    case 'plongee': return {tr: `perspective(1700px) translate(${resp.x.toFixed(2)}px,${(-(e - 0.3) * 110 + resp.y).toFixed(2)}px) rotateX(${(e * 2.6).toFixed(3)}deg) scale(${(1.15 + 0.08 * e).toFixed(4)})`, o: '50% 40%'};
    case 'pan': return {tr: `translate(${((0.5 - e) * 210 + resp.x).toFixed(2)}px,${resp.y.toFixed(2)}px) rotate(${((e - 0.5) * 0.8).toFixed(3)}deg) scale(1.22)`, o: '50% 50%'};
    default: return {tr: `translate(${resp.x.toFixed(2)}px,${resp.y.toFixed(2)}px) scale(${(1.1 + 0.17 * e).toFixed(4)})`, o};
  }
};

export const PlanoImagem: React.FC<{plano: Plano; t: number; f: number}> = ({plano, t, f}) => {
  const e = 0.85 * clamp(t) + 0.15 * suave(t); // quase linear, com leve easing nas pontas
  const c = camera(plano.movimento, e, plano.foco, f);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#050608'}}>
      <Img src={plano.src} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: c.tr, transformOrigin: c.o}} />
    </div>
  );
};

// vinheta nas bordas e véu suave atrás da legenda (centro em legendaY); o grão leve vem do template
export const AcabamentoPlano: React.FC<{legendaY: number}> = ({legendaY}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 66% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.6) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: legendaY - 230, height: 460, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(2,3,8,.5) 50%, rgba(0,0,0,0) 100%)'}} />
  </>
);

// Segmentos: cenas seguidas com a mesma imagem e sem `transicao` explícita formam um segmento só, e a câmera continua
// sem salto (movimento e foco da primeira cena, tempo pelo quadro absoluto ao longo do segmento inteiro).
export type Segmento = {iniF: number; fimF: number; plano: Plano};
export const segmentosDePlanos = (dados: DadosT, fps: number): Map<number, Segmento> => {
  const res = new Map<number, Segmento>();
  let atual: Segmento | null = null;
  let ultI = -2;
  cenasValidas(dados).forEach(({i, cena, ini, fim}) => {
    const plano = normPlano(cena.plano, dados.projeto);
    const a = Math.round(ini * fps), b = Math.max(a + 1, Math.round(fim * fps));
    if (!plano) { atual = null; ultI = i; return; }
    const explicita = cena.transicao !== undefined && cena.transicao !== null;
    if (atual && ultI === i - 1 && atual.plano.src === plano.src && !explicita) atual.fimF = b;
    else atual = {iniF: a, fimF: b, plano};
    res.set(i, atual);
    ultI = i;
  });
  return res;
};
