// Elenco 2D do template cartoon, desenhado em SVG por código: cabeça redonda grande, corpo de feijão com
// botões, contorno preto grosso, olhos de traço, expressão forte. Tudo determinístico por quadro.
import React from 'react';
import {spring} from 'remotion';
import {clamp, senoide} from './util';

export type Expressao = 'neutro' | 'sono' | 'desconfiado' | 'preocupado' | 'susto' | 'feliz';
export type TipoPersonagem = 'dono' | 'funcionaria' | 'cliente' | 'silhueta';
export type Entra = 'pop' | 'deslize' | {tipo?: 'pop' | 'deslize'; palavra?: string; f?: number};
export type PersonagemRot = {tipo: TipoPersonagem; expressao?: Expressao; x?: number; y?: number; escala?: number; entra?: Entra; olhar?: number; espelhar?: boolean};
export type Luz = {brilho: number; lado: -1 | 1; quente: string; frio: string; borda: string; sombra: string; halo?: string};

const PRETO = '#0c0c10';
const ELENCO: Record<TipoPersonagem, {pele: string; corpo: string; cabelo: string; detalhe: string}> = {
  dono: {pele: '#e6b28a', corpo: '#7c9dcf', cabelo: '#2b1e18', detalhe: '#1d2b4d'},
  funcionaria: {pele: '#d89a73', corpo: '#3e8088', cabelo: '#3b2417', detalhe: '#2a5a60'},
  cliente: {pele: '#e0a67c', corpo: '#7d4f31', cabelo: '#cdc8bf', detalhe: '#f2ece0'},
  silhueta: {pele: '#0a0c14', corpo: '#0a0c14', cabelo: '#0a0c14', detalhe: '#0a0c14'},
};
const TRACO = {stroke: PRETO, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};

const Rosto: React.FC<{tipo: TipoPersonagem; ex: Expressao; piscando: boolean; olhar: number; f: number}> = ({tipo, ex, piscando, olhar, f}) => {
  const g = olhar * 9;
  const boca = tipo === 'cliente' ? 10 : 0;
  const dente = <path d="M-50,-694 Q0,-688 50,-694" stroke="#fff" strokeWidth={9} fill="none" />;
  const gota = (x: number, y: number, k = 1) => <path d={`M${x},${y - 26 * k} Q${x + 17 * k},${y + 4 * k} ${x},${y + 14 * k} Q${x - 17 * k},${y + 4 * k} ${x},${y - 26 * k} Z`} fill="#8fd0ff" stroke={PRETO} strokeWidth={5} />;
  const olhoPonto = (x: number) => (piscando ? <path d={`M${x - 20},-738 L${x + 20},-738`} {...TRACO} strokeWidth={9} /> : <ellipse cx={x + g} cy={-738} rx={11} ry={17} fill={PRETO} />);
  return (
    <g>
      {ex === 'neutro' && (<>{olhoPonto(-52)}{olhoPonto(52)}<path d={`M-24,${-672 + boca} L24,${-672 + boca}`} {...TRACO} strokeWidth={9} /></>)}
      {ex === 'sono' && (
        <>
          {[-52, 52].map((x) => (
            <g key={x}>
              <path d={`M${x - 22},-740 Q${x},-722 ${x + 22},-740`} {...TRACO} strokeWidth={9} />
              <path d={`M${x - 26},-716 Q${x},-696 ${x + 26},-716`} stroke="#6a3d78" strokeOpacity={0.75} strokeWidth={8} fill="none" strokeLinecap="round" />
              <path d={`M${x - 24},-764 L${x + 24},-770`} {...TRACO} strokeWidth={9} transform={x > 0 ? `scale(-1,1) translate(${-2 * x},0)` : undefined} />
            </g>
          ))}
          <path d={`M-30,${-668 + boca} Q0,${-682 + boca} 30,${-664 + boca}`} {...TRACO} strokeWidth={9} />
          <text x={150} y={-880 + senoide(f, 40) * 6} fontFamily="Sora, sans-serif" fontWeight={700} fontSize={52} fill="#cfe0ff" stroke={PRETO} strokeWidth={5} paintOrder="stroke">z</text>
          <text x={185} y={-930 + senoide(f, 40, 12) * 6} fontFamily="Sora, sans-serif" fontWeight={700} fontSize={36} fill="#cfe0ff" stroke={PRETO} strokeWidth={4} paintOrder="stroke">z</text>
        </>
      )}
      {ex === 'desconfiado' && (
        <>
          <path d="M-76,-742 L-30,-738" {...TRACO} strokeWidth={10} />
          <path d="M30,-738 L76,-742" {...TRACO} strokeWidth={10} />
          <path d="M-84,-776 L-28,-792" {...TRACO} strokeWidth={10} />
          <path d="M26,-770 L84,-758" {...TRACO} strokeWidth={10} />
          <path d={`M-30,${-668 + boca} Q4,${-674 + boca} 42,${-690 + boca}`} {...TRACO} strokeWidth={9} />
        </>
      )}
      {ex === 'preocupado' && (
        <>
          {olhoPonto(-52)}{olhoPonto(52)}
          <path d="M-84,-776 L-32,-800" {...TRACO} strokeWidth={10} />
          <path d="M84,-776 L32,-800" {...TRACO} strokeWidth={10} />
          <path d={`M-42,${-668 + boca} Q-28,${-684 + boca} -14,${-668 + boca} T14,${-668 + boca} T42,${-668 + boca}`} {...TRACO} strokeWidth={9} />
          {gota(120 + senoide(f, 30) * 2, -786 + ((f % 45) / 45) * 14)}
        </>
      )}
      {ex === 'susto' && (
        <>
          {[-52, 52].map((x) => (
            <g key={x}>
              <circle cx={x} cy={-738} r={32} fill="#fff" stroke={PRETO} strokeWidth={8} />
              <circle cx={x + g * 0.8} cy={-738} r={8} fill={PRETO} />
            </g>
          ))}
          <path d="M-90,-792 Q-52,-824 -18,-796" {...TRACO} strokeWidth={9} />
          <path d="M90,-792 Q52,-824 18,-796" {...TRACO} strokeWidth={9} />
          <ellipse cx={0} cy={-662 + boca} rx={28} ry={40} fill="#3a0f14" stroke={PRETO} strokeWidth={9} />
          <ellipse cx={0} cy={-648 + boca} rx={16} ry={14} fill="#c4505c" />
          {gota(-132, -800)}{gota(140, -760, 0.8)}
        </>
      )}
      {ex === 'feliz' && (
        <>
          <path d="M-76,-730 Q-52,-760 -28,-730" {...TRACO} strokeWidth={10} />
          <path d="M28,-730 Q52,-760 76,-730" {...TRACO} strokeWidth={10} />
          <path d={`M-56,${-696 + boca} Q0,${-624 + boca} 56,${-696 + boca} Q0,${-680 + boca} -56,${-696 + boca} Z`} fill="#3a0f14" stroke={PRETO} strokeWidth={9} strokeLinejoin="round" />
          <path d={`M-42,${-690 + boca} Q0,${-676 + boca} 42,${-690 + boca}`} stroke="#fff" strokeWidth={9} fill="none" />
          <circle cx={-86} cy={-698} r={20} fill="#ff7a6a" opacity={0.4} />
          <circle cx={86} cy={-698} r={20} fill="#ff7a6a" opacity={0.4} />
        </>
      )}
    </g>
  );
};

