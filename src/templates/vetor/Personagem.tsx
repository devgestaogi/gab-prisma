// Personagens procedurais em SVG: pessoa de cabeça grande, com contorno preto grosso ("contorno") ou liso com sombreado ("liso").
// Origem do desenho = centro dos pés; a altura total é ~440 px na escala 1. Tudo é função do quadro.
import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {CHAO, PersonagemRot, TINTA, tom, limita, saida} from './util';

type Perfil = {pele: string; cabelo: string; estiloCabelo: 'curto' | 'comprido' | 'topete'; roupa: 'social' | 'polo' | 'moletom'; cor: string; calca: string; oculos: boolean; cracha: boolean; gravata?: string; sapato: string};
const PERFIS: Record<string, Perfil> = {
  dono: {pele: '#F0BE96', cabelo: '#2B2118', estiloCabelo: 'curto', roupa: 'social', cor: '#BFD9F0', calca: '#2C3856', oculos: true, cracha: true, gravata: '#26324F', sapato: '#1B1B22'},
  funcionaria: {pele: '#C98E63', cabelo: '#3B2416', estiloCabelo: 'comprido', roupa: 'polo', cor: '#2FA89A', calca: '#3C4252', oculos: false, cracha: true, sapato: '#2A2A30'},
  funcionario: {pele: '#8D5A3B', cabelo: '#1B1410', estiloCabelo: 'curto', roupa: 'polo', cor: '#E5644E', calca: '#33384A', oculos: false, cracha: true, sapato: '#2A2A30'},
  cliente: {pele: '#E2A97E', cabelo: '#6B3F1D', estiloCabelo: 'topete', roupa: 'moletom', cor: '#7C5CC4', calca: '#3A3F4F', oculos: false, cracha: false, sapato: '#EDEDED'},
};

export const perfilDe = (p: PersonagemRot): Perfil => {
  const b = PERFIS[p.tipo ?? 'dono'] ?? PERFIS.dono;
  return {...b, roupa: p.roupa ?? b.roupa, cor: p.cor ?? b.cor, pele: p.pele ?? b.pele, cabelo: p.cabelo ?? b.cabelo, oculos: p.oculos ?? b.oculos, cracha: p.cracha ?? b.cracha};
};

// posição (na tela) do alto da cabeça e do rosto, para o balão apontar
export const cabecaDe = (p: PersonagemRot) => {
  const e = p.escala ?? 1;
  return {x: p.x, topo: (p.y ?? CHAO) - 440 * e, rosto: (p.y ?? CHAO) - 335 * e};
};

const Olho: React.FC<{cx: number; rx: number; ry: number; pupila: number; dx: number; dy: number; piscando: boolean; contorno: boolean}> = ({cx, rx, ry, pupila, dx, dy, piscando, contorno}) => {
  const cy = -338;
  if (piscando) return <path d={`M ${cx - rx} ${cy} Q ${cx} ${cy + 8} ${cx + rx} ${cy}`} fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={contorno ? TINTA : tom('#9AA0AE', -0.1)} strokeWidth={contorno ? 5 : 2} />
      <circle cx={cx + dx} cy={cy + dy} r={pupila} fill="#1B1B22" />
      <circle cx={cx + dx - pupila * 0.35} cy={cy + dy - pupila * 0.4} r={pupila * 0.3} fill="#fff" />
    </g>
  );
};

