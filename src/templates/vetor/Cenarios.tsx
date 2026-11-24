// Cenários procedurais em SVG (viewBox 1080x1920), parametrizados por cor. Vetor chapado com luz e sombra suave.
// Palco frontal: o chão onde os personagens pisam fica em y = CHAO (1130). O cenário ocupa a tela toda.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {A, L, rng, tom, mistura, Cenario} from './util';

type Cores = Record<string, string>;
const pal = (c: Cores | undefined, base: Cores): Cores => ({...base, ...(c ?? {})});

// ── peças reutilizáveis ─────────────────────────────────────────────────────────────────────────────────────
const Nuvem: React.FC<{x: number; y: number; s?: number; cor?: string; op?: number}> = ({x, y, s = 1, cor = '#fff', op = 0.95}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={op} fill={cor}>
    <ellipse cx={0} cy={0} rx={120} ry={34} />
    <ellipse cx={-40} cy={-26} rx={52} ry={42} />
    <ellipse cx={34} cy={-34} rx={64} ry={50} />
  </g>
);

const Janela: React.FC<{x: number; y: number; w: number; h: number; acesa?: boolean; quente?: string; vidro?: [string, string]; moldura?: string}> = ({x, y, w, h, acesa, quente = '#FFD27A', vidro = ['#CFEAFB', '#8EC6EA'], moldura}) => {
  const id = `jn${Math.round(x)}_${Math.round(y)}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={acesa ? tom(quente, 0.35) : vidro[0]} />
          <stop offset="1" stopColor={acesa ? quente : vidro[1]} />
        </linearGradient>
      </defs>
      {moldura && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={9} fill={moldura} />}
      <rect x={x} y={y} width={w} height={h} rx={7} fill={`url(#${id})`} />
      {!acesa && <polygon points={`${x + w * 0.1},${y + h} ${x + w * 0.5},${y} ${x + w * 0.72},${y} ${x + w * 0.32},${y + h}`} fill="#fff" opacity={0.28} />}
      <rect x={x} y={y + h} width={w} height={6} rx={3} fill="rgba(0,0,0,0.16)" transform={`translate(0 0)`} />
    </g>
  );
};

// Rua: calçada e asfalto (usado por rua e loja)
const RuaChao: React.FC<{topo: number; calcada?: string; asfalto?: string}> = ({topo, calcada = '#DAD5CD', asfalto = '#4B4F5C'}) => (
  <g>
    <defs>
      <linearGradient id="asf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(asfalto, 0.08)} /><stop offset="1" stopColor={tom(asfalto, -0.25)} /></linearGradient>
      <linearGradient id="cal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(calcada, -0.08)} /><stop offset="1" stopColor={tom(calcada, 0.1)} /></linearGradient>
      <linearGradient id="somaBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity={0.22} /><stop offset="1" stopColor="#000" stopOpacity={0} /></linearGradient>
    </defs>
    <rect x={0} y={topo} width={L} height={1196 - topo} fill="url(#cal)" />
    <rect x={0} y={topo} width={L} height={70} fill="url(#somaBase)" />
    {Array.from({length: 10}).map((_, i) => <rect key={i} x={i * 130 - 20} y={topo + 40} width={3} height={1160 - topo - 40} fill="#000" opacity={0.06} />)}
    <rect x={0} y={1160} width={L} height={36} fill={tom(calcada, -0.18)} />
    <rect x={0} y={1156} width={L} height={8} fill={tom(calcada, 0.35)} />
    <rect x={0} y={1196} width={L} height={A - 1196} fill="url(#asf)" />
    {Array.from({length: 6}).map((_, i) => <rect key={i} x={i * 230 - 40} y={1500} width={130} height={16} rx={4} fill="#F6E27A" opacity={0.92} />)}
    <rect x={0} y={1214} width={L} height={5} fill="#fff" opacity={0.12} />
  </g>
);