export const PersonagemSVG: React.FC<{p: PersonagemRot; f: number; luz: Luz; uid: string}> = ({p, f, luz, uid}) => {
  const tipo = p.tipo;
  const cfg = ELENCO[tipo];
  const ex = p.expressao ?? 'neutro';
  const sil = tipo === 'silhueta';
  const respira = 1 + 0.01 * (1 + senoide(f, 56));
  const bob = senoide(f, 56) * 3;
  const piscando = (f + (uid.charCodeAt(uid.length - 1) % 7) * 11) % 100 < 4;
  const tremor = ex === 'susto' ? senoide(f, 2.4) * 3 : 0;
  const grad = (id: string, a: number, b: number) => (
    <linearGradient id={`${uid}${id}`} x1={luz.lado < 0 ? 0 : 1} y1={0.2} x2={luz.lado < 0 ? 1 : 0} y2={0.8}>
      <stop offset="0" stopColor={luz.quente} stopOpacity={a} />
      <stop offset="0.5" stopColor={luz.quente} stopOpacity={0} />
      <stop offset="0.55" stopColor={luz.frio} stopOpacity={0} />
      <stop offset="1" stopColor={luz.frio} stopOpacity={b} />
    </linearGradient>
  );
  const corpo = 'M-150,-380 C-150,-560 -100,-612 0,-612 C100,-612 150,-560 150,-380 C150,-230 105,-150 0,-150 C-105,-150 -150,-230 -150,-380 Z';
  const bracoE = ex === 'susto' ? 'M-135,-520 Q-222,-560 -176,-662' : ex === 'feliz' ? 'M-135,-520 Q-200,-430 -190,-310' : 'M-135,-520 Q-192,-420 -186,-300';
  const hD = {x: 186 + senoide(f, 34) * 5, y: -300};
  let bracoD = 'M135,-520 Q192,-420 186,-300';
  let mao = {x: hD.x, y: hD.y};
  if (ex === 'susto') { bracoD = 'M135,-520 Q222,-560 176,-662'; mao = {x: 176, y: -662}; }
  else if (ex === 'feliz') { const w = senoide(f, 14) * 22; bracoD = `M135,-520 Q235,-560 ${208 + w},-704`; mao = {x: 208 + w, y: -704}; }
  else if (ex === 'preocupado') { bracoD = 'M135,-520 Q205,-560 128,-596'; mao = {x: 128, y: -596}; }
  const maoE = ex === 'susto' ? {x: -176, y: -662} : ex === 'feliz' ? {x: -190, y: -310} : {x: -186, y: -300};
  return (
    <g transform={`translate(${tremor},0)`}>
      <defs>{grad('c', 0.5 * luz.brilho, 0.55)}{grad('h', 0.5 * luz.brilho, 0.5)}</defs>
      <g transform={`scale(1,${respira})`}>
        {/* pernas e sapatos */}
        <path d="M-42,-168 L-48,-22" {...TRACO} strokeWidth={12} />
        <path d="M42,-168 L48,-22" {...TRACO} strokeWidth={12} />
        <ellipse cx={-56} cy={-10} rx={38} ry={16} fill="#14161e" stroke={PRETO} strokeWidth={7} />
        <ellipse cx={56} cy={-10} rx={38} ry={16} fill="#14161e" stroke={PRETO} strokeWidth={7} />
        {/* corpo */}
        <path d={corpo} fill={cfg.corpo} stroke={PRETO} strokeWidth={11} strokeLinejoin="round" />
        {tipo === 'dono' && (
          <>
            <path d="M-46,-608 L0,-550 L46,-608 Z" fill="#fff" stroke={PRETO} strokeWidth={7} strokeLinejoin="round" />
            <path d="M-16,-566 L16,-566 L24,-410 L0,-380 L-24,-410 Z" fill={cfg.detalhe} stroke={PRETO} strokeWidth={7} strokeLinejoin="round" />
            <path d="M-8,-566 L8,-566 L0,-548 Z" fill={cfg.detalhe} stroke={PRETO} strokeWidth={5} />
          </>
        )}
        {tipo === 'funcionaria' && <path d="M-70,-600 Q0,-540 70,-600" stroke={PRETO} strokeWidth={8} fill={cfg.detalhe} strokeLinecap="round" />}
        {tipo === 'cliente' && (
          <>
            <path d="M-50,-608 L0,-500 L50,-608 Z" fill={cfg.detalhe} stroke={PRETO} strokeWidth={7} strokeLinejoin="round" />
            <path d="M-62,-600 L-14,-400 M62,-600 L14,-400" {...TRACO} strokeWidth={8} />
          </>
        )}
        {!sil && [-330, -270, -210].map((y) => <circle key={y} cx={0} cy={y} r={11} fill="#1a1b22" stroke={PRETO} strokeWidth={4} />)}
        {!sil && <path d={corpo} fill={`url(#${uid}c)`} />}
        {/* braços */}
        <path d={bracoE} {...TRACO} strokeWidth={12} />
        <path d={bracoD} {...TRACO} strokeWidth={12} />
        <circle cx={maoE.x} cy={maoE.y} r={24} fill={cfg.pele} stroke={PRETO} strokeWidth={8} />
        <circle cx={mao.x} cy={mao.y} r={24} fill={cfg.pele} stroke={PRETO} strokeWidth={8} />
        {/* cabeça */}
        <g transform={`translate(0,${bob})`}>
          {!sil && <><ellipse cx={-133} cy={-735} rx={22} ry={28} fill={cfg.pele} stroke={PRETO} strokeWidth={8} /><ellipse cx={133} cy={-735} rx={22} ry={28} fill={cfg.pele} stroke={PRETO} strokeWidth={8} /></>}
          <circle cx={0} cy={-740} r={136} fill={cfg.pele} stroke={PRETO} strokeWidth={11} />
          {!sil && <circle cx={0} cy={-740} r={136} fill={`url(#${uid}h)`} />}
          {tipo === 'dono' && (
            <>
              <path d="M-137,-762 C-142,-884 -60,-908 10,-902 C92,-898 142,-852 137,-762 C102,-816 40,-832 -20,-828 C-82,-824 -120,-800 -137,-762 Z" fill={cfg.cabelo} stroke={PRETO} strokeWidth={9} strokeLinejoin="round" />
              <ellipse cx={-126} cy={-768} rx={13} ry={28} fill="#9d978e" stroke={PRETO} strokeWidth={5} />
              <ellipse cx={126} cy={-768} rx={13} ry={28} fill="#9d978e" stroke={PRETO} strokeWidth={5} />
            </>
          )}
          {tipo === 'funcionaria' && (
            <>
              <circle cx={4} cy={-912} r={54} fill={cfg.cabelo} stroke={PRETO} strokeWidth={9} />
              <path d="M-139,-740 C-150,-880 -50,-896 4,-890 C80,-886 150,-850 139,-740 C120,-800 80,-836 4,-834 C-70,-832 -122,-796 -139,-740 Z" fill={cfg.cabelo} stroke={PRETO} strokeWidth={9} strokeLinejoin="round" />
              <path d="M-139,-740 C-150,-700 -140,-670 -120,-650" {...TRACO} strokeWidth={9} />
            </>
          )}
          {tipo === 'cliente' && (
            <>
              <path d="M-132,-780 C-150,-740 -138,-700 -126,-690 C-110,-720 -110,-760 -132,-780 Z" fill={cfg.cabelo} stroke={PRETO} strokeWidth={7} />
              <path d="M132,-780 C150,-740 138,-700 126,-690 C110,-720 110,-760 132,-780 Z" fill={cfg.cabelo} stroke={PRETO} strokeWidth={7} />
              <path d="M-84,-696 Q-44,-728 0,-704 Q44,-728 84,-696 Q44,-672 0,-690 Q-44,-672 -84,-696 Z" fill="#4a4540" stroke={PRETO} strokeWidth={7} strokeLinejoin="round" />
            </>
          )}
          {sil && (
            <>
              <ellipse cx={0} cy={-858} rx={196} ry={26} fill="#0a0c14" stroke={PRETO} strokeWidth={8} />
              <path d="M-100,-858 L-90,-960 Q0,-990 90,-960 L100,-858 Z" fill="#0a0c14" stroke={PRETO} strokeWidth={8} strokeLinejoin="round" />
            </>
          )}
          {!sil && <Rosto tipo={tipo} ex={ex} piscando={piscando} olhar={p.olhar ?? 0} f={f} />}
          {tipo === 'dono' && (
            <g>
              <circle cx={-52} cy={-738} r={38} fill="#ffffff" fillOpacity={0.12} stroke={PRETO} strokeWidth={7} />
              <circle cx={52} cy={-738} r={38} fill="#ffffff" fillOpacity={0.12} stroke={PRETO} strokeWidth={7} />
              <path d="M-15,-744 Q0,-754 15,-744" {...TRACO} strokeWidth={7} />
              <path d="M-90,-742 L-136,-750 M90,-742 L136,-750" {...TRACO} strokeWidth={6} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

export const Personagem: React.FC<{p: PersonagemRot; f: number; fps: number; entraF: number; idx: number; luz: Luz; par: {dx: number; s: number}}> = ({p, f, fps, entraF, idx, luz, par}) => {
  const x = p.x ?? 540;
  const y = p.y ?? 1190;
  const esc = p.escala ?? 0.9;
  const entra = typeof p.entra === 'string' ? {tipo: p.entra} : p.entra;
  const t = entra ? entra.tipo ?? 'pop' : null;
  const s = entra ? spring({frame: f - entraF, fps, config: {damping: t === 'pop' ? 9 : 16, stiffness: t === 'pop' ? 170 : 120}}) : 1;
  const visivel = !entra || f >= entraF;
  const popEsc = t === 'pop' ? clamp(s, 0, 1.12) : 1;
  const desl = t === 'deslize' ? (1 - s) * (x < 540 ? -760 : 760) : 0;
  const bal = senoide(f, 76, idx * 17) * 1.2;
  const px = par.dx * (1 + idx * 0.04);
  const flip = p.espelhar ? -1 : 1;
  const uid = `p${idx}${p.tipo[0]}`;
  const sh = esc * par.s;
  return (
    <>
      <div style={{position: 'absolute', left: x + px - luz.lado * 46 * esc - 250 * sh, top: y - 34 * sh, width: 500 * sh, height: 68 * sh, borderRadius: '50%', background: `radial-gradient(ellipse at center, ${luz.sombra} 0%, rgba(0,0,0,0) 70%)`, opacity: visivel ? clamp(s) : 0, transform: `translateX(${desl}px)`}} />
      <div style={{position: 'absolute', left: x + px, top: y, width: 0, height: 0, transform: `translateX(${desl}px) rotate(${bal}deg) scale(${sh * popEsc * flip},${sh * popEsc})`, transformOrigin: '0 0', opacity: visivel ? 1 : 0, filter: `brightness(${luz.brilho}) drop-shadow(${luz.lado * 5}px -2px 0 ${luz.borda})${luz.halo ? ` drop-shadow(0 0 16px ${luz.halo})` : ''}`}}>
        <svg width={900} height={1120} viewBox="-450 -1010 900 1120" style={{position: 'absolute', left: -450, top: -1010, overflow: 'visible'}}>
          <PersonagemSVG p={p} f={f} luz={luz} uid={uid} />
        </svg>
      </div>
    </>
  );
};
