// Modo "planos de imagem" do vetor: o cenário da cena é uma ilustração vetorial chapada gerada do assunto.
// Palco quase parado (zoom de 2 a 4% e pan curto, só o suficiente para a imagem respirar), corte seco entre imagens
// e véu escuro suave atrás da legenda. Determinístico por quadro.
// A imagem vive numa camada por SEGMENTO (cenas seguidas com a mesma imagem, de `segmentosDePlanos` da comum), montada em
// Vetor.tsx numa Sequence do segmento inteiro: o Img não remonta na fronteira entre cenas do mesmo segmento.
import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {A, L, limita} from './util';

export const MOVIMENTOS = ['deriva', 'zoom', 'pan'] as const;
export type Movimento = (typeof MOVIMENTOS)[number];

// trajeto da câmera: escala e deslocamento CENTRADO em zero (varia ±amp/2). A amplitude total por eixo é `AMP`.
const AMP: Record<Movimento, {x: number; y: number}> = {deriva: {x: 28, y: 20}, zoom: {x: 0, y: 0}, pan: {x: 52, y: 0}};
const SMIN: Record<Movimento, number> = {deriva: 1.03, zoom: 1.01, pan: 1.05};
const trajeto = (mov: Movimento, t: number) => {
  switch (mov) {
    case 'zoom': return {s: 1.01 + 0.04 * t, x: 0, y: 0};
    case 'pan': return {s: 1.05, x: (t - 0.5) * 52, y: 0};
    default: return {s: 1.03 + 0.015 * t, x: (t - 0.5) * 28, y: (0.5 - t) * 20};
  }
};

// A câmera nunca descobre borda. Com origem da escala em (ox, oy) (o foco), uma escala s cobre o quadro se o deslocamento d fica em
// [-(lado-o)(s-1), o(s-1)] por eixo. Calcula-se a escala mínima que comporta a amplitude do movimento (1 + amp/lado) e o centro do
// trajeto é empurrado para dentro desse intervalo (foco 0 ou 1 recua o pan para o lado que tem sobra). O intervalo só cresce com s,
// então o cálculo na escala mínima vale para o movimento todo.
const centroDentro = (amp: number, lado: number, o: number, s: number) => {
  const lo = -(lado - o) * (s - 1), hi = o * (s - 1);
  return Math.min(Math.max(0, lo + amp / 2), hi - amp / 2);
};
export const camera = (mov: Movimento, foco: [number, number], t: number) => {
  const a = AMP[mov];
  const sMin = Math.max(SMIN[mov], 1 + a.x / L, 1 + a.y / A);
  const d = trajeto(mov, t);
  const s = Math.max(d.s, sMin);
  const ox = foco[0] * L, oy = foco[1] * A;
  return {s, x: centroDentro(a.x, L, ox, sMin) + d.x, y: centroDentro(a.y, A, oy, sMin) + d.y};
};

// `total` = duração do segmento em quadros; o Sequence do segmento zera useCurrentFrame no início dele
export const PlanoImagem: React.FC<{src: string; movimento: Movimento; foco: [number, number]; total: number}> = ({src, movimento, foco, total}) => {
  const f = useCurrentFrame();
  const t = limita(f / Math.max(1, total), 0, 1);
  const c = camera(movimento, foco, t);
  const [fx, fy] = foco;
  return (
    <AbsoluteFill style={{background: '#10142B', overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px) scale(${c.s.toFixed(4)})`}}>
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// véu escuro em degradê atrás da legenda, para ler sobre qualquer ilustração
export const VeuLegenda: React.FC<{centro: number}> = ({centro}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `linear-gradient(180deg, rgba(6,8,20,0) ${centro - 290}px, rgba(6,8,20,0.58) ${centro - 115}px, rgba(6,8,20,0.58) ${centro + 115}px, rgba(6,8,20,0) ${centro + 290}px)`}} />
);
