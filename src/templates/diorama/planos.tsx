// Modo "planos de imagem" do diorama: cada cena mostra uma imagem gerada do assunto e a câmera nunca para.
// Cenas seguidas com a mesma imagem formam um segmento (movimento sem emenda); entre segmentos há um voo através:
// o plano que sai acelera a escala, desfoca e some; o que entra começa menor e desfocado e assenta.
// Tudo é função do quadro absoluto (determinístico, sem estado entre quadros).
import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame, useVideoConfig} from 'remotion';
import {cenasValidas, imagemDoProjeto} from '../comum';
import type {DadosT} from '../comum';
import {FUNDO, cenasDe, layoutDasCenas} from './tipos';
import type {Movimento} from './tipos';

export type Segmento = {src: string; movimento: Movimento; foco: [number, number]; iniF: number; fimF: number};

const SAI = 10; // quadros do voo de saída (termina na troca)
const ENTRA = 10; // quadros da entrada (começa 8 antes da troca, sobrepondo)
const ANTES = 8;

// plano de cada cena do roteiro (mesmo índice): o próprio, senão o anterior, senão o próximo; null sem nenhum plano válido
const planosPorCena = (dados: DadosT) => {
  const cs = cenasDe(dados);
  const proprio = cs.map((c) => (c.plano && imagemDoProjeto(dados.projeto, 'planos', c.plano.imagem) ? c.plano : null));
  const res = proprio.slice();
  let ult: (typeof res)[number] = null;
  res.forEach((p, i) => { if (p) ult = p; else res[i] = ult; });
  let prox: (typeof res)[number] = null;
  for (let i = res.length - 1; i >= 0; i--) { if (res[i]) prox = res[i]; else res[i] = prox; }
  return {res, algum: proprio.some(Boolean)};
};

export const modoImagem = (dados: DadosT): boolean => planosPorCena(dados).algum;

export const segmentosDePlanos = (dados: DadosT, fps: number): Segmento[] => {
  const {res, algum} = planosPorCena(dados);
  if (!algum) return [];
  const segs: Segmento[] = [];
  cenasValidas(dados).forEach((t) => {
    const p = res[t.i];
    if (!p) return;
    const src = imagemDoProjeto(dados.projeto, 'planos', p.imagem);
    if (!src) return;
    const a = Math.round(t.ini * fps);
    const b = Math.max(a + 1, Math.round(t.fim * fps));
    const ult = segs[segs.length - 1];
    if (ult && ult.src === src) ult.fimF = b;
    else segs.push({src, movimento: p.movimento, foco: p.foco, iniF: segs.length ? a : 0, fimF: b});
  });
  return segs;
};

// instantes (quadros) das trocas de segmento, para o som de voo
export const trocasDePlanos = (dados: DadosT, fps: number): number[] => segmentosDePlanos(dados, fps).slice(1).map((s) => s.iniF - ANTES);

const lim = (x: number) => Math.max(0, Math.min(1, x));
const suave = (x: number) => { const t = lim(x); return t * t * (3 - 2 * t); };
// quase linear, com leve easing só nas pontas
const quase = (x: number) => { const t = lim(x); return 0.85 * t + 0.15 * suave(t); };

const camera = (mov: Movimento, e: number, foco: [number, number]) => {
  switch (mov) {
    case 'lateral': return {s: 1.12, x: (e - 0.5) * 0.08, y: 0, r: 0, origem: '50% 50%'};
    case 'sobe': return {s: 1.12, x: 0, y: -(e - 0.5) * 0.08, r: 0, origem: '50% 50%'};
    case 'orbita': return {s: 1.14, x: (e - 0.5) * 0.06, y: -(e - 0.5) * 0.02, r: -1 + e * 2.5, origem: '50% 50%'};
    default: return {s: 1.06 + 0.14 * e, x: 0, y: 0, r: 0, origem: `${foco[0] * 100}% ${foco[1] * 100}%`};
  }
};

const Plano: React.FC<{seg: Segmento; prox: Segmento | undefined; primeiro: boolean}> = ({seg, prox, primeiro}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  // camada de entrada/saída
  let escala = 1, desfoque = 0, opac = 1;
  if (!primeiro) {
    const p = lim((f - (seg.iniF - ANTES)) / ENTRA);
    const e = suave(p);
    escala = 0.92 + 0.08 * e;
    desfoque = 8 * (1 - e);
    opac = suave(p / 0.6);
  }
  if (prox) {
    const T = prox.iniF;
    const p = lim((f - (T - SAI)) / SAI);
    escala *= 1 + 0.25 * p * p;
    desfoque = Math.max(desfoque, 8 * p);
    opac *= 1 - suave((p - 0.3) / 0.7);
  }
  // câmera: progresso pelo quadro absoluto, do início ao fim do segmento (incluindo as sobreposições)
  const a = primeiro ? seg.iniF : seg.iniF - ANTES;
  const b = (prox ? prox.iniF : seg.fimF) + 4;
  const c = camera(seg.movimento, quase((f - a) / Math.max(1, b - a)), seg.foco);
  return (
    <AbsoluteFill style={{opacity: opac, transform: `scale(${escala})`, filter: desfoque > 0.05 ? `blur(${desfoque.toFixed(2)}px)` : undefined, willChange: 'transform, filter, opacity'}}>
      <AbsoluteFill style={{transformOrigin: c.origem, transform: `translate(${(c.x * width).toFixed(2)}px, ${(c.y * height).toFixed(2)}px) rotate(${c.r.toFixed(3)}deg) scale(${c.s.toFixed(4)})`}}>
        <Img src={seg.src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// centro (px) do véu atrás da legenda: acompanha a posição da legenda de cada cena, com troca suave de 8 quadros
const TROCA_VEU = 8;
const centroDoVeu = (marcas: {f: number; c: number}[], f: number) => {
  let k = -1;
  marcas.forEach((m, j) => { if (m.f <= f) k = j; });
  if (k < 0) return marcas.length ? marcas[0].c : 1130;
  const ant = k > 0 ? marcas[k - 1].c : marcas[k].c;
  return ant + (marcas[k].c - ant) * suave((f - marcas[k].f) / TROCA_VEU);
};

export const Planos: React.FC<{dados: DadosT}> = ({dados}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const segs = React.useMemo(() => segmentosDePlanos(dados, fps), [dados, fps]);
  const marcas = React.useMemo(() => {
    const lay = layoutDasCenas(cenasDe(dados));
    return cenasValidas(dados).map((t) => ({f: Math.round(t.ini * fps), c: lay[t.i]?.legenda ?? 1130}));
  }, [dados, fps]);
  const c = Math.round(centroDoVeu(marcas, f));
  return (
    <AbsoluteFill style={{background: FUNDO}}>
      {segs.map((s, k) => {
        // monta um pouco antes (para a imagem carregar) e desmonta depois que saiu
        const ate = (segs[k + 1] ? segs[k + 1].iniF : s.fimF) + 6;
        if (f < s.iniF - ANTES - 30 || f > ate) return null;
        return <Plano key={k} seg={s} prox={segs[k + 1]} primeiro={k === 0} />;
      })}
      {/* vinheta leve nas bordas */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(11,11,13,0) 55%, rgba(11,11,13,0.25) 100%)', pointerEvents: 'none'}} />
      {/* véu suave atrás da faixa da legenda */}
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(11,11,13,0) ${c - 300}px, rgba(11,11,13,0.5) ${c - 110}px, rgba(11,11,13,0.5) ${c + 110}px, rgba(11,11,13,0.22) ${c + 260}px, rgba(11,11,13,0) ${c + 400}px)`, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