// ── rua: fachada de prédios coloridos ───────────────────────────────────────────────────────────────────────
export const Rua: React.FC<{c?: Cores}> = ({c}) => {
  const f = useCurrentFrame();
  const P = pal(c, {ceuA: '#79C6F2', ceuB: '#E6F5FF'});
  const cores = ['#F2A33A', '#4FA3D9', '#A472D8', '#E5644E', '#58B88A', '#F2D04B'];
  const R = rng(7);
  const base = 1010;
  const longe: React.ReactNode[] = [];
  let xl = -60;
  while (xl < L + 60) {
    const w = 150 + R() * 120, h = 520 + R() * 380;
    longe.push(<rect key={xl} x={xl} y={base - h} width={w} height={h} fill={mistura('#9FC2DA', '#E6F5FF', 0.35 + R() * 0.2)} />);
    xl += w - 6;
  }
  const preds: React.ReactNode[] = [];
  let x = -40, k = 0;
  while (x < L + 40) {
    const w = 270 + R() * 70, h = 640 + R() * 260;
    const cor = cores[k % cores.length];
    const top = base - h;
    const cols = Math.floor((w - 50) / 84);
    const rows = Math.floor((h - 190) / 112);
    const mx = x + (w - cols * 84 + 24) / 2;
    preds.push(
      <g key={k}>
        <rect x={x} y={top} width={w} height={h} fill={cor} />
        <rect x={x + w - 22} y={top} width={22} height={h} fill="#000" opacity={0.13} />
        <rect x={x} y={top} width={w} height={26} fill={tom(cor, -0.22)} />
        <rect x={x} y={top + 26} width={w} height={8} fill={tom(cor, 0.25)} opacity={0.6} />
        {Array.from({length: rows}).map((_, r) =>
          Array.from({length: cols}).map((__, q) => {
            const lit = R() < 0.14;
            return <Janela key={r + '_' + q} x={mx + q * 84} y={top + 70 + r * 112} w={50} h={72} acesa={lit} quente="#FFE08A" moldura={tom(cor, 0.4)} />;
          })
        )}
        {/* térreo: porta e toldo */}
        <rect x={x} y={base - 100} width={w} height={100} fill={tom(cor, -0.12)} />
        <rect x={x + w * 0.5 - 42} y={base - 150} width={84} height={150} rx={6} fill="#5A3A2A" />
        <rect x={x + w * 0.5 - 30} y={base - 138} width={60} height={64} rx={4} fill="#9CD4F0" opacity={0.85} />
        <circle cx={x + w * 0.5 + 28} cy={base - 66} r={5} fill="#F2D04B" />
      </g>
    );
    x += w - 4;
    k++;
  }
  return (
    <g>
      <defs>
        <linearGradient id="ceuRua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.ceuA} /><stop offset="1" stopColor={P.ceuB} /></linearGradient>
      </defs>
      <rect width={L} height={A} fill="url(#ceuRua)" />
      <Nuvem x={((200 + f * 0.25) % 1500) - 200} y={120} s={1.2} />
      <Nuvem x={((820 + f * 0.18) % 1500) - 200} y={300} s={0.9} op={0.8} />
      {longe}
      {preds}
      <RuaChao topo={base} />
    </g>
  );
};

