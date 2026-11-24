// Modo "planos de imagem" do vetor: o cenário da cena é uma ilustração vetorial chapada gerada do assunto.
// Palco quase parado (zoom de 2 a 4% e pan curto, só o suficiente para a imagem respirar), corte seco entre cenas
// (cada cena é uma Sequence) e véu escuro suave atrás da legenda. Determinístico por quadro.
import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame} from 'remotion';
import {cenasValidas, imagemDoProjeto} from '../comum';
import type {DadosT} from '../comum';
import {normalizaCena} from './normaliza';
import {PlanoRot, limita} from './util';

// Cenas seguidas com a mesma imagem formam um segmento: a deriva corre pelo quadro absoluto ao longo dele, com movimento e foco da
// primeira cena do segmento. offset = quadros do início do segmento até o início desta cena; total = duração do segmento.
export const segmentoDoPlano = (dados: DadosT, fps: number, i: number) => {
  const v = cenasValidas(dados).map((t) => {
    const c = normalizaCena(t.cena);
    const a = Math.round(t.ini * fps);
    return {i: t.i, plano: c.plano, src: c.plano ? imagemDoProjeto(dados.projeto, 'planos', c.plano.imagem) : null, a, b: Math.max(a + 1, Math.round(t.fim * fps))};
  });
  const k = v.findIndex((x) => x.i === i);
  if (k < 0 || !v[k].src || !v[k].plano) return null;
  let p = k, u = k;
  while (p > 0 && v[p - 1].src === v[k].src) p--;
  while (u < v.length - 1 && v[u + 1].src === v[k].src) u++;
  return {src: v[k].src as string, plano: v[p].plano as PlanoRot, offset: v[k].a - v[p].a, total: v[u].b - v[p].a};
};

// escala sempre cobre a deriva: a sobra de cada lado (escala-1)*lado é maior que o pan
const deriva = (mov: PlanoRot['movimento'], t: number) => {
  switch (mov) {
    case 'zoom': return {s: 1.01 + 0.04 * t, x: 0, y: 0};
    case 'pan': return {s: 1.05, x: (t - 0.5) * 52, y: 0};
    default: return {s: 1.03 + 0.015 * t, x: (t - 0.5) * 28, y: (0.5 - t) * 20};
  }
};

export const PlanoImagem: React.FC<{src: string; plano: PlanoRot; offset: number; total: number}> = ({src, plano, offset, total}) => {
  const f = useCurrentFrame();
  const t = limita((f + offset) / Math.max(1, total), 0, 1);
  const d = deriva(plano.movimento, t);
  const [fx, fy] = plano.foco;
  return (
    <AbsoluteFill style={{background: '#10142B', overflow: 'hidden'}}>
      <AbsoluteFill style={{transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${d.s.toFixed(4)})`}}>
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// véu escuro em degradê atrás da legenda, para ler sobre qualquer ilustração
export const VeuLegenda: React.FC<{centro: number}> = ({centro}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `linear-gradient(180deg, rgba(6,8,20,0) ${centro - 290}px, rgba(6,8,20,0.58) ${centro - 115}px, rgba(6,8,20,0.58) ${centro + 115}px, rgba(6,8,20,0) ${centro + 290}px)`}} />
);
