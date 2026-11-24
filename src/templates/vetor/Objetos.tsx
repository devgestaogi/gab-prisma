// Objetos-símbolo em SVG, centrados em (0,0), ~420 px de lado na escala 1. Animação por quadro (f = quadro desde a entrada).
import React from 'react';
import {useDestaque} from '../comum';
import {rng, tom, TINTA, VERMELHO, limita} from './util';

const OSW = "'Oswald', 'Arial Narrow', sans-serif";
const Sombra: React.FC<{y: number; rx: number}> = ({y, rx}) => <ellipse cx={0} cy={y} rx={rx} ry={rx * 0.1} fill="#000" opacity={0.25} />;

const Celular: React.FC<{f: number; rotulo?: string}> = ({f, rotulo}) => {
  const R = rng(5);
  const cores = ['#25D366', '#EE7533', '#4FA3D9', '#E5484D', '#A472D8'];
  const n = limita(Math.floor(f / 5), 1, 6);
  const tremor = Math.sin(f * 2.4) * 4 * (f % 24 < 14 ? 1 : 0.2);
  return (
    <g transform={`translate(${tremor} 0) rotate(${Math.sin(f * 2.2) * 1.6})`}>
      <defs>
        <linearGradient id="telaCel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3A4A8C" /><stop offset="1" stopColor="#1B1F44" /></linearGradient>
        <linearGradient id="corpoCel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2A2E3C" /><stop offset="0.5" stopColor="#4A5064" /><stop offset="1" stopColor="#1C1F29" /></linearGradient>
      </defs>
      <Sombra y={290} rx={170} />
      <rect x={-140} y={-280} width={280} height={560} rx={48} fill="url(#corpoCel)" />
      <rect x={-126} y={-266} width={252} height={532} rx={38} fill="url(#telaCel)" />
      <rect x={-34} y={-250} width={68} height={18} rx={9} fill="#0C0E16" />
      <text x={0} y={-186} textAnchor="middle" fontFamily={OSW} fontWeight={600} fontSize={66} fill="#fff" opacity={0.9}>22:47</text>
      {Array.from({length: 6}).map((_, i) => {
        const vis = i < n;
        const y = -130 + i * 82;
        return vis ? (
          <g key={i} transform={`translate(0 ${y})`}>
            <rect x={-108} y={0} width={216} height={70} rx={16} fill="#fff" opacity={0.95} />
            <circle cx={-72} cy={35} r={20} fill={cores[Math.floor(R() * cores.length)]} />
            <rect x={-40} y={18} width={110} height={11} rx={5} fill="#2A2E3C" />
            <rect x={-40} y={40} width={80} height={9} rx={4} fill="#9AA0AE" />
          </g>
        ) : null;
      })}
      <g transform={`translate(124 -262) scale(${1 + 0.06 * Math.sin(f * 0.8)})`}>
        <circle r={50} fill={VERMELHO} stroke="#fff" strokeWidth={6} />
        <text x={0} y={17} textAnchor="middle" fontFamily={OSW} fontWeight={700} fontSize={50} fill="#fff">{rotulo ?? '40'}</text>
      </g>
    </g>
  );
};

const Agenda: React.FC<{f: number; rotulo?: string}> = ({f}) => {
  const R = rng(9);
  const cores = ['#4FA3D9', '#EE7533', '#58B88A', '#A472D8', '#F2D04B', '#E5644E', '#F59BB8'];
  return (
    <g>
      <Sombra y={256} rx={190} />
      <rect x={-200} y={-240} width={400} height={490} rx={30} fill="#fff" />
      <path d="M -200 -210 Q -200 -240 -170 -240 L 170 -240 Q 200 -240 200 -210 L 200 -140 L -200 -140 Z" fill={VERMELHO} />
      {[-110, 110].map((x) => <g key={x}><rect x={x - 12} y={-270} width={24} height={64} rx={12} fill="#3A3F4F" /><rect x={x - 6} y={-264} width={12} height={36} rx={6} fill="#9AA0AE" /></g>)}
      {Array.from({length: 5}).map((_, r) => Array.from({length: 5}).map((__, q) => {
        const cor = cores[Math.floor(R() * cores.length)];
        const pop = limita((f - 3 - (r * 5 + q) * 0.9) / 6, 0, 1);
        return <rect key={r + '_' + q} x={-176 + q * 72} y={-122 + r * 74} width={64} height={60} rx={10} fill={cor} opacity={0.35 + 0.65 * pop} transform={`translate(${32 * 0} 0)`} />;
      }))}
      {Array.from({length: 5}).map((_, r) => Array.from({length: 5}).map((__, q) => <rect key={'l' + r + '_' + q} x={-166 + q * 72} y={-108 + r * 74} width={38 + ((r + q) % 3) * 8} height={8} rx={4} fill="#fff" opacity={0.85} />))}
    </g>
  );
};

