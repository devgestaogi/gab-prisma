// Modo "planos de imagem" do template cartoon: cada cena mostra uma imagem gerada do assunto (personagem 2D de
// contorno grosso dentro de cenário com volume e luz de cinema) e a câmera anda devagar por cima. A imagem substitui
// o set 3D e os personagens SVG; inserts, legenda, vinheta e troca por obstáculo continuam do template.
// Tudo é função do quadro (determinístico, sem Math.random).
import React from 'react';
import {Img} from 'remotion';
import {EventoSom, SegmentoPlano, objeto, umDe} from '../comum';
import {Insert} from './inserts';
import {clamp, senoide, suave} from './util';

export const MOVIMENTOS = ['push', 'dolly', 'plongee', 'pan'] as const;
export type Mov = (typeof MOVIMENTOS)[number];
export type Pos = 'alto' | 'meio' | 'baixo';
export type Layout = {legenda: Pos; insert: Pos; legendaExplicita: boolean; insertExplicito: boolean};

// Normalização, herança, existência da imagem e segmentos são do mecanismo comum (../comum): normPlano e
// segmentosDePlanos. Aqui ficam só a câmera, o layout e o encaixe do insert.
export const SEGMENTOS = {movimentos: MOVIMENTOS, padrao: 'push' as Mov};

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

// Onde o insert fica: translação e escala sobre o centro natural. A legenda sempre manda; o insert cede, nesta ordem:
//  1. a faixa pedida, na escala da faixa; 2. a outra região livre (acima ou abaixo da legenda), na mesma escala;
//  3. só então reduz a escala (piso de 45%), na região onde ela fica maior; 4. se nem 45% cabe, fica menor ainda no canto
//  livre (piso de 25%); 5. se nem isso, `oculto` (o chamador não desenha o insert nem toca o som dele).
// Cada passo é validado contra a zona da legenda: o resultado nunca invade a legenda nem sai de 270..1248.
const MIN_ESCALA = 0.45, MIN_CANTO = 0.25, FOLGA = 12;
export const posInsert = (ins: Insert, pos: Pos, legendaY: number): {dy: number; s: number; cy: number; oculto: boolean} => {
  const nat = naturalDoInsert(ins);
  const cNat = nat.topo + nat.alt / 2;
  const [a, b] = BANDA_INSERT[pos];
  const s0 = clamp(((b - a) * 1.2) / nat.alt, 0.55, 1);
  const cy0 = (a + b) / 2;
  const lt = legendaY - METADE_LEGENDA - FOLGA, lb = legendaY + METADE_LEGENDA + FOLGA;
  // regiões livres, a da faixa pedida primeiro
  const regioes = ([[TOPO, Math.min(lt, BASE)], [Math.max(lb, TOPO), BASE]] as [number, number][]).filter(([x, y]) => y - x > 1);
  regioes.sort((r, q) => Math.abs(clamp(cy0, r[0], r[1]) - cy0) - Math.abs(clamp(cy0, q[0], q[1]) - cy0));
  const coloca = (r: [number, number], s: number) => {
    const h = nat.alt * s;
    const cy = clamp(cy0, r[0] + h / 2, r[1] - h / 2);
    return {dy: cy - cNat, s, cy: cNat, oculto: false};
  };
  const cabe = (r: [number, number], s: number) => nat.alt * s <= r[1] - r[0] + 1e-6;
  for (const r of regioes) if (cabe(r, s0)) return coloca(r, s0);
  // nenhuma comporta a escala da faixa: a que dá maior escala (empate: a da faixa pedida)
  let melhor: [number, number] | null = null, sMax = 0;
  for (const r of regioes) { const m = Math.min(s0, (r[1] - r[0]) / nat.alt); if (m > sMax + 1e-9) { sMax = m; melhor = r; } }
  if (melhor && sMax >= MIN_CANTO) return coloca(melhor, sMax);
  return {dy: 0, s: 0, cy: cNat, oculto: true};
};

// ── sons do insert (eventos crus em quadros da cena; quem agenda é o agendaDeSons comum, para o vídeo inteiro) ──────
export const sonsDoInsert = (ins: Insert, entra: number, planos: boolean): EventoSom[] => {
  if (!planos) {
    if (ins.tipo === 'celular') return [{f: entra + 2, som: 'toque', vol: 0.45}, ...(ins.notificacao ? [{f: entra + 22, som: 'ding', vol: 0.5}] : [])];
    if (ins.tipo === 'papel') return [{f: entra + 14, som: 'risco', vol: 0.4}];
    return [{f: entra + 12, som: 'pop', vol: 0.4}];
  }
  const l: EventoSom[] = [{f: entra + 2, som: 'pop', vol: 0.4}];
  if (ins.tipo === 'celular') {
    l.push({f: entra + 6, som: 'toque', vol: 0.35});
    if (ins.notificacao) l.push({f: entra + 22, som: 'ding', vol: 0.45});
  }
  if (ins.tipo === 'papel') l.push({f: entra + 14, som: 'risco', vol: 0.35});
  return l;
};

// ── a imagem com a câmera: sempre andando devagar, sempre cobrindo a tela ─────────────────────────────────────────
const camera = (mov: Mov, e: number, foco: [number, number], f: number) => {
  const resp = {x: senoide(f, 83) * 2.5, y: senoide(f, 61, 9) * 2};
  const fx = clamp(foco[0], 0.1, 0.9), fy = clamp(foco[1], 0.1, 0.9);
  const lado = fx >= 0.5 ? 1 : -1;
  const o = `${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%`;
  switch (mov) {
    case 'dolly': return {tr: `translate(${(lado * (e - 0.5) * 190 + resp.x).toFixed(2)}px,${resp.y.toFixed(2)}px) scale(${(1.2 + 0.05 * e).toFixed(4)})`, o: '50% 50%'};
    case 'plongee': return {tr: `perspective(1700px) translate(${resp.x.toFixed(2)}px,${(-(e - 0.3) * 110 + resp.y).toFixed(2)}px) rotateX(${(e * 2.6).toFixed(3)}deg) scale(${(1.15 + 0.08 * e).toFixed(4)})`, o: '50% 40%'};
    case 'pan': return {tr: `translate(${((0.5 - e) * 210 + resp.x).toFixed(2)}px,${resp.y.toFixed(2)}px) rotate(${((e - 0.5) * 0.8).toFixed(3)}deg) scale(1.22)`, o: '50% 50%'};
    default: return {tr: `translate(${resp.x.toFixed(2)}px,${resp.y.toFixed(2)}px) scale(${(1.1 + 0.17 * e).toFixed(4)})`, o};
  }
};

export const PlanoImagem: React.FC<{plano: SegmentoPlano<Mov>; t: number; f: number}> = ({plano, t, f}) => {
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