// ── escritório ──────────────────────────────────────────────────────────────────────────────────────────────
export const Escritorio: React.FC<{c?: Cores; noite?: boolean}> = ({c, noite}) => {
  const P = pal(c, noite ? {a: '#2A2F58', b: '#3B4A78', piso: '#4A3434'} : {a: '#F0E4D0', b: '#8DB1CA', piso: '#B27C52'});
  const ceuA = noite ? '#141A3F' : '#7FC8F2', ceuB = noite ? '#4A3C7A' : '#DDF1FF';
  const R = rng(11);
  const sky: React.ReactNode[] = [];
  let xs = 100;
  while (xs < 480) {
    const w = 40 + R() * 56, h = 120 + R() * 220;
    sky.push(<rect key={xs} x={xs} y={800 - h} width={w} height={h} fill={noite ? '#1A1B3C' : '#9FC4DD'} />);
    if (noite) for (let r = 0; r < Math.floor(h / 36); r++) if (R() < 0.5) sky.push(<rect key={xs + 'w' + r} x={xs + 8 + R() * (w - 24)} y={800 - h + 12 + r * 36} width={10} height={14} fill="#FFD27A" opacity={0.9} />);
    xs += w + 4;
  }
  return (
    <g>
      <defs>
        <linearGradient id="parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(P.a, 0.12)} /><stop offset="1" stopColor={tom(P.a, -0.1)} /></linearGradient>
        <linearGradient id="pisoE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(P.piso, 0.05)} /><stop offset="1" stopColor={tom(P.piso, -0.3)} /></linearGradient>
        <linearGradient id="ceuE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ceuA} /><stop offset="1" stopColor={ceuB} /></linearGradient>
        <linearGradient id="luzJ" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={noite ? '#9BA9FF' : '#FFF6D6'} stopOpacity={noite ? 0.16 : 0.4} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></linearGradient>
        <radialGradient id="lampLuz" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFD98A" stopOpacity={0.55} /><stop offset="1" stopColor="#FFD98A" stopOpacity={0} /></radialGradient>
      </defs>
      <rect width={L} height={1150} fill="url(#parede)" />
      <rect y={820} width={L} height={330} fill={P.b} />
      <rect y={820} width={L} height={10} fill={tom(P.b, 0.3)} />
      <rect y={1134} width={L} height={20} fill="#fff" opacity={0.9} />
      {/* janela com a cidade */}
      <rect x={78} y={318} width={420} height={500} rx={14} fill="#F7F4EE" />
      <clipPath id="clipJE"><rect x={96} y={336} width={384} height={464} rx={6} /></clipPath>
      <g clipPath="url(#clipJE)">
        <rect x={96} y={336} width={384} height={464} fill="url(#ceuE)" />
        {noite && <g fill="#fff">{Array.from({length: 18}).map((_, i) => <circle key={i} cx={110 + R() * 360} cy={350 + R() * 200} r={1.6 + R() * 1.4} opacity={0.8} />)}</g>}
        {noite && <circle cx={400} cy={410} r={34} fill="#FFF3C9" />}
        {sky}
      </g>
      <rect x={282} y={336} width={12} height={464} fill="#F7F4EE" />
      <rect x={96} y={560} width={384} height={12} fill="#F7F4EE" />
      <polygon points="96,800 480,800 760,1150 90,1150" fill="url(#luzJ)" />
      {/* quadro branco com gráfico */}
      <rect x={590} y={380} width={400} height={290} rx={14} fill="#CBD2DB" />
      <rect x={602} y={392} width={376} height={266} rx={8} fill="#FFFFFF" />
      <polyline points="630,610 700,560 760,580 830,500 900,450 950,420" fill="none" stroke="#4FA3D9" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="630,620 700,600 770,610 840,570 900,560 950,540" fill="none" stroke="#EE7533" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={630} y={418} width={70} height={46} rx={4} fill="#F2D04B" /><rect x={716} y={418} width={70} height={46} rx={4} fill="#F59BB8" />
      <rect x={640} y={668} width={300} height={10} rx={5} fill="#9AA3AF" />
      {/* mesa, monitor, luminária, vaso */}
      <rect x={700} y={940} width={400} height={26} rx={8} fill={tom('#8A5A3B', 0.1)} />
      <rect x={730} y={966} width={20} height={184} fill="#6B4430" /><rect x={1040} y={966} width={20} height={184} fill="#6B4430" />
      <rect x={820} y={806} width={190} height={124} rx={12} fill="#1F2430" />
      <rect x={830} y={816} width={170} height={104} rx={6} fill={noite ? '#5F8BFF' : '#7FB8F5'} />
      <polyline points="845,900 880,870 915,885 960,840" fill="none" stroke="#fff" strokeWidth={5} opacity={0.8} strokeLinecap="round" />
      <rect x={902} y={930} width={26} height={12} fill="#1F2430" />
      <path d="M 740 940 L 770 860 L 800 880" fill="none" stroke="#2A2F3A" strokeWidth={9} strokeLinecap="round" /><ellipse cx={806} cy={880} rx={34} ry={14} fill="#EE7533" />
      {noite && <circle cx={800} cy={900} r={170} fill="url(#lampLuz)" />}
      <rect x={20} y={1000} width={90} height={150} rx={10} fill="#C46A3A" />
      {[[-12, 970], [20, 930], [60, 960], [86, 990]].map(([dx, dy], i) => <ellipse key={i} cx={64 + dx * 0.6} cy={dy - 20} rx={28} ry={50} fill="#4FA66A" transform={`rotate(${(i - 1.5) * 18} ${64 + dx * 0.6} 1000)`} />)}
      {/* piso */}
      <rect y={1150} width={L} height={A - 1150} fill="url(#pisoE)" />
      {Array.from({length: 14}).map((_, i) => <rect key={i} x={0} y={1150 + i * i * 4 + i * 28} width={L} height={3} fill="#000" opacity={0.09} />)}
      <rect y={1150} width={L} height={50} fill="#000" opacity={0.12} />
      {noite && <rect width={L} height={A} fill="#0C1030" opacity={0.18} />}
    </g>
  );
};