const Relogio: React.FC<{f: number; cor?: string; rapido?: number; ref_?: boolean}> = ({f, cor, rapido = 1}) => {
  const destaque = useDestaque();
  cor = cor ?? destaque;
  const min = (f * 2.4 * rapido) % 360, hora = (f * 0.2 * rapido) % 360, seg = (f * 14 * rapido) % 360;
  return (
    <g>
      <defs><radialGradient id={`rel${cor.slice(1)}`} cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#E3E8F0" /></radialGradient></defs>
      <circle cx={-110} cy={-170} r={52} fill={tom(cor, -0.1)} transform="rotate(-18 0 0)" />
      <circle cx={110} cy={-170} r={52} fill={tom(cor, -0.1)} transform="rotate(18 0 0)" />
      <rect x={-130} y={170} width={30} height={60} rx={10} fill="#3A3F4F" transform="rotate(18 -115 170)" /><rect x={100} y={170} width={30} height={60} rx={10} fill="#3A3F4F" transform="rotate(-18 115 170)" />
      <circle r={200} fill={cor} />
      <circle r={200} fill="none" stroke="#000" strokeOpacity={0.15} strokeWidth={10} />
      <circle r={168} fill={`url(#rel${cor.slice(1)})`} />
      {Array.from({length: 12}).map((_, i) => <rect key={i} x={-5} y={-156} width={10} height={i % 3 === 0 ? 30 : 16} rx={4} fill="#26324F" transform={`rotate(${i * 30})`} />)}
      <rect x={-8} y={-92} width={16} height={92} rx={8} fill="#26324F" transform={`rotate(${hora})`} />
      <rect x={-6} y={-138} width={12} height={138} rx={6} fill="#26324F" transform={`rotate(${min})`} />
      <rect x={-2.5} y={-150} width={5} height={170} rx={2.5} fill={VERMELHO} transform={`rotate(${seg})`} />
      <circle r={14} fill={VERMELHO} />
    </g>
  );
};

const RelogioDuplo: React.FC<{f: number}> = ({f}) => {
  const destaque = useDestaque();
  return (
  <g>
    <Sombra y={250} rx={330} />
    <g transform="translate(-210 0) scale(0.55)"><Relogio f={f} cor={destaque} rapido={3} /></g>
    <g transform="translate(210 0) scale(0.55)"><Relogio f={f} cor="#2FA89A" rapido={0.5} /></g>
  </g>
  );
};

const Cofre: React.FC<{f: number}> = ({f}) => (
  <g>
    <defs>
      <linearGradient id="cofreG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8A9BB5" /><stop offset="1" stopColor="#4A5872" /></linearGradient>
      <linearGradient id="cadG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFE07A" /><stop offset="1" stopColor="#D9981A" /></linearGradient>
    </defs>
    <Sombra y={262} rx={230} />
    <rect x={-170} y={238} width={50} height={28} rx={8} fill="#2A3144" /><rect x={120} y={238} width={50} height={28} rx={8} fill="#2A3144" />
    <rect x={-200} y={-230} width={400} height={470} rx={34} fill="url(#cofreG)" />
    <rect x={-200} y={-230} width={400} height={470} rx={34} fill="none" stroke="#2A3144" strokeWidth={8} />
    <rect x={-168} y={-198} width={336} height={406} rx={22} fill="#5F6F8B" stroke="#2A3144" strokeWidth={6} />
    <rect x={-150} y={-180} width={80} height={14} rx={7} fill="#fff" opacity={0.22} />
    {[-130, 100].map((y) => <rect key={y} x={-214} y={y} width={26} height={60} rx={8} fill="#2A3144" />)}
    <g transform="translate(40 -20)">
      <circle r={96} fill="#3A4560" stroke="#2A3144" strokeWidth={6} />
      <circle r={70} fill="#7B8BA8" />
      <g transform={`rotate(${Math.sin(f * 0.05) * 25})`}>
        {Array.from({length: 6}).map((_, i) => <rect key={i} x={-7} y={-96} width={14} height={50} rx={7} fill="#D9E0EE" stroke="#2A3144" strokeWidth={3} transform={`rotate(${i * 60})`} />)}
        <circle r={22} fill="#D9E0EE" stroke="#2A3144" strokeWidth={4} />
      </g>
    </g>
    {/* cadeado */}
    <g transform={`translate(-76 118) rotate(${Math.sin(f * 0.12) * 3})`}>
      <path d="M -36 -34 L -36 -78 Q -36 -118 0 -118 Q 36 -118 36 -78 L 36 -34" fill="none" stroke="#C9D2E2" strokeWidth={20} strokeLinecap="round" />
      <rect x={-58} y={-40} width={116} height={96} rx={20} fill="url(#cadG)" stroke="#8A5A10" strokeWidth={5} />
      <circle cx={0} cy={0} r={13} fill="#7A4A08" /><rect x={-5} y={4} width={10} height={26} rx={5} fill="#7A4A08" />
    </g>
  </g>
);