const Corpo: React.FC<{perfil: Perfil; expressao: string; contorno: boolean; anim: string; f: number; olha: number}> = ({perfil: P, expressao, contorno, anim, f, olha}) => {
  const S = contorno ? {stroke: TINTA, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const} : {};
  const sombraPele = tom(P.pele, -0.14);
  const sombraRoupa = tom(P.cor, -0.18);
  const cor = P.cor;
  const caminha = anim === 'anda';
  const fase = f * 0.3;
  const perna = caminha ? Math.sin(fase) * 28 : 0;
  const bracoE = caminha ? -Math.sin(fase) * 26 : 2;
  const bracoD = caminha ? Math.sin(fase) * 26 : -2;
  const aceno = anim === 'aceno';
  const aponta = anim === 'aponta';
  const bD = aceno ? -158 + Math.sin(f * 0.55) * 18 : aponta ? -88 + Math.sin(f * 0.2) * 3 : bracoD;
  const piscando = (f + 17) % 96 < 3;
  const susto = expressao === 'susto', bravo = expressao === 'bravo', feliz = expressao === 'feliz', preoc = expressao === 'preocupado';
  const ry = susto ? 30 : bravo ? 19 : 24;
  const rx = susto ? 24 : 20;
  const pup = susto ? 5 : feliz ? 10 : 9;
  const dx = Math.sin(olha) * 6;
  const dy = preoc ? 3 : 1;
  const braco = (lado: 1 | -1, ang: number) => (
    <g transform={`translate(${lado * 66} -232) rotate(${ang})`}>
      <rect x={-17} y={-6} width={34} height={104} rx={17} fill={P.roupa === 'social' ? cor : cor} {...S} />
      {!contorno && <rect x={lado === 1 ? 3 : -17} y={-6} width={14} height={104} rx={7} fill={sombraRoupa} opacity={0.5} />}
      {P.roupa === 'social' && <rect x={-17} y={78} width={34} height={22} rx={10} fill="#fff" {...S} />}
      <circle cx={0} cy={108} r={21} fill={P.pele} {...S} />
    </g>
  );
  const cabeloTras = P.estiloCabelo === 'comprido' ? <path d="M -106 -330 C -118 -486 118 -486 106 -330 L 112 -212 Q 0 -190 -112 -212 Z" fill={P.cabelo} {...S} /> : null;
  const cabeloFrente =
    P.estiloCabelo === 'comprido' ? <path d="M -100 -345 C -100 -478 104 -478 100 -345 C 80 -378 36 -398 -24 -394 C -60 -388 -86 -374 -100 -345 Z" fill={P.cabelo} {...S} />
    : P.estiloCabelo === 'topete' ? <path d="M -102 -338 C -116 -486 108 -496 102 -338 C 90 -376 60 -394 20 -396 C 30 -424 -20 -436 -40 -406 C -70 -394 -92 -374 -102 -338 Z" fill={P.cabelo} {...S} />
    : <path d="M -104 -338 C -112 -490 112 -490 104 -338 C 92 -382 50 -398 0 -398 C -50 -398 -92 -382 -104 -338 Z" fill={P.cabelo} {...S} />;
  const sobr = (l: [number, number, number, number], r: [number, number, number, number], grosso = 8) => (
    <g stroke={tom(P.cabelo, -0.1)} strokeWidth={grosso} strokeLinecap="round" fill="none">
      <path d={`M ${l[0]} ${l[1]} L ${l[2]} ${l[3]}`} /><path d={`M ${r[0]} ${r[1]} L ${r[2]} ${r[3]}`} />
    </g>
  );
  const sobrancelhas =
    expressao === 'preocupado' ? sobr([-60, -372, -16, -388], [16, -388, 60, -372])
    : expressao === 'bravo' ? sobr([-60, -392, -14, -372], [14, -372, 60, -392], 10)
    : expressao === 'susto' ? sobr([-58, -398, -18, -400], [18, -400, 58, -398])
    : expressao === 'feliz' ? <g stroke={tom(P.cabelo, -0.1)} strokeWidth={8} strokeLinecap="round" fill="none"><path d="M -58 -378 Q -38 -392 -16 -380" /><path d="M 16 -380 Q 38 -392 58 -378" /></g>
    : sobr([-58, -378, -16, -380], [16, -380, 58, -378]);
  const boca =
    expressao === 'feliz' ? <g><path d="M -36 -304 Q 0 -256 36 -304 Z" fill="#7A2330" stroke={contorno ? TINTA : 'none'} strokeWidth={5} strokeLinejoin="round" /><path d="M -30 -304 L 30 -304 Q 26 -292 0 -292 Q -26 -292 -30 -304 Z" fill="#fff" /><path d="M -18 -276 Q 0 -288 18 -276 Q 0 -262 -18 -276 Z" fill="#E5647A" /></g>
    : expressao === 'preocupado' ? <path d="M -24 -294 Q -12 -306 0 -294 Q 12 -282 24 -294" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
    : expressao === 'bravo' ? <path d="M -28 -288 Q 0 -314 28 -288" fill="none" stroke={TINTA} strokeWidth={7} strokeLinecap="round" />
    : expressao === 'susto' ? <ellipse cx={0} cy={-286} rx={17} ry={26} fill="#5A1A26" stroke={contorno ? TINTA : 'none'} strokeWidth={5} />
    : <path d="M -22 -296 Q 0 -288 22 -296" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />;
  return (
    <g>
      {/* pernas */}
      {[-1, 1].map((l) => (
        <g key={l} transform={`rotate(${l * perna} ${l * 27} -128)`}>
          <rect x={l * 27 - 20} y={-132} width={40} height={112} rx={14} fill={P.calca} {...S} />
          <path d={`M ${l * 27 - 24} -22 q 0 -12 24 -12 q 28 0 34 12 q 4 18 -8 20 l -48 0 q -10 -2 -2 -20 z`} fill={P.sapato} {...S} transform={`translate(${l === 1 ? 4 : -4} 0)`} />
        </g>
      ))}
      {braco(-1, bracoE)}
      {/* tronco */}
      <path d="M -62 -236 Q -62 -254 -42 -254 L 42 -254 Q 62 -254 62 -236 L 66 -122 Q 0 -108 -66 -122 Z" fill={cor} {...S} />
      {!contorno && <path d="M 34 -254 L 42 -254 Q 62 -254 62 -236 L 66 -122 Q 50 -118 36 -118 Z" fill={sombraRoupa} opacity={0.45} />}
      <rect x={-68} y={-138} width={136} height={20} rx={8} fill={P.calca} {...S} />
      {P.roupa === 'social' && (
        <g>
          <path d="M -26 -254 L 0 -216 L 26 -254 Z" fill="#fff" {...S} />
          <path d="M -8 -226 L 8 -226 L 14 -150 L 0 -138 L -14 -150 Z" fill={P.gravata ?? '#26324F'} {...S} />
          <path d="M -12 -250 L 0 -236 L 12 -250 L 8 -228 L -8 -228 Z" fill={P.gravata ?? '#26324F'} {...S} />
          {[-190, -172].map((y) => null)}
        </g>
      )}
      {P.roupa === 'polo' && (
        <g>
          <path d="M -30 -254 L -6 -232 L 0 -254 Z" fill={tom(cor, 0.25)} {...S} /><path d="M 30 -254 L 6 -232 L 0 -254 Z" fill={tom(cor, 0.25)} {...S} />
          <line x1={0} y1={-232} x2={0} y2={-190} stroke={contorno ? TINTA : sombraRoupa} strokeWidth={contorno ? 4 : 3} />
        </g>
      )}
      {P.roupa === 'moletom' && (
        <g>
          <path d="M -34 -254 Q 0 -216 34 -254" fill={tom(cor, -0.12)} {...S} />
          <path d="M -34 -166 Q 0 -150 34 -166 L 38 -130 Q 0 -120 -38 -130 Z" fill={tom(cor, -0.1)} {...S} />
          <line x1={-12} y1={-232} x2={-12} y2={-196} stroke="#fff" strokeWidth={4} strokeLinecap="round" /><line x1={12} y1={-232} x2={12} y2={-196} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </g>
      )}
      {P.cracha && (
        <g>
          <path d="M -22 -254 L -4 -188 M 22 -254 L 4 -188" stroke={contorno ? TINTA : '#26324F'} strokeWidth={4} fill="none" strokeLinecap="round" />
          <rect x={-22} y={-190} width={44} height={56} rx={6} fill="#fff" {...S} transform="rotate(-3 0 -190)" />
          <rect x={-22} y={-190} width={44} height={14} rx={5} fill="#EE7533" {...S} transform="rotate(-3 0 -190)" />
          <circle cx={0} cy={-160} r={9} fill={P.pele} transform="rotate(-3 0 -190)" /><rect x={-14} y={-146} width={28} height={5} rx={2} fill="#9AA0AE" transform="rotate(-3 0 -190)" />
        </g>
      )}
      {braco(1, bD)}
      {/* pescoço e cabeça */}
      <rect x={-26} y={-268} width={52} height={32} rx={14} fill={sombraPele} {...S} />
      {cabeloTras}
      <circle cx={-98} cy={-330} r={19} fill={P.pele} {...S} /><circle cx={98} cy={-330} r={19} fill={P.pele} {...S} />
      <ellipse cx={0} cy={-338} rx={100} ry={94} fill={P.pele} {...S} />
      {!contorno && <path d="M 62 -396 Q 112 -350 78 -270 Q 108 -340 62 -396 Z" fill={sombraPele} opacity={0.5} />}
      {cabeloFrente}
      {/* rosto */}
      <circle cx={-62} cy={-312} r={17} fill="#F08A8A" opacity={bravo ? 0.55 : 0.32} /><circle cx={62} cy={-312} r={17} fill="#F08A8A" opacity={bravo ? 0.55 : 0.32} />
      <Olho cx={-36} rx={rx} ry={ry} pupila={pup} dx={dx} dy={dy} piscando={piscando && !susto} contorno={contorno} />
      <Olho cx={36} rx={rx} ry={ry} pupila={pup} dx={dx} dy={dy} piscando={piscando && !susto} contorno={contorno} />
      {sobrancelhas}
      <path d="M -6 -322 Q 0 -308 8 -318" fill="none" stroke={tom(P.pele, -0.35)} strokeWidth={4} strokeLinecap="round" />
      {boca}
      {P.oculos && (
        <g fill="rgba(255,255,255,0.14)" stroke="#1B1B22" strokeWidth={5.5}>
          <rect x={-70} y={-362} width={64} height={52} rx={18} /><rect x={6} y={-362} width={64} height={52} rx={18} />
          <path d="M -6 -344 Q 0 -350 6 -344" fill="none" /><path d="M -70 -346 L -100 -352 M 70 -346 L 100 -352" fill="none" />
        </g>
      )}
      {preoc && <path d={`M 104 ${-388 + (f % 30) * 0.5} q 14 24 0 36 q -14 -12 0 -36 z`} fill="#8EDBFF" stroke={contorno ? TINTA : 'none'} strokeWidth={3} />}
    </g>
  );
};