// ── loja: fachada com toldo e vitrine ───────────────────────────────────────────────────────────────────────
export const Loja: React.FC<{c?: Cores; placa?: string}> = ({c, placa}) => {
  const P = pal(c, {a: '#F6E5C3', b: '#B0553E', c: '#E5644E'});
  const R = rng(23);
  const prods = ['#4FA3D9', '#F2D04B', '#58B88A', '#E5644E', '#A472D8', '#F59BB8'];
  const prateleiras = [720, 830, 940];
  return (
    <g>
      <defs>
        <linearGradient id="ceuL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9BD2F4" /><stop offset="1" stopColor="#EAF6FF" /></linearGradient>
        <linearGradient id="vidroL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E6F6FF" /><stop offset="1" stopColor="#9CCFEA" /></linearGradient>
        <linearGradient id="paredeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={tom(P.a, 0.1)} /><stop offset="1" stopColor={tom(P.a, -0.1)} /></linearGradient>
      </defs>
      <rect width={L} height={A} fill="url(#ceuL)" />
      <rect x={0} y={260} width={L} height={750} fill="url(#paredeL)" />
      <rect x={0} y={880} width={L} height={130} fill={P.b} />
      {Array.from({length: 5}).map((_, i) => <rect key={i} x={0} y={896 + i * 24} width={L} height={3} fill="#000" opacity={0.12} />)}
      {/* placa */}
      <rect x={60} y={330} width={960} height={130} rx={18} fill={tom(P.c, -0.2)} />
      <rect x={72} y={342} width={936} height={106} rx={12} fill={P.c} />
      {placa && <text x={540} y={420} textAnchor="middle" fontFamily="'Oswald', sans-serif" fontWeight={700} fontSize={78} fill="#fff" style={{textTransform: 'uppercase'}}>{placa}</text>}
      {/* toldo listrado */}
      {Array.from({length: 12}).map((_, i) => (
        <g key={i}>
          <rect x={i * 90} y={480} width={90} height={92} fill={i % 2 ? '#FFFFFF' : P.c} />
          <path d={`M ${i * 90} 572 q 45 54 90 0 z`} fill={i % 2 ? '#FFFFFF' : P.c} />
        </g>
      ))}
      <rect x={0} y={472} width={L} height={14} fill="#000" opacity={0.18} />
      <path d="M 0 640 q 45 54 90 0" fill="none" />
      <rect x={0} y={600} width={L} height={46} fill="#000" opacity={0.12} />
      {/* vitrine */}
      <rect x={330} y={640} width={690} height={360} rx={16} fill={tom(P.b, -0.2)} />
      <rect x={346} y={656} width={658} height={328} rx={8} fill="url(#vidroL)" />
      {prateleiras.map((py, pi) => (
        <g key={pi}>
          <rect x={352} y={py + 30} width={646} height={12} fill="#8A5A3B" />
          {Array.from({length: 7}).map((_, q) => {
            const w = 50 + R() * 30, h = 40 + R() * 46;
            const cor = prods[Math.floor(R() * prods.length)];
            return <g key={q}><rect x={366 + q * 90} y={py + 30 - h} width={w} height={h} rx={6} fill={cor} /><rect x={366 + q * 90} y={py + 30 - h} width={w * 0.3} height={h} rx={6} fill="#fff" opacity={0.25} /></g>;
          })}
        </g>
      ))}
      <polygon points="346,984 560,656 640,656 426,984" fill="#fff" opacity={0.22} />
      {/* porta */}
      <rect x={70} y={640} width={220} height={370} rx={14} fill={tom(P.b, -0.2)} />
      <rect x={86} y={656} width={188} height={354} rx={8} fill="#7A4A32" />
      <rect x={104} y={676} width={152} height={200} rx={8} fill="url(#vidroL)" />
      <circle cx={246} cy={880} r={9} fill="#F2D04B" />
      <RuaChao topo={1010} />
    </g>
  );
};