const Tomada: React.FC<{f: number}> = ({f}) => {
  const faisca = f % 6 < 3;
  return (
    <g>
      <defs><linearGradient id="tomG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#CDD3DE" /></linearGradient></defs>
      <Sombra y={206} rx={170} />
      <rect x={-170} y={-170} width={340} height={340} rx={56} fill="url(#tomG)" stroke="#AEB6C6" strokeWidth={6} />
      {[-70, 70].map((y) => (
        <g key={y}>
          <circle cx={-10} cy={y} r={46} fill="#E8ECF4" stroke="#AEB6C6" strokeWidth={4} />
          <circle cx={-34} cy={y} r={9} fill="#2A2E3C" /><circle cx={14} cy={y} r={9} fill="#2A2E3C" />
        </g>
      ))}
      <path d="M 90 -70 Q 220 -30 190 120 Q 170 220 250 290" fill="none" stroke="#2FA89A" strokeWidth={22} strokeLinecap="round" transform={`translate(${Math.sin(f * 0.1) * 4} 0)`} />
      <g transform={`translate(${60 + Math.sin(f * 0.1) * 4} -70) rotate(-12)`}>
        <rect x={-6} y={-16} width={30} height={9} rx={3} fill="#C9D2E2" /><rect x={-6} y={8} width={30} height={9} rx={3} fill="#C9D2E2" />
        <rect x={22} y={-40} width={88} height={80} rx={22} fill="#3A3F4F" stroke="#1B1F2A" strokeWidth={5} />
      </g>
      {faisca && <polyline points="30,-70 54,-96 40,-70 66,-110" fill="none" stroke="#FFE07A" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};

const Porta: React.FC<{f: number}> = ({f}) => (
  <g>
    <defs><linearGradient id="portaG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9C6743" /><stop offset="1" stopColor="#7A4B2E" /></linearGradient></defs>
    <Sombra y={270} rx={210} />
    <rect x={-170} y={-290} width={340} height={560} rx={16} fill="#5C3B27" />
    <rect x={-146} y={-266} width={292} height={536} rx={8} fill="url(#portaG)" />
    <rect x={-112} y={-230} width={106} height={190} rx={8} fill="#8A5A3B" stroke="#5C3B27" strokeWidth={5} /><rect x={6} y={-230} width={106} height={190} rx={8} fill="#8A5A3B" stroke="#5C3B27" strokeWidth={5} />
    <rect x={-112} y={-4} width={224} height={240} rx={8} fill="#8A5A3B" stroke="#5C3B27" strokeWidth={5} />
    <rect x={-100} y={-216} width={22} height={150} fill="#fff" opacity={0.08} />
    <rect x={-146} y={262} width={292} height={8} fill="#FFE9B0" opacity={0.7} />
    <g transform="translate(96 20)">
      <rect x={-22} y={-52} width={44} height={96} rx={14} fill="#E6B33A" stroke="#8A5A10" strokeWidth={4} />
      <circle cx={0} cy={-22} r={14} fill="#7A4A08" /><circle cx={0} cy={18} r={22} fill="#F2D04B" stroke="#8A5A10" strokeWidth={4} />
    </g>
    <g transform={`translate(0 ${-6 + Math.sin(f * 0.1) * 2})`}>
      <path d="M -140 100 Q 0 150 140 100" fill="none" stroke="#9AA3B2" strokeWidth={14} strokeLinecap="round" strokeDasharray="22 8" />
    </g>
  </g>
);

const Moedas: React.FC<{f: number}> = ({f}) => {
  const pilha = (cx: number, n: number, k: number) => Array.from({length: n}).map((_, i) => {
    const y = 220 - i * 26;
    const cresce = limita((f - i * 1.4 - k * 5) / 5, 0, 1);
    return (
      <g key={cx + '_' + i} opacity={cresce} transform={`translate(${cx} ${y - (1 - cresce) * 40})`}>
        <ellipse cx={0} cy={22} rx={90} ry={26} fill="#C98A12" />
        <rect x={-90} y={0} width={180} height={22} fill="#C98A12" />
        <ellipse cx={0} cy={0} rx={90} ry={26} fill="#F5B72C" />
        <ellipse cx={0} cy={0} rx={68} ry={18} fill="none" stroke="#FFD66B" strokeWidth={5} />
        <ellipse cx={-30} cy={-6} rx={22} ry={5} fill="#fff" opacity={0.35} />
      </g>
    );
  });
  return (
    <g>
      <Sombra y={250} rx={300} />
      {pilha(-120, 5, 0)}{pilha(120, 7, 1)}{pilha(0, 9, 2)}
    </g>
  );
};

const Caixa: React.FC<{f: number}> = ({f}) => {
  const caixa = (x: number, y: number, s: number, k: number) => {
    const pop = limita((f - k * 5) / 6, 0, 1);
    return (
      <g transform={`translate(${x} ${y - (1 - pop) * 60}) scale(${s})`} opacity={pop}>
        <polygon points="-130,-40 0,-92 130,-40 0,12" fill="#E2B87A" />
        <polygon points="-130,-40 0,12 0,170 -130,118" fill="#C99A5B" />
        <polygon points="130,-40 0,12 0,170 130,118" fill="#A87C42" />
        <polygon points="-22,-80 22,-64 22,-8 -22,-24" fill="#EADBB4" transform="translate(0 0)" />
        <polygon points="-14,10 14,10 14,170 -14,170" fill="#EADBB4" opacity={0.0} />
        <rect x={-96} y={48} width={70} height={52} rx={5} fill="#fff" transform="skewY(22)" />
        <rect x={-88} y={60} width={44} height={7} rx={3} fill="#9AA0AE" transform="skewY(22)" /><rect x={-88} y={74} width={30} height={7} rx={3} fill="#9AA0AE" transform="skewY(22)" />
      </g>
    );
  };
  return (
    <g>
      <Sombra y={262} rx={300} />
      {caixa(-110, 130, 0.85, 0)}{caixa(120, 130, 0.85, 1)}{caixa(0, -20, 0.95, 2)}
    </g>
  );
};

const Grafico: React.FC<{f: number}> = ({f}) => {
  const pts: [number, number][] = [[-150, -100], [-90, -60], [-30, -90], [30, 0], [90, 50], [150, 120]];
  const total = 420;
  const prog = limita(f / 28, 0, 1);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return (
    <g>
      <defs><linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={VERMELHO} stopOpacity={0.4} /><stop offset="1" stopColor={VERMELHO} stopOpacity={0} /></linearGradient></defs>
      <Sombra y={220} rx={220} />
      <rect x={-210} y={-190} width={420} height={400} rx={34} fill="#fff" />
      <line x1={-170} y1={160} x2={170} y2={160} stroke="#C5CBD6" strokeWidth={6} strokeLinecap="round" />
      <line x1={-170} y1={-150} x2={-170} y2={160} stroke="#C5CBD6" strokeWidth={6} strokeLinecap="round" />
      {[-90, -20, 50, 120].map((y) => <line key={y} x1={-170} y1={y} x2={170} y2={y} stroke="#E6E9EF" strokeWidth={3} />)}
      <clipPath id="clipGr"><rect x={-170} y={-190} width={340 * prog + 2} height={400} /></clipPath>
      <g clipPath="url(#clipGr)">
        <path d={`${d} L 150 160 L -150 160 Z`} fill="url(#areaG)" />
        <path d={d} fill="none" stroke={VERMELHO} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {prog >= 1 && <polygon points="150,150 190,100 110,100" fill={VERMELHO} transform={`translate(0 ${Math.sin(f * 0.3) * 4})`} />}
      <circle cx={-150} cy={-100} r={11} fill="#fff" stroke={VERMELHO} strokeWidth={6} opacity={0} />
    </g>
  );
};

export const TIPOS_OBJETO = ['celular', 'agenda', 'relogio', 'relogio-duplo', 'cofre', 'tomada', 'porta', 'moedas', 'caixa', 'grafico'];

export const ObjetoVetor: React.FC<{tipo: string; f: number; rotulo?: string}> = ({tipo, f, rotulo}) => {
  switch (tipo) {
    case 'celular': return <Celular f={f} rotulo={rotulo} />;
    case 'agenda': return <Agenda f={f} />;
    case 'relogio': return <Relogio f={f} />;
    case 'relogio-duplo': return <RelogioDuplo f={f} />;
    case 'cofre': return <Cofre f={f} />;
    case 'tomada': return <Tomada f={f} />;
    case 'porta': return <Porta f={f} />;
    case 'moedas': return <Moedas f={f} />;
    case 'caixa': return <Caixa f={f} />;
    case 'grafico': return <Grafico f={f} />;
    default: return null;
  }
};