export const Personagem: React.FC<{dados: PersonagemRot; contorno: boolean; f: number; dur: number; inicio: number}> = ({dados, contorno, f, dur, inicio}) => {
  const {fps} = useVideoConfig();
  const perfil = perfilDe(dados);
  const anim = dados.anima ?? 'balanca';
  const entra = dados.entra ?? 'pop';
  const e = dados.escala ?? 1;
  const y = dados.y ?? CHAO;
  const t = f - inicio;
  const visivel = t >= 0;
  // posição e direção
  let x = dados.x;
  let dir = dados.espelho ? -1 : 1;
  if (anim === 'anda') {
    const ate = dados.ate ?? (dados.x < 540 ? dados.x + 560 : dados.x - 560);
    x = interpolate(limita(t, 0, dur), [0, dur], [dados.x, ate]);
    dir = ate >= dados.x ? 1 : -1;
  } else if (dados.ate !== undefined) {
    x = interpolate(limita(t, 0, 24), [0, 24], [dados.x, dados.ate], {easing: (v) => saida(v)});
  }
  let desl = 0, esc = 1;
  if (entra === 'pop') esc = spring({frame: t, fps, config: {damping: 10, stiffness: 190, mass: 0.7}});
  if (entra === 'desliza-esq') desl = -(1 - saida(t / 16)) * 760;
  if (entra === 'desliza-dir') desl = (1 - saida(t / 16)) * 760;
  const bal = anim === 'balanca' || anim === 'aceno' || anim === 'aponta';
  const rot = bal ? Math.sin(f * 0.11) * 2.2 : 0;
  const resp = 1 + Math.sin(f * 0.17) * 0.012;
  const salto = anim === 'anda' ? -Math.abs(Math.sin(f * 0.3)) * 9 : 0;
  if (!visivel) return null;
  return (
    <g transform={`translate(${x + desl} ${y})`}>
      <ellipse cx={0} cy={4} rx={150 * e * (0.6 + 0.4 * limita(esc, 0, 1))} ry={22 * e} fill="#000" opacity={0.22} />
      <g transform={`scale(${e * dir * Math.max(0.001, esc)} ${e * Math.max(0.001, esc)}) translate(0 ${salto}) rotate(${rot}) scale(1 ${resp})`}>
        <Corpo perfil={perfil} expressao={dados.expressao ?? 'neutro'} contorno={contorno} anim={anim} f={f} olha={f * 0.05 + (dados.x % 7)} />
      </g>
    </g>
  );
};