// ── cidade à noite ──────────────────────────────────────────────────────────────────────────────────────────
export const CidadeNoite: React.FC<{c?: Cores}> = ({c}) => {
  const f = useCurrentFrame();
  const P = pal(c, {ceuA: '#10163A', ceuB: '#3A2A5C', ceuC: '#C65A8A'});
  const R = rng(31);
  const camada = (base: number, cor: string, hMin: number, hMax: number, wMin: number, wMax: number, luz: number, seed: number) => {
    const Rr = rng(seed);
    const out: React.ReactNode[] = [];
    let x = -30;
    while (x < L + 30) {
      const w = wMin + Rr() * (wMax - wMin), h = hMin + Rr() * (hMax - hMin);
      out.push(<rect key={'b' + x} x={x} y={base - h} width={w} height={h} fill={cor} />);
      if (Rr() < 0.4) out.push(<rect key={'a' + x} x={x + w * 0.45} y={base - h - 50} width={6} height={50} fill={cor} />);
      const cols = Math.floor((w - 20) / 34), rows = Math.floor((h - 40) / 46);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const v = Rr();
        if (v < luz) {
          const pisca = Math.sin(f * 0.04 + x * 0.1 + r * 1.7 + q) > 0.92 ? 0.3 : 1;
          out.push(<rect key={`w${x}_${r}_${q}`} x={x + 14 + q * 34} y={base - h + 22 + r * 46} width={16} height={22} rx={2} fill={v < luz * 0.25 ? '#8FE6FF' : '#FFD27A'} opacity={0.9 * pisca} />);
        }
      }
      x += w + 3;
    }
    return out;
  };
  return (
    <g>
      <defs>
        <linearGradient id="ceuCN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.ceuA} /><stop offset="0.55" stopColor={P.ceuB} /><stop offset="1" stopColor={P.ceuC} /></linearGradient>
        <radialGradient id="lua" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFF4D2" stopOpacity={0.7} /><stop offset="1" stopColor="#FFF4D2" stopOpacity={0} /></radialGradient>
        <linearGradient id="chaoCN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B1438" /><stop offset="1" stopColor="#0A0816" /></linearGradient>
      </defs>
      <rect width={L} height={A} fill="url(#ceuCN)" />
      {Array.from({length: 70}).map((_, i) => <circle key={i} cx={R() * L} cy={R() * 900} r={1 + R() * 2} fill="#fff" opacity={0.35 + 0.5 * Math.abs(Math.sin(f * 0.05 + i))} />)}
      <circle cx={830} cy={440} r={190} fill="url(#lua)" />
      <circle cx={830} cy={440} r={60} fill="#FFF1C9" />
      <circle cx={850} cy={426} r={54} fill="#F8E6B6" opacity={0.0} />
      {camada(1010, '#2B2152', 280, 620, 70, 130, 0.22, 3)}
      {camada(1060, '#171034', 260, 560, 90, 170, 0.34, 9)}
      <rect y={1060} width={L} height={A - 1060} fill="url(#chaoCN)" />
      <rect y={1058} width={L} height={6} fill="#FFB27A" opacity={0.35} />
      {Array.from({length: 6}).map((_, i) => <rect key={i} x={i * 230 - 30} y={1540} width={120} height={14} rx={4} fill="#F6E27A" opacity={0.5} />)}
    </g>
  );
};

// ── casa à noite: sala escura com TV e geladeira ───────────────────────────────────────────────────────────────
export const CasaNoite: React.FC<{c?: Cores}> = ({c}) => {
  const f = useCurrentFrame();
  const P = pal(c, {a: '#1E2345', b: '#2D335E', piso: '#34243A'});
  const R = rng(41);
  const luzTV = 0.8 + 0.2 * Math.sin(f * 0.37) * Math.sin(f * 0.11);
  return (
    <g>
      <defs>
        <linearGradient id="pCN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(P.a, -0.1)} /><stop offset="1" stopColor={P.b} /></linearGradient>
        <linearGradient id="pisoCN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tom(P.piso, 0.06)} /><stop offset="1" stopColor={tom(P.piso, -0.4)} /></linearGradient>
        <radialGradient id="luzTV" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#6FD8FF" stopOpacity={0.5 * luzTV} /><stop offset="1" stopColor="#6FD8FF" stopOpacity={0} /></radialGradient>
        <linearGradient id="telaTV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6FD8FF" /><stop offset="1" stopColor="#3B6BDB" /></linearGradient>
        <linearGradient id="gelad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7C8AA8" /><stop offset="0.5" stopColor="#A5B2CC" /><stop offset="1" stopColor="#6C7A98" /></linearGradient>
        <linearGradient id="ceuJC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101544" /><stop offset="1" stopColor="#5D3E86" /></linearGradient>
      </defs>
      <rect width={L} height={1150} fill="url(#pCN)" />
      <rect y={1132} width={L} height={20} fill={tom(P.b, 0.15)} />
      {/* janela com cidade */}
      <rect x={52} y={380} width={340} height={470} rx={12} fill="#0C0F2B" />
      <clipPath id="clipJC"><rect x={68} y={396} width={308} height={438} rx={4} /></clipPath>
      <g clipPath="url(#clipJC)">
        <rect x={68} y={396} width={308} height={438} fill="url(#ceuJC)" />
        {Array.from({length: 8}).map((_, i) => { const w = 36 + R() * 30, h = 110 + R() * 200, x = 68 + i * 40; return <g key={i}><rect x={x} y={834 - h} width={w} height={h} fill="#1A1440" />{Array.from({length: Math.floor(h / 30)}).map((__, r) => R() < 0.5 && <rect key={r} x={x + 8 + R() * (w - 20)} y={834 - h + 10 + r * 30} width={8} height={12} fill="#FFD27A" />)}</g>; })}
      </g>
      <rect x={216} y={396} width={10} height={438} fill="#0C0F2B" />
      <path d="M 52 380 L 52 880 L 120 880 Q 150 640 120 380 Z" fill="#6B3B8E" opacity={0.92} />
      <path d="M 392 380 L 392 880 L 324 880 Q 294 640 324 380 Z" fill="#7B45A0" opacity={0.92} />
      {/* TV sobre móvel */}
      <rect x={470} y={650} width={430} height={256} rx={14} fill="#0D0F1E" />
      <rect x={484} y={664} width={402} height={228} rx={6} fill="url(#telaTV)" opacity={0.9 * luzTV} />
      <polyline points="510,860 580,780 650,810 740,720 850,690" fill="none" stroke="#fff" strokeWidth={8} opacity={0.5} strokeLinecap="round" />
      <rect x={640} y={906} width={90} height={16} fill="#0D0F1E" />
      <rect x={440} y={922} width={490} height={228} rx={12} fill="#3A2A44" />
      <rect x={440} y={922} width={490} height={16} rx={8} fill="#54405F" />
      <rect x={470} y={960} width={210} height={150} rx={8} fill="#2A1F33" /><rect x={700} y={960} width={200} height={150} rx={8} fill="#2A1F33" />
      <circle cx={680} cy={780} r={420} fill="url(#luzTV)" />
      {/* geladeira */}
      <rect x={960} y={560} width={220} height={590} rx={20} fill="url(#gelad)" />
      <rect x={960} y={780} width={220} height={8} fill="#4A5572" />
      <rect x={980} y={640} width={12} height={110} rx={6} fill="#E8EEF8" /><rect x={980} y={820} width={12} height={130} rx={6} fill="#E8EEF8" />
      <rect x={1010} y={600} width={130} height={14} rx={7} fill="#fff" opacity={0.2} />
      {/* piso e tapete */}
      <rect y={1150} width={L} height={A - 1150} fill="url(#pisoCN)" />
      {Array.from({length: 14}).map((_, i) => <rect key={i} x={0} y={1150 + i * i * 4 + i * 28} width={L} height={3} fill="#000" opacity={0.18} />)}
      <ellipse cx={560} cy={1260} rx={430} ry={80} fill="#4A3170" opacity={0.7} />
      <ellipse cx={560} cy={1260} rx={380} ry={62} fill="none" stroke="#8466B5" strokeWidth={5} opacity={0.5} />
    </g>
  );
};

// ── estrada ao entardecer ───────────────────────────────────────────────────────────────────────────────────────
export const Estrada: React.FC<{c?: Cores}> = ({c}) => {
  const P = pal(c, {ceuA: '#2B1B5A', ceuB: '#C3447A', ceuC: '#FFB067', sol: '#FFE3A1'});
  const R = rng(53);
  const morro = (y0: number, cor: string, amp: number, seed: number) => {
    const Rr = rng(seed);
    let d = `M -20 ${y0 + 200} L -20 ${y0}`;
    for (let x = 0; x <= L + 120; x += 120) d += ` Q ${x + 60} ${y0 - amp * (0.3 + Rr())} ${x + 120} ${y0 - amp * 0.2 * Rr()}`;
    d += ` L ${L + 40} ${y0 + 200} Z`;
    return <path d={d} fill={cor} />;
  };
  return (
    <g>
      <defs>
        <linearGradient id="ceuES" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.ceuA} /><stop offset="0.5" stopColor={P.ceuB} /><stop offset="1" stopColor={P.ceuC} /></linearGradient>
        <radialGradient id="solES" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={P.sol} stopOpacity={0.9} /><stop offset="1" stopColor={P.sol} stopOpacity={0} /></radialGradient>
        <linearGradient id="gramaES" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5A7A4A" /><stop offset="1" stopColor="#22331F" /></linearGradient>
        <linearGradient id="estES" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#555568" /><stop offset="1" stopColor="#25252F" /></linearGradient>
      </defs>
      <rect width={L} height={A} fill="url(#ceuES)" />
      {Array.from({length: 40}).map((_, i) => <circle key={i} cx={R() * L} cy={R() * 420} r={1 + R() * 1.6} fill="#fff" opacity={0.5} />)}
      <circle cx={700} cy={850} r={300} fill="url(#solES)" />
      <circle cx={700} cy={850} r={120} fill={P.sol} />
      <Nuvem x={220} y={560} s={1.4} cor="#FFB6A0" op={0.55} />
      <Nuvem x={880} y={380} s={1} cor="#E58BB2" op={0.5} />
      {morro(930, '#7B4A93', 260, 2)}
      {morro(990, '#53307E', 200, 5)}
      {morro(1040, '#33235E', 120, 8)}
      <rect y={1030} width={L} height={A - 1030} fill="url(#gramaES)" />
      {/* estrada em perspectiva */}
      <polygon points={`500,1030 580,1030 1500,${A} -420,${A}`} fill="url(#estES)" />
      <polygon points={`500,1030 506,1030 -420,${A} -440,${A}`} fill="#F2D04B" opacity={0.7} />
      <polygon points={`574,1030 580,1030 1520,${A} 1500,${A}`} fill="#F2D04B" opacity={0.7} />
      {Array.from({length: 9}).map((_, i) => {
        const t0 = Math.pow(i / 9, 2), t1 = Math.pow((i + 0.45) / 9, 2);
        const y0 = 1030 + t0 * 890, y1 = 1030 + t1 * 890;
        const w0 = 3 + t0 * 22, w1 = 3 + t1 * 22;
        return <polygon key={i} points={`${540 - w0},${y0} ${540 + w0},${y0} ${540 + w1},${y1} ${540 - w1},${y1}`} fill="#fff" opacity={0.85} />;
      })}
      {/* postes e árvores */}
      {[0, 1, 2, 3].map((i) => {
        const t = Math.pow((i + 0.6) / 4.2, 2);
        const y = 1030 + t * 700, esc = 0.25 + t * 1.6, xl = 540 - 40 - t * 520, xr = 540 + 40 + t * 520;
        return (
          <g key={i}>
            <g transform={`translate(${xl} ${y}) scale(${esc})`}><rect x={-5} y={-300} width={10} height={300} fill="#1B1330" /><rect x={-5} y={-300} width={70} height={9} fill="#1B1330" /><ellipse cx={60} cy={-290} rx={20} ry={8} fill="#FFE3A1" /></g>
            <g transform={`translate(${xr} ${y}) scale(${esc})`}><rect x={-6} y={-90} width={12} height={90} fill="#1B1330" /><polygon points="-60,-80 0,-260 60,-80" fill="#1E3A2A" /><polygon points="-48,-150 0,-290 48,-150" fill="#24452F" /></g>
          </g>
        );
      })}
    </g>
  );
};

// ── fundo liso com gradiente ────────────────────────────────────────────────────────────────────────────────────
export const Liso: React.FC<{c?: Cores}> = ({c}) => {
  const P = pal(c, {a: '#1B1F3B', b: '#3A2A5C'});
  return (
    <g>
      <defs>
        <linearGradient id="lisoG" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor={P.a} /><stop offset="1" stopColor={P.b} /></linearGradient>
        <radialGradient id="lisoR" cx="0.5" cy="0.42" r="0.55"><stop offset="0" stopColor="#fff" stopOpacity={0.14} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></radialGradient>
      </defs>
      <rect width={L} height={A} fill="url(#lisoG)" />
      <rect width={L} height={A} fill="url(#lisoR)" />
      <rect y={1130} width={L} height={A - 1130} fill="#000" opacity={0.18} />
      <rect y={1130} width={L} height={4} fill="#fff" opacity={0.16} />
    </g>
  );
};

// ── despacho ────────────────────────────────────────────────────────────────────────────────────────────────────
export const CenarioVetor: React.FC<{cenario?: Cenario; projeto: string}> = ({cenario, projeto}) => {
  const tipo = cenario?.tipo ?? 'liso';
  const c = cenario?.cores;
  if (cenario?.imagem) {
    return <Img src={staticFile(`${projeto}/cenarios/${cenario.imagem}`)} style={{position: 'absolute', left: 0, top: 0, width: L, height: A, objectFit: 'cover'}} />;
  }
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} style={{position: 'absolute', left: 0, top: 0}}>
      {tipo === 'rua' && <Rua c={c} />}
      {tipo === 'escritorio' && <Escritorio c={c} noite={cenario?.noite} />}
      {tipo === 'loja' && <Loja c={c} placa={cenario?.placa} />}
      {tipo === 'cidade-noite' && <CidadeNoite c={c} />}
      {tipo === 'casa-noite' && <CasaNoite c={c} />}
      {tipo === 'estrada' && <Estrada c={c} />}
      {tipo === 'liso' && <Liso c={c} />}
    </svg>
  );
};
